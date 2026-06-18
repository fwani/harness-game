import { useEffect, useRef, useState } from "react";
import {
  STANDARD_FLEET,
  createBattleshipBoard,
  type Ship,
} from "../../domain/battleship";
import type { Side, GameStatus } from "../../application/gameEngine";
import { DEFAULT_BATTLESHIP_SIZE } from "../../application/battleshipEngine";
import type { BattleshipEngineState } from "../../application/battleshipEngine";
import type { BattleshipSetupState } from "../../application/battleshipSetup";
import type { RoomPlayerInfo, ServerMessage } from "../../application/protocol";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import {
  cellView,
  coordLabel,
  fireCellDisabled,
  fleetShipNames,
  nextShipSize,
  placeShipAt,
  placementComplete,
  placementPreview,
  placementStatusLabel,
  shipName,
  toggleOrientation,
  type CellView,
} from "./battleshipView";
import {
  battleshipMatchSeatView,
  battleshipRoomPhase,
  battleshipSetupSeatView,
  type BattleshipSeatInput,
} from "./battleshipMultiView";
import {
  createInMemoryRoomHub,
  type InMemoryRoomHub,
  type RoomClient,
} from "./battleshipRoomClient";
import { battleshipMultiMatchRecord } from "./battleshipMultiRecord";
import { recordGame } from "../records";

const BOARD_SIZE = DEFAULT_BATTLESHIP_SIZE;
const FLEET = STANDARD_FLEET;

/** 좌석별 연결 식별자(불투명·민감정보 아님 — 로컬 2석 시뮬용 고정 라벨). */
const CONN_ID: Record<Side, string> = { p1: "seat-p1", p2: "seat-p2" };

/** 좌석에 마지막으로 전달된 페이로드(전송 비종속 — setupState/gameState에 대응). */
type SeatPayload =
  | { stage: "setup"; setup: BattleshipSetupState }
  | { stage: "match"; state: BattleshipEngineState; status: GameStatus; turn: Side }
  | null;

/** 한 좌석의 화면 상태(수신 페이로드 + 배치 버퍼 + 직전 오류). */
interface SeatUiState {
  payload: SeatPayload;
  /** setup 단계: 아직 제출 전 직접 배치 중인 함선들. */
  placed: Ship[];
  orientation: "h" | "v";
  placementError: string | null;
  /** 직전 거부 사유(error 메시지) — aria-live로 안내. */
  lastError: string | null;
}

function emptySeat(): SeatUiState {
  return { payload: null, placed: [], orientation: "h", placementError: null, lastError: null };
}

/** 한 좌석(p1/p2)을 잇는 RoomClient 묶음 + 방 코드. */
interface Session {
  hub: InMemoryRoomHub;
  clients: Record<Side, RoomClient>;
  roomCode: string;
}

const SIDES: readonly Side[] = ["p1", "p2"];

function seatLabel(side: Side): string {
  return side === "p1" ? "좌석 1 (선)" : "좌석 2";
}

interface BattleshipMultiProps {
  /** 방 허브 생성기 주입(테스트/실 ws #595 접점). 미주입 시 인메모리 허브로 로컬 2석 시뮬. */
  makeHub?: (roomCode: string) => InMemoryRoomHub;
}

/**
 * 배틀십 멀티(방) 화면 — 주입된 RoomClient 포트(send/subscribe)만 소비한다(소켓 비종속).
 * 실제 native ws 바인딩은 #595(needs-human)이고, 기본값은 소켓 없는 인메모리 허브로 두 좌석을
 * 한 화면에서 구동하는 로컬 시뮬이다("현재 좌석"을 바꿔가며 비공개 배치→교대 사격).
 */
