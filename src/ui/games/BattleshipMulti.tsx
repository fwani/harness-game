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
import type { RoomPlayerInfo, RoomSummary, ServerMessage } from "../../application/protocol";
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
  battleshipMultiRecordAction,
  battleshipRoomPhase,
  battleshipSetupSeatView,
  type BattleshipSeatInput,
} from "./battleshipMultiView";
import {
  createInMemoryRoomHub,
  type InMemoryRoomHub,
  type RoomClient,
} from "./battleshipRoomClient";
import { createWsRoomConnection } from "./wsRoomClient";
import { recordGame } from "../records";
import { SELF_PLAYER } from "./streakView";

const BOARD_SIZE = DEFAULT_BATTLESHIP_SIZE;
const FLEET = STANDARD_FLEET;

/**
 * 멀티 전적 저장 시 상대(p2) 좌석에 쓰는 안정적 표시 이름.
 * p1은 싱글과 동일 유저 개념을 유지하려고 SELF_PLAYER("나")를 쓰고(전적이 싱글과 통합되어 보인다),
 * p2는 로컬 2석 시뮬의 상대 좌석을 가리키는 고정 라벨이다(저장 키 안정값 — #535 표시 이름 매핑 관례).
 */
const OPPONENT_PLAYER = "상대(P2)";

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

/** 전송 방식: 로컬 인메모리 2석 시뮬 vs 실제 ws 서버 원격 접속(다른 탭/브라우저). */
type Transport = "local" | "online";

/**
 * 진행 중 세션.
 * - local: 한 화면에서 두 좌석(p1/p2)을 인메모리 허브로 구동(서버 불필요).
 * - online: 실제 ws 서버에 이 탭이 한 좌석으로 접속. ownSide는 서버 `seated`로 정해진다.
 */
type Session =
  | { transport: "local"; hub: InMemoryRoomHub; clients: Record<Side, RoomClient>; roomCode: string }
  | { transport: "online"; client: RoomClient; close: () => void; roomCode: string };

const SIDES: readonly Side[] = ["p1", "p2"];

/** 기본 ws 서버 URL(현재 호스트의 8787 포트). 브라우저 밖이면 localhost. `npm run serve:multi`. */
function defaultWsUrl(): string {
  const host =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "localhost";
  return `ws://${host}:8787`;
}

function seatLabel(side: Side): string {
  return side === "p1" ? "좌석 1 (선)" : "좌석 2";
}

interface BattleshipMultiProps {
  /** 방 허브 생성기 주입(테스트). 미주입 시 인메모리 허브로 로컬 2석 시뮬. */
  makeHub?: (roomCode: string) => InMemoryRoomHub;
  /** 온라인 ws 연결 생성기(테스트 주입용). 기본은 브라우저 WebSocket로 실제 ws 서버에 접속. */
  connectOnline?: (url: string) => { client: RoomClient; close: () => void };
}

/**
 * 배틀십 멀티(방) 화면 — 주입된 RoomClient 포트(send/subscribe)만 소비한다(소켓 비종속).
 * 두 가지 전송:
 * - **로컬 2인**(기본·서버 불필요): 인메모리 허브로 한 화면에서 두 좌석을 번갈아 조작.
 * - **온라인**: 실제 ws 서버(`npm run serve:multi`)에 이 탭이 한 좌석으로 접속 → 다른 탭/브라우저가
 *   같은 방 코드로 들어오면 실시간 동기화. 내 좌석(side)은 서버 `seated`로 정해진다.
 */