export function BattleshipMulti({ makeHub = createInMemoryRoomHub }: BattleshipMultiProps) {
  const [roomCodeInput, setRoomCodeInput] = useState("ROOM-1");
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<RoomPlayerInfo[]>([]);
  const [seats, setSeats] = useState<Record<Side, SeatUiState>>({
    p1: emptySeat(),
    p2: emptySeat(),
  });
  const [activeSeat, setActiveSeat] = useState<Side>("p1");
  const unsubsRef = useRef<Array<() => void>>([]);
  // 매치 단위 1회 기록 가드. 두 좌석(p1·p2)이 같은 over status를 모두 구독하므로 중복 기록을 막는다.
  // 새 매치(배치) 시작·방 입장 시 false로 리셋해 다음 매치도 정확히 1회 기록되게 한다(싱글 recorded 가드 패턴).
  const recordedRef = useRef(false);

  // 구독 해지(언마운트/방 나가기) — 누수 방지.
  useEffect(() => {
    return () => {
      for (const off of unsubsRef.current) off();
      unsubsRef.current = [];
    };
  }, []);

  const applyMessage = (side: Side, m: ServerMessage) => {
    if (m.type === "roomState") {
      setPlayers(m.players);
      return;
    }
    if (m.type === "setupState") {
      // 배치(setup) 단계 진입 = 새 매치 시작(첫 판/재대국) → 다음 매치를 1회 기록할 수 있게 가드를 리셋한다.
      recordedRef.current = false;
      setSeats((s) => ({
        ...s,
        [side]: {
          ...s[side],
          payload: { stage: "setup", setup: m.setup as BattleshipSetupState },
          lastError: null,
        },
      }));
      return;
    }
    if (m.type === "gameState") {
      // 전 함대 격침(status.over)이 되는 순간, 권위 있는 절대 승자를 좌석 무관 WinSide로 환원해
      // 정확히 1회만 전적에 기록한다(두 좌석이 같은 over를 구독해도 recordedRef 가드로 1회).
      const entry = battleshipMultiMatchRecord(m.status, recordedRef.current);
      if (entry !== null) {
        recordedRef.current = true;
        recordGame("battleship", entry.playerA, entry.playerB, entry.win);
      }
      setSeats((s) => ({
        ...s,
        [side]: {
          ...s[side],
          payload: {
            stage: "match",
            state: m.state as BattleshipEngineState,
            status: m.status,
            turn: m.turn,
          },
          // 매치(또는 재대국 setup)로 넘어가면 직전 배치 버퍼/오류를 초기화한다.
          placed: [],
          placementError: null,
          lastError: null,
        },
      }));
      return;
    }
    if (m.type === "error") {
      setSeats((s) => ({ ...s, [side]: { ...s[side], lastError: m.reason } }));
    }
    // gameOver는 status(over)로 이미 화면 반영·전적 기록되므로(gameState 분기) 별도 처리 없음.
  };

  const join = () => {
    const code = roomCodeInput.trim();
    if (code.length === 0 || session !== null) return;
    const hub = makeHub(code);
    const clients: Record<Side, RoomClient> = {
      p1: hub.connect(CONN_ID.p1),
      p2: hub.connect(CONN_ID.p2),
    };
    for (const side of SIDES) {
      unsubsRef.current.push(clients[side].subscribe((m) => applyMessage(side, m)));
    }
    setSession({ hub, clients, roomCode: code });
    setSeats({ p1: emptySeat(), p2: emptySeat() });
    setActiveSeat("p1");
    recordedRef.current = false;
    // 두 좌석을 입장시켜 비공개 배치(setup)를 시작한다.
    for (const side of SIDES) {
      clients[side].send({ type: "joinRoom", roomCode: code });
    }
  };

  const leave = () => {
    if (session !== null) {
      for (const side of SIDES) session.clients[side].send({ type: "leaveRoom" });
    }
    for (const off of unsubsRef.current) off();
    unsubsRef.current = [];
    setSession(null);
    setPlayers([]);
    setSeats({ p1: emptySeat(), p2: emptySeat() });
  };

  if (session === null) {
    return (
      <Lobby
        roomCode={roomCodeInput}
        onRoomCodeChange={setRoomCodeInput}
        onJoin={join}
      />
    );
  }

  const active = seats[activeSeat];
  const activeClient = session.clients[activeSeat];

  // ── 배치(setup) 핸들러 ──────────────────────────────────────────────
  const placingSize = nextShipSize(active.placed, FLEET);
  const complete = placementComplete(active.placed, FLEET);

  const placeAt = (row: number, col: number) => {
    if (placingSize === null) return;
    const { ships, ok } = placeShipAt(
      active.placed,
      active.placed.length,
      placingSize,
      row,
      col,
      active.orientation,
      BOARD_SIZE,
    );
    if (!ok) {
      const name = fleetShipNames(FLEET)[active.placed.length] ?? shipName(placingSize);
      setSeats((s) => ({
        ...s,
        [activeSeat]: {
          ...s[activeSeat],
          placementError: `${coordLabel(row, col)}에 ${name}을(를) 놓을 수 없습니다(겹침 또는 범위 초과).`,
        },
      }));
      return;
    }
    setSeats((s) => ({
      ...s,
      [activeSeat]: { ...s[activeSeat], placed: ships, placementError: null },
    }));
  };

  const setActivePatch = (patch: Partial<SeatUiState>) =>
    setSeats((s) => ({ ...s, [activeSeat]: { ...s[activeSeat], ...patch } }));

  const rotate = () => setActivePatch({ orientation: toggleOrientation(active.orientation) });
  const resetPlacement = () => setActivePatch({ placed: [], placementError: null });

  const submitSetup = () => {
    if (!complete) return;
    activeClient.send({
      type: "submitSetup",
      gameType: "battleship",
      payload: { ships: active.placed },
    });
  };

  const fire = (row: number, col: number) => {
    activeClient.send({ type: "makeMove", gameType: "battleship", move: { row, col } });
  };

  const rematch = () => activeClient.send({ type: "requestRematch" });

  const phase =
    active.payload === null ? null : battleshipRoomPhase(active.payload as BattleshipSeatInput);

  return (
    <div className="bs-multi">
      <RoomHeader
        roomCode={session.roomCode}
        players={players}
        activeSeat={activeSeat}
        onSeat={setActiveSeat}
        onLeave={leave}
      />

      {active.lastError && (
        <p className="error" role="alert">
          입력이 거부되었습니다: {active.lastError}
        </p>
      )}

      {phase === null && (
        <p className="hint" role="status" aria-live="polite">
          좌석에 입장하는 중…
        </p>
      )}

      {phase === "setup" && active.payload?.stage === "setup" && (
        <SetupPhase
          seat={activeSeat}
          setup={active.payload.setup}
          placed={active.placed}
          orientation={active.orientation}
          placingSize={placingSize}
          complete={complete}
          placementError={active.placementError}
          onPlace={placeAt}
          onRotate={rotate}
          onReset={resetPlacement}
          onSubmit={submitSetup}
        />
      )}

      {(phase === "playing" || phase === "over") && active.payload?.stage === "match" && (
        <MatchPhase
          seat={activeSeat}
          input={active.payload}
          onFire={fire}
          onRematch={rematch}
        />
      )}
    </div>
  );
}

/** 로비: 방 코드 입력 → 입장(로컬 2석 시뮬 시작). */
function Lobby({
  roomCode,
  onRoomCodeChange,
  onJoin,
}: {
  roomCode: string;
  onRoomCodeChange: (v: string) => void;
  onJoin: () => void;
}) {
  return (
    <div className="bs-multi-lobby">
      <p className="hint">
        <strong>멀티(방)</strong> 모드입니다. 방 코드로 두 좌석이 같은 방에 입장해 서로의 배치를
        비공개로 두고 교대 사격합니다. 실제 원격 접속(ws)은 준비 중이라, 지금은 한 화면에서 두 좌석을
        번갈아 조작하는 <strong>로컬 2인</strong> 시뮬입니다.
      </p>
      <form
        className="controls"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin();
        }}
      >
        <label htmlFor="bs-room-code">방 코드</label>
        <input
          id="bs-room-code"
          type="text"
          value={roomCode}
          onChange={(e) => onRoomCodeChange(e.target.value)}
          aria-label="방 코드 입력"
        />
        <button type="submit" className="primary" disabled={roomCode.trim().length === 0}>
          방 만들기 / 입장
        </button>
      </form>
    </div>
  );
}

/** 방 머리말: 방 코드·좌석 배정·현재 좌석 토글·나가기. */
function RoomHeader({
  roomCode,
  players,
  activeSeat,
  onSeat,
  onLeave,
}: {
  roomCode: string;
  players: RoomPlayerInfo[];
  activeSeat: Side;
  onSeat: (s: Side) => void;
  onLeave: () => void;
}) {
  const occupied = new Set(players.map((p) => p.side));
  return (
    <>
      <div className="controls">
        <span className="hint">
          방 코드 <strong>{roomCode}</strong>
        </span>
        <button type="button" onClick={onLeave}>
          방 나가기
        </button>
      </div>
      <p className="hint" role="status" aria-live="polite">
        {occupied.size < 2
          ? "상대 좌석이 비어 있습니다. 두 좌석이 모두 차면 배치가 시작됩니다."
          : "양 좌석 입장 완료. 각 좌석에서 함대를 비공개로 배치하세요."}
      </p>
      <div className="controls" role="group" aria-label="현재 조작할 좌석 선택">
        <span className="hint">현재 좌석:</span>
        {SIDES.map((side) => (
          <button
            key={side}
            type="button"
            className={activeSeat === side ? "primary" : ""}
            aria-pressed={activeSeat === side}
            onClick={() => onSeat(side)}
          >
            {seatLabel(side)}
            {occupied.has(side) ? " ✓" : ""}
          </button>
        ))}
      </div>
    </>
  );
}