export function BattleshipMulti({
  makeHub = createInMemoryRoomHub,
  connectOnline = (url) => createWsRoomConnection(url),
}: BattleshipMultiProps) {
  const [transport, setTransport] = useState<Transport>("local");
  const [roomCodeInput, setRoomCodeInput] = useState("ROOM-1");
  const [wsUrl, setWsUrl] = useState(defaultWsUrl());
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<RoomPlayerInfo[]>([]);
  const [seats, setSeats] = useState<Record<Side, SeatUiState>>({
    p1: emptySeat(),
    p2: emptySeat(),
  });
  const [activeSeat, setActiveSeat] = useState<Side>("p1");
  // 온라인: 서버가 배정한 내 좌석(seated 수신 전 null). ref는 subscribe 콜백에서 최신값 읽기용.
  const [ownSide, setOwnSide] = useState<Side | null>(null);
  const ownSideRef = useRef<Side | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  // 온라인 로비: 지속 연결(방 입장 전후로 유지) + 방 목록 + 연결 상태.
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected",
  );
  const onlineRef = useRef<{ client: RoomClient; close: () => void; off: () => void } | null>(null);
  // 이번 매치 결과를 이미 기록했는지(중복 방지 가드). 재대국·미종료 단계에서 자동 리셋된다.
  const recordedRef = useRef(false);

  // 구독 해지·소켓 닫기(언마운트) — 누수 방지.
  useEffect(() => {
    return () => {
      for (const off of unsubsRef.current) off();
      unsubsRef.current = [];
      onlineRef.current?.off();
      onlineRef.current?.close();
      onlineRef.current = null;
    };
  }, []);

  // 매치 종료를 권위 있는 서버 status(좌석 무관 절대 승자)로 감지해 전적을 정확히 1회 기록한다.
  // 인메모리 허브에서는 두 좌석이 같은 over 상태를 모두 구독하므로 recordedRef 가드가 필수다
  // (싱글 Battleship.tsx의 recorded.current 패턴). p1=SELF_PLAYER로 싱글/멀티 전적을 통합한다.
  useEffect(() => {
    const p1Payload = seats.p1.payload;
    const p2Payload = seats.p2.payload;
    const matchStatus =
      p1Payload?.stage === "match"
        ? p1Payload.status
        : p2Payload?.stage === "match"
          ? p2Payload.status
          : null;
    const action = battleshipMultiRecordAction(matchStatus, recordedRef.current);
    if (action.kind === "reset") {
      recordedRef.current = false;
    } else if (action.kind === "record") {
      recordedRef.current = true;
      recordGame("battleship", SELF_PLAYER, OPPONENT_PLAYER, action.win);
    }
  }, [seats]);

  const applyMessage = (side: Side, m: ServerMessage) => {
    if (m.type === "roomState") {
      setPlayers(m.players);
      return;
    }
    if (m.type === "setupState") {
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
    // gameOver는 status(over)로 이미 화면에 반영되므로 별도 처리 없음.
    // 전적 기록은 권위 있는 status(over)를 감지하는 위 useEffect가 매치당 1회 담당한다.
  };

  /** 로컬 2석 시뮬 입장(서버 불필요). */
  const joinLocal = () => {
    const code = roomCodeInput.trim();
    if (code.length === 0 || session !== null) return;
    setSeats({ p1: emptySeat(), p2: emptySeat() });
    ownSideRef.current = null;
    setOwnSide(null);
    const hub = makeHub(code);
    const clients: Record<Side, RoomClient> = {
      p1: hub.connect(CONN_ID.p1),
      p2: hub.connect(CONN_ID.p2),
    };
    for (const side of SIDES) {
      unsubsRef.current.push(clients[side].subscribe((m) => applyMessage(side, m)));
    }
    setActiveSeat("p1");
    setSession({ transport: "local", hub, clients, roomCode: code });
    for (const side of SIDES) {
      clients[side].send({ type: "joinRoom", roomCode: code });
    }
  };

  /** 온라인 로비 연결을 연다(지속 연결: 방 입장 전후로 유지). 방 목록을 요청한다. */
  const connectLobby = () => {
    if (onlineRef.current !== null) {
      onlineRef.current.client.send({ type: "listRooms" }); // 이미 연결됨 → 새로고침
      return;
    }
    setOnlineStatus("connecting");
    setRooms([]);
    const { client, close } = connectOnline(wsUrl);
    const off = client.subscribe((m) => {
      if (m.type === "roomList") {
        setRooms(m.rooms);
        setOnlineStatus("connected");
        return;
      }
      if (m.type === "seated") {
        ownSideRef.current = m.side;
        setOwnSide(m.side);
        setActiveSeat(m.side);
        return;
      }
      // 방 안 메시지(서버가 이미 side별로 가려 보냄). seated 전이면 p1로 임시 라우팅.
      applyMessage(ownSideRef.current ?? "p1", m);
    });
    onlineRef.current = { client, close, off };
    client.send({ type: "listRooms" });
  };

  /** 온라인: 지속 연결로 방에 입장(목록 클릭 또는 새 방 코드). */
  const joinOnline = (rawCode: string) => {
    const code = rawCode.trim();
    const conn = onlineRef.current;
    if (conn === null || code.length === 0 || session !== null) return;
    setSeats({ p1: emptySeat(), p2: emptySeat() });
    ownSideRef.current = null;
    setOwnSide(null);
    setSession({ transport: "online", client: conn.client, close: conn.close, roomCode: code });
    conn.client.send({ type: "joinRoom", roomCode: code });
  };

  /** 온라인 연결을 완전히 끊는다(전송 전환/언마운트). */
  const disconnectOnline = () => {
    onlineRef.current?.off();
    onlineRef.current?.close();
    onlineRef.current = null;
    setRooms([]);
    setOnlineStatus("disconnected");
  };

  /** 전송 방식 전환: 온라인→다른 방식이면 연결을 정리한다. */
  const handleTransportChange = (t: Transport) => {
    if (t !== "online") disconnectOnline();
    setTransport(t);
  };

  const leave = () => {
    if (session !== null && session.transport === "local") {
      for (const side of SIDES) session.clients[side].send({ type: "leaveRoom" });
      for (const off of unsubsRef.current) off();
      unsubsRef.current = [];
    } else if (session !== null && session.transport === "online") {
      // 온라인: 방만 나가고 연결은 유지해 로비(방 목록)로 돌아간다.
      session.client.send({ type: "leaveRoom" });
      onlineRef.current?.client.send({ type: "listRooms" });
    }
    setSession(null);
    setPlayers([]);
    setSeats({ p1: emptySeat(), p2: emptySeat() });
    setOwnSide(null);
    ownSideRef.current = null;
  };

  if (session === null) {
    return (
      <Lobby
        transport={transport}
        onTransportChange={handleTransportChange}
        roomCode={roomCodeInput}
        onRoomCodeChange={setRoomCodeInput}
        onJoinLocal={joinLocal}
        wsUrl={wsUrl}
        onWsUrlChange={setWsUrl}
        onlineStatus={onlineStatus}
        rooms={rooms}
        onConnect={connectLobby}
        onRefresh={connectLobby}
        onJoinRoom={joinOnline}
      />
    );
  }

  const active = seats[activeSeat];
  const activeClient = session.transport === "local" ? session.clients[activeSeat] : session.client;

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
        transport={session.transport}
        ownSide={ownSide}
      />

      {active.lastError && (
        <p className="error" role="alert">
          입력이 거부되었습니다: {active.lastError}
        </p>
      )}

      {session.transport === "online" && ownSide === null ? (
        <p className="hint" role="status" aria-live="polite">
          서버에 접속해 좌석 배정을 기다리는 중… (서버가 떠 있어야 합니다: <code>npm run serve:multi</code>)
        </p>
      ) : (
        phase === null && (
          <p className="hint" role="status" aria-live="polite">
            좌석에 입장하는 중…
          </p>
        )
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

/** 로비: 전송 방식(로컬/온라인) 선택 + 로컬 입장 폼 또는 온라인 방 목록. */
function Lobby({
  transport,
  onTransportChange,
  roomCode,
  onRoomCodeChange,
  onJoinLocal,
  wsUrl,
  onWsUrlChange,
  onlineStatus,
  rooms,
  onConnect,
  onRefresh,
  onJoinRoom,
}: {
  transport: Transport;
  onTransportChange: (t: Transport) => void;
  roomCode: string;
  onRoomCodeChange: (v: string) => void;
  onJoinLocal: () => void;
  wsUrl: string;
  onWsUrlChange: (v: string) => void;
  onlineStatus: "disconnected" | "connecting" | "connected";
  rooms: RoomSummary[];
  onConnect: () => void;
  onRefresh: () => void;
  onJoinRoom: (code: string) => void;
}) {
  const TRANSPORTS: ReadonlyArray<{ value: Transport; label: string }> = [
    { value: "local", label: "로컬 2인 (서버 불필요)" },
    { value: "online", label: "온라인 (다른 탭/브라우저)" },
  ];
  return (
    <div className="bs-multi-lobby">
      <div className="controls" role="group" aria-label="전송 방식 선택">
        <span className="hint">접속 방식:</span>
        {TRANSPORTS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={transport === t.value ? "primary" : ""}
            aria-pressed={transport === t.value}
            onClick={() => onTransportChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {transport === "local" ? (
        <>
          <p className="hint">
            <strong>로컬 2인</strong>: 한 화면에서 두 좌석을 번갈아 조작하는 시뮬입니다(서버 불필요).
          </p>
          <form
            className="controls"
            onSubmit={(e) => {
              e.preventDefault();
              onJoinLocal();
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
        </>
      ) : (
        <OnlineLobby
          roomCode={roomCode}
          onRoomCodeChange={onRoomCodeChange}
          wsUrl={wsUrl}
          onWsUrlChange={onWsUrlChange}
          onlineStatus={onlineStatus}
          rooms={rooms}
          onConnect={onConnect}
          onRefresh={onRefresh}
          onJoinRoom={onJoinRoom}
        />
      )}
    </div>
  );
}

/** 온라인 로비: 서버 연결 + 열린 방 목록(실시간 갱신) + 방 만들기/입장. */
function OnlineLobby({
  roomCode,
  onRoomCodeChange,
  wsUrl,
  onWsUrlChange,
  onlineStatus,
  rooms,
  onConnect,
  onRefresh,
  onJoinRoom,
}: {
  roomCode: string;
  onRoomCodeChange: (v: string) => void;
  wsUrl: string;
  onWsUrlChange: (v: string) => void;
  onlineStatus: "disconnected" | "connecting" | "connected";
  rooms: RoomSummary[];
  onConnect: () => void;
  onRefresh: () => void;
  onJoinRoom: (code: string) => void;
}) {
  const connected = onlineStatus === "connected";
  const phaseLabel: Record<RoomSummary["phase"], string> = {
    waiting: "대기 중",
    setup: "배치 중",
    playing: "진행 중",
  };
  return (
    <>
      <p className="hint">
        <strong>온라인</strong>: 서버에 연결해 열린 방 목록에서 입장하거나 새 방을 만듭니다.{" "}
        <strong>다른 탭/브라우저</strong>에서 같은 방에 들어오면 실시간으로 맞붙습니다. 먼저 서버를
        켜야 합니다: <code>npm run serve:multi</code>.
      </p>

      <div className="controls">
        <label htmlFor="bs-ws-url">서버 주소</label>
        <input
          id="bs-ws-url"
          type="text"
          value={wsUrl}
          onChange={(e) => onWsUrlChange(e.target.value)}
          aria-label="ws 서버 주소"
          disabled={connected}
        />
        <button type="button" className={connected ? "" : "primary"} onClick={onConnect}>
          {connected ? "목록 새로고침" : onlineStatus === "connecting" ? "연결 중…" : "서버 연결"}
        </button>
      </div>

      <p className="hint" role="status" aria-live="polite">
        {onlineStatus === "disconnected" && "서버에 연결하면 방 목록이 표시됩니다."}
        {onlineStatus === "connecting" && "서버에 연결하는 중…"}
        {connected && `연결됨 · 열린 방 ${rooms.length}개`}
      </p>

      {connected && (
        <>
          <ul className="bs-room-list" aria-label="열린 방 목록">
            {rooms.length === 0 && (
              <li className="hint">열린 방이 없습니다. 아래에서 새 방을 만드세요.</li>
            )}
            {rooms.map((r) => {
              const full = r.players >= 2;
              return (
                <li key={r.code} className="bs-room-row">
                  <span>
                    <strong>{r.code}</strong> · {r.players}/2명 · {phaseLabel[r.phase]}
                  </span>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onJoinRoom(r.code)}
                    disabled={full}
                    aria-label={`방 ${r.code} 입장${full ? " (가득 참)" : ""}`}
                  >
                    {full ? "가득 참" : "입장"}
                  </button>
                </li>
              );
            })}
          </ul>

          <form
            className="controls"
            onSubmit={(e) => {
              e.preventDefault();
              onJoinRoom(roomCode);
            }}
          >
            <label htmlFor="bs-room-code">새 방 코드</label>
            <input
              id="bs-room-code"
              type="text"
              value={roomCode}
              onChange={(e) => onRoomCodeChange(e.target.value)}
              aria-label="새 방 코드 입력"
            />
            <button type="submit" className="primary" disabled={roomCode.trim().length === 0}>
              방 만들기 / 입장
            </button>
            <button type="button" onClick={onRefresh}>
              새로고침
            </button>
          </form>
        </>
      )}
    </>
  );
}

/** 방 머리말: 방 코드·좌석 배정·현재 좌석 토글·나가기. 온라인은 내 좌석만 조작(토글 잠금). */
function RoomHeader({
  roomCode,
  players,
  activeSeat,
  onSeat,
  onLeave,
  transport,
  ownSide,
}: {
  roomCode: string;
  players: RoomPlayerInfo[];
  activeSeat: Side;
  onSeat: (s: Side) => void;
  onLeave: () => void;
  transport: Transport;
  ownSide: Side | null;
}) {
  const occupied = new Set(players.map((p) => p.side));
  const online = transport === "online";
  return (
    <>
      <div className="controls">
        <span className="hint">
          방 코드 <strong>{roomCode}</strong>
          {online && ownSide !== null ? ` · 내 좌석: ${seatLabel(ownSide)}` : ""}
        </span>
        <button type="button" onClick={onLeave}>
          방 나가기
        </button>
      </div>
      <p className="hint" role="status" aria-live="polite">
        {occupied.size < 2
          ? online
            ? "상대 좌석이 비어 있습니다. 다른 탭/브라우저에서 같은 방 코드로 접속하세요."
            : "상대 좌석이 비어 있습니다. 두 좌석이 모두 차면 배치가 시작됩니다."
          : "양 좌석 입장 완료. 함대를 비공개로 배치하세요."}
      </p>
      {/* 온라인은 내 좌석만 조작하므로 좌석 토글을 노출하지 않는다(로컬만 토글). */}
      {!online && (
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
      )}
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