/** 한 보드(읽기 전용/사격)를 그린다. 사격 가능하면 onFire를 잇고 locked로 비활성. */
function SeatBoard({
  cells,
  title,
  onFire,
  locked,
}: {
  cells: CellView[][];
  title: string;
  onFire?: (row: number, col: number) => void;
  locked: boolean;
}) {
  const interactive = onFire !== undefined;
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    BOARD_SIZE,
    BOARD_SIZE,
  );
  return (
    <div className="bs-board-wrap">
      <h3>{title}</h3>
      <div
        className="board battleship"
        role="grid"
        aria-label={interactive ? `${title} (방향 키로 칸 이동, Enter/Space로 사격)` : title}
        style={boardGridStyle(BOARD_SIZE)}
        onKeyDown={interactive ? onKeyDown : undefined}
      >
        {cells.map((row, r) =>
          row.map((view, c) => {
            if (interactive) {
              const disabled = fireCellDisabled(locked, view.fired);
              return (
                <button
                  key={`${r},${c}`}
                  ref={setCellRef(c, r)}
                  type="button"
                  role="gridcell"
                  className={`cell bs-cell bs-${view.state}`}
                  tabIndex={tabIndexFor(c, r)}
                  onClick={() => {
                    focusOn(c, r);
                    if (!disabled) onFire?.(r, c);
                  }}
                  aria-disabled={disabled}
                  aria-label={view.label}
                >
                  {view.glyph}
                </button>
              );
            }
            return (
              <div
                key={`${r},${c}`}
                role="gridcell"
                className={`cell bs-cell bs-${view.state}`}
                aria-label={view.label}
              >
                {view.glyph}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/** 비공개 배치(setup) 단계: 내 함대를 직접 배치해 제출하고, 상대 제출 여부만 본다. */
function SetupPhase({
  seat,
  setup,
  placed,
  orientation,
  placingSize,
  complete,
  placementError,
  onPlace,
  onRotate,
  onReset,
  onSubmit,
}: {
  seat: Side;
  setup: BattleshipSetupState;
  placed: Ship[];
  orientation: "h" | "v";
  placingSize: number | null;
  complete: boolean;
  placementError: string | null;
  onPlace: (row: number, col: number) => void;
  onRotate: () => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  const view = battleshipSetupSeatView(setup, seat);
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    BOARD_SIZE,
    BOARD_SIZE,
  );
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const board = createBattleshipBoard(BOARD_SIZE, placed);
  const preview =
    hover && placingSize !== null
      ? placementPreview(
          placed,
          placed.length,
          placingSize,
          hover.row,
          hover.col,
          orientation,
          BOARD_SIZE,
        )
      : null;
  const previewKeys = new Set(preview?.cells.map(([r, c]) => `${r},${c}`));

  return (
    <>
      <p className="hint">
        <strong>{seatLabel(seat)}</strong> 함대를 비공개로 배치하세요. 칸을 클릭(또는 Enter/Space)하면
        그 칸을 시작점으로 함선이 놓입니다. <strong>R</strong> 또는 "회전"으로 방향을 바꿉니다. 제출 뒤에는
        상대의 배치 완료만 보이고 위치는 보이지 않습니다.
      </p>

      <div className="controls">
        <span className="hint">방향: {orientation === "h" ? "가로 ↔" : "세로 ↕"}</span>
        <button type="button" onClick={onRotate} disabled={view.mySubmitted}>
          회전 (R)
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={view.mySubmitted || placed.length === 0}
        >
          초기화
        </button>
        <button
          type="button"
          className="primary"
          onClick={onSubmit}
          disabled={!complete || view.mySubmitted}
        >
          이 배치로 제출
        </button>
      </div>

      <p className={view.waitingForOpponent || view.mySubmitted ? "outcome" : "hint"} role="status" aria-live="polite">
        {view.statusLabel}
      </p>
      <p className="hint">
        내 제출 {view.mySubmitted ? "완료 ✓" : "전 ✗"} · 상대 제출{" "}
        {view.opponentSubmitted ? "완료 ✓" : "전 ✗"}
      </p>
      {!view.mySubmitted && (
        <p className="hint">{placementStatusLabel(placed, FLEET)}</p>
      )}
      {placementError && (
        <p className="error" role="alert">
          {placementError}
        </p>
      )}

      <div className="bs-boards">
        <div className="bs-board-wrap">
          <h3>내 함대 — 클릭해 배치</h3>
          <div
            className="board battleship"
            role="grid"
            aria-label="내 함대 배치 보드 (방향 키로 칸 이동, Enter/Space로 배치)"
            style={boardGridStyle(BOARD_SIZE)}
            onMouseLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
          >
            {board.map((rowCells, r) =>
              rowCells.map((cell, c) => {
                const cv = cellView(cell, r, c, { revealShips: true, sunk: false });
                const isPreview = previewKeys.has(`${r},${c}`);
                const previewClass = isPreview
                  ? preview!.valid
                    ? " bs-preview-ok"
                    : " bs-preview-bad"
                  : "";
                const previewLabel = isPreview
                  ? preview!.valid
                    ? " · 배치 미리보기(가능)"
                    : " · 배치 미리보기(불가)"
                  : "";
                const locked = view.mySubmitted;
                return (
                  <button
                    key={`${r},${c}`}
                    ref={setCellRef(c, r)}
                    type="button"
                    role="gridcell"
                    className={`cell bs-cell bs-${cv.state}${previewClass}`}
                    tabIndex={tabIndexFor(c, r)}
                    onClick={() => {
                      focusOn(c, r);
                      if (!locked) onPlace(r, c);
                    }}
                    onMouseEnter={() => setHover({ row: r, col: c })}
                    onFocus={() => {
                      focusOn(c, r);
                      setHover({ row: r, col: c });
                    }}
                    aria-disabled={locked}
                    aria-label={`${cv.label}${previewLabel}`}
                  >
                    {cv.glyph}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** 사격(match) 단계: 내 함대 + 상대 안개 보드. 내 차례에만 상대 보드를 사격한다. */
function MatchPhase({
  seat,
  input,
  onFire,
  onRematch,
}: {
  seat: Side;
  input: { stage: "match"; state: BattleshipEngineState; status: GameStatus; turn: Side };
  onFire: (row: number, col: number) => void;
  onRematch: () => void;
}) {
  const view = battleshipMatchSeatView(input.state, seat, input.status);
  return (
    <>
      <p className="hint">
        <strong>{seatLabel(seat)}</strong> 시점입니다. 내 차례에만 상대 보드의 칸을 클릭(또는 Enter/Space)해
        사격합니다. 상대 함선 위치는 안개로 가려져 있고, 명중(✕)·빗나감(○)을 기호로 표시합니다.
      </p>

      <p className={view.over ? "outcome" : "hint"} role="status" aria-live="polite">
        {view.statusLabel} {!view.over && `— ${view.turnLabel}`}
      </p>

      <div className="bs-boards">
        <SeatBoard
          cells={view.opponentBoardCells}
          title="상대 함대 — 내 차례에 클릭해 사격"
          onFire={onFire}
          locked={!view.isMyTurn}
        />
        <SeatBoard cells={view.myBoardCells} title="내 함대" locked />
      </div>

      {view.over && (
        <div className="controls">
          <button type="button" className="primary" onClick={onRematch}>
            재대국
          </button>
        </div>
      )}
    </>
  );
}
