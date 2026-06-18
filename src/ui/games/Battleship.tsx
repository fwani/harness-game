import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  STANDARD_FLEET,
  createBattleshipBoard,
  type BattleshipBoard,
  type Ship,
} from "../../domain/battleship";
import { placeFleetRandomly } from "../../application/playBattleship";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe, type WinSide } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import {
  battleshipStatusLabel,
  cellView,
  coordLabel,
  type CpuDifficulty,
  difficultyLabel,
  fireCellDisabled,
  fleetShipNames,
  isCellSunk,
  nextShipSize,
  placeShipAt,
  placementComplete,
  placementPreview,
  placementStatusLabel,
  playCpuTurn,
  playHumanTurn,
  remainingShips,
  shipName,
  shotSummary,
  toggleOrientation,
} from "./battleshipView";

// 사람 사격 후 CPU 반격을 이만큼 지연해 "CPU 차례/생각 중"을 화면에 드러낸다(즉시 점프 금지).
const CPU_THINK_MS = 650;

// 표준 10×10 격자에 표준 함대(5·4·3·3·2)를 배치한다(한 곳에서 바꾼다).
const BOARD_SIZE = 10;
const FLEET = STANDARD_FLEET;

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

/** CPU 함대만 무작위 배치한 새 보드를 만든다(사람 함대는 수동 배치 결과를 받는다). */
function freshCpuBoard(): BattleshipBoard {
  return createBattleshipBoard(BOARD_SIZE, placeFleetRandomly(BOARD_SIZE, FLEET, rng));
}

interface ViewState {
  /** 배치 단계(내 함대 직접 배치) → 사격 단계(vs CPU). */
  phase: "placement" | "firing";
  /** 배치 단계: 지금까지 배치한 내 함선들. */
  placed: Ship[];
  /** 배치 단계: 현재 배치 방향(수평/수직). */
  orientation: "h" | "v";
  /** 배치 단계: 직전 잘못된 배치 사유(겹침/범위). */
  placementError: string | null;
  /** CPU 사격 난이도(쉬움=무작위·어려움=추적). 새 게임에도 유지된다. */
  difficulty: CpuDifficulty;
  /** 사격 단계: 사람 함대 보드. */
  humanBoard: BattleshipBoard;
  /** 사격 단계: CPU 함대 보드. */
  cpuBoard: BattleshipBoard;
  /** 사람 사격 직후 CPU 반격을 기다리는 중(CPU 차례를 화면에 드러내는 상태). */
  cpuThinking: boolean;
  outcome: WinSide | null;
  /** 직전 라운드의 사격 요약(사람→CPU). 종료 후에도 남겨 마무리 피드백을 제공한다. */
  messages: string[];
}

function initialState(difficulty: CpuDifficulty = "easy"): ViewState {
  const empty = createBattleshipBoard(BOARD_SIZE, []);
  return {
    phase: "placement",
    placed: [],
    orientation: "h",
    placementError: null,
    difficulty,
    humanBoard: empty,
    cpuBoard: empty,
    cpuThinking: false,
    outcome: null,
    messages: [],
  };
}

/** 한 보드를 그린다(사격 단계용). revealShips=true면 자기 함선(안 맞은 칸)을 ■로 노출한다. */
function BoardGrid({
  board,
  title,
  revealShips,
  onFire,
  locked,
}: {
  board: BattleshipBoard;
  title: string;
  revealShips: boolean;
  onFire?: (row: number, col: number) => void;
  /** 사격 비활성(게임 종료 또는 CPU 차례 진행 중) — 이미 쏜 칸과 함께 클릭을 막는다. */
  locked: boolean;
}) {
  const interactive = onFire !== undefined;
  // 격자 키보드 내비게이션(방향키 이동 + 로빙 탭인덱스). 좌표계는 boardView와 동일하게
  // x=열(c), y=행(r). 비대화형('내 함대' 표시 보드)에서는 와이어링하지 않는다(훅은 규칙상
  // 항상 호출). Enter/Space 착수는 버튼 기본 동작이 처리한다.
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
        aria-label={
          interactive ? `${title} (방향 키로 칸 이동, Enter/Space로 사격)` : title
        }
        style={boardGridStyle(BOARD_SIZE)}
        onKeyDown={interactive ? onKeyDown : undefined}
      >
        {board.map((rowCells, r) =>
          rowCells.map((cell, c) => {
            const view = cellView(cell, r, c, {
              revealShips,
              sunk: isCellSunk(board, cell),
            });
            if (interactive) {
              // 네이티브 disabled 대신 aria-disabled로 비활성 표시(#227): 키보드 포커스로
              // 건너갈 수 있고 .cell[aria-disabled] cursor:default 예외를 받아 잘못된 클릭
              // 어포던스가 사라진다. disabled면 onClick은 무시한다.
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

export function Battleship() {
  const [state, setState] = useState<ViewState>(initialState);
  // 배치 단계 미리보기용(어느 칸 위에 있는지). 게임 상태가 아니라 일시적 UI 상태.
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "battleship");
  // 한 판당 전적 1회만 기록하기 위한 가드(사람/CPU 어느 수로 끝나든 동일 경로).
  const recorded = useRef(false);

  // 배치 단계에서 R 키로 방향을 회전한다(키보드 접근성).
  useEffect(() => {
    if (state.phase !== "placement") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setState((s) =>
          s.phase === "placement"
            ? { ...s, orientation: toggleOrientation(s.orientation) }
            : s,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase]);

  const finished = state.outcome !== null;

  // ── 배치 단계 핸들러 ──────────────────────────────────────────────
  const placingSize = nextShipSize(state.placed, FLEET);
  const complete = placementComplete(state.placed, FLEET);

  const placeAt = (row: number, col: number) => {
    if (placingSize === null) return; // 모두 배치됨.
    const { ships, ok } = placeShipAt(
      state.placed,
      state.placed.length,
      placingSize,
      row,
      col,
      state.orientation,
      BOARD_SIZE,
    );
    if (!ok) {
      // 같은 길이 2척(순양함·잠수함)을 배치 순서로 구분해 사유를 안내한다.
      const name = fleetShipNames(FLEET)[state.placed.length] ?? shipName(placingSize);
      setState((s) => ({
        ...s,
        placementError: `${coordLabel(row, col)}에 ${name}을(를) 놓을 수 없습니다(겹침 또는 범위 초과).`,
      }));
      return;
    }
    setState((s) => ({ ...s, placed: ships, placementError: null }));
  };

  const rotate = () =>
    setState((s) => ({ ...s, orientation: toggleOrientation(s.orientation) }));

  const randomPlace = () =>
    setState((s) => ({
      ...s,
      placed: placeFleetRandomly(BOARD_SIZE, FLEET, rng),
      placementError: null,
    }));

  const resetPlacement = () =>
    setState((s) => ({ ...s, placed: [], placementError: null }));

  const startFiring = () => {
    if (!complete) return;
    recorded.current = false;
    setState((s) => ({
      ...s,
      phase: "firing",
      humanBoard: createBattleshipBoard(BOARD_SIZE, s.placed),
      cpuBoard: freshCpuBoard(),
      cpuThinking: false,
      outcome: null,
      messages: [],
    }));
  };

  // ── 사격 단계 핸들러 ──────────────────────────────────────────────
  // 사람 사격 1발만 즉시 반영하고(결과 표시), 미종료면 cpuThinking을 켜 CPU 차례를 화면에
  // 드러낸다. 실제 CPU 반격은 아래 effect가 짧은 지연 뒤 진행한다(즉시 점프 금지).
  const fire = (row: number, col: number) => {
    if (finished || state.cpuThinking) return; // 종료/CPU 차례 중 입력 차단.
    if (state.cpuBoard[row]![col]!.hit) return; // 이미 쏜 칸(버튼은 비활성이나 방어적).

    const human = playHumanTurn(state.cpuBoard, row, col);
    const messages = [shotSummary("사람", human.humanShot, human.cpuBoard)];

    setState((s) => ({
      ...s,
      cpuBoard: human.cpuBoard,
      // 사람 사격으로 전 함대 격침이면 CPU는 쏘지 않고 즉시 종료(사람 승).
      outcome: human.outcome,
      cpuThinking: human.outcome === null,
      messages,
    }));
  };

  // CPU 차례: 사람 사격 직후 짧은 지연을 두고 CPU가 한 발 되쏜다. 지연 동안 상태줄에
  // "CPU 차례: 생각 중…"이 보이고, 그 뒤 CPU 사격 결과가 드러난다(단계적 진행).
  useEffect(() => {
    if (!state.cpuThinking) return;
    const timer = setTimeout(() => {
      const cpu = playCpuTurn(state.humanBoard, rng, state.difficulty);
      const extra = cpu.cpuShot
        ? [shotSummary("CPU", cpu.cpuShot.result, cpu.humanBoard)]
        : [];
      setState((s) => ({
        ...s,
        humanBoard: cpu.humanBoard,
        outcome: cpu.outcome,
        cpuThinking: false,
        messages: [...s.messages, ...extra],
      }));
    }, CPU_THINK_MS);
    return () => clearTimeout(timer);
  }, [state.cpuThinking, state.humanBoard, state.difficulty]);

  // 종료로 전환되면(사람/CPU 어느 수로든) 결과를 전적에 1회만 기록한다(사람=a/CPU=b, 무승부 없음).
  useEffect(() => {
    if (state.outcome === null || recorded.current) return;
    recorded.current = true;
    recordGame("battleship", SELF_PLAYER, "CPU", state.outcome);
  }, [state.outcome]);

  const newGame = () => {
    setHover(null);
    recorded.current = false;
    setState((s) => initialState(s.difficulty));
  };

  const setDifficulty = (difficulty: CpuDifficulty) =>
    setState((s) => ({ ...s, difficulty }));

  return (
    <section className="game">
      <h2>배틀십 (vs CPU)</h2>

      {state.phase === "placement" ? (
        <PlacementPhase
          state={state}
          hover={hover}
          setHover={setHover}
          placingSize={placingSize}
          complete={complete}
          onPlace={placeAt}
          onRotate={rotate}
          onRandom={randomPlace}
          onReset={resetPlacement}
          onStart={startFiring}
          onDifficulty={setDifficulty}
        />
      ) : (
        <>
          <p className="hint">
            <strong>적 함대(CPU)</strong> 보드의 칸을 클릭(또는 Enter/Space)해 사격하세요.
            명중(✕)·빗나감(○)·격침(💥)을 기호로 표시합니다. 한 발씩 번갈아 쏘며(명중해도 한 발),
            상대 함대를 먼저 전멸시키면 승리입니다.
          </p>

          <div className="controls">
            <span className="hint">
              CPU 난이도 <strong>{difficultyLabel(state.difficulty)}</strong> · 남은 적 함선{" "}
              <strong>{remainingShips(state.cpuBoard)}</strong> · 남은 내 함선{" "}
              <strong>{remainingShips(state.humanBoard)}</strong>
            </span>
            <button type="button" className="primary" onClick={newGame}>
              새 게임
            </button>
          </div>

          <p
            className={finished ? "outcome" : "hint"}
            role="status"
            aria-live="polite"
          >
            {battleshipStatusLabel(state.outcome, state.cpuThinking)}
          </p>

          {state.messages.length > 0 && (
            <ul className="bs-log" aria-label="직전 라운드 결과">
              {state.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}

          <div className="bs-boards">
            <BoardGrid
              board={state.cpuBoard}
              title="적 함대 (CPU) — 클릭해 사격"
              revealShips={finished}
              onFire={fire}
              locked={finished || state.cpuThinking}
            />
            <BoardGrid board={state.humanBoard} title="내 함대" revealShips locked={finished} />
          </div>

          {finished && (
            <div className="result">
              <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
            </div>
          )}
        </>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

/** 배치 단계: 내 보드에 함선을 한 척씩 직접 배치한다(클릭=배치, R/버튼=회전). */
function PlacementPhase({
  state,
  hover,
  setHover,
  placingSize,
  complete,
  onPlace,
  onRotate,
  onRandom,
  onReset,
  onStart,
  onDifficulty,
}: {
  state: ViewState;
  hover: { row: number; col: number } | null;
  setHover: (h: { row: number; col: number } | null) => void;
  placingSize: number | null;
  complete: boolean;
  onPlace: (row: number, col: number) => void;
  onRotate: () => void;
  onRandom: () => void;
  onReset: () => void;
  onStart: () => void;
  onDifficulty: (difficulty: CpuDifficulty) => void;
}) {
  // 배치 보드도 방향키 이동 + 로빙 탭인덱스를 제공한다(좌표계 x=열 c, y=행 r).
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    BOARD_SIZE,
    BOARD_SIZE,
  );
  const board = createBattleshipBoard(BOARD_SIZE, state.placed);
  const preview =
    hover && placingSize !== null
      ? placementPreview(
          state.placed,
          state.placed.length,
          placingSize,
          hover.row,
          hover.col,
          state.orientation,
          BOARD_SIZE,
        )
      : null;
  const previewKeys = new Set(preview?.cells.map(([r, c]) => `${r},${c}`));

  return (
    <>
      <p className="hint">
        사격 전에 <strong>내 함대를 직접 배치</strong>하세요. 보드의 칸을 클릭(또는 Enter/Space)하면
        그 칸을 시작점으로 함선이 놓입니다. <strong>R</strong> 키나 "회전" 버튼으로 가로(↔)/세로(↕)를
        바꿉니다. 잘못된 위치(겹침·범위 초과)는 거부되고 사유가 표시됩니다.
      </p>

      <div className="controls" role="group" aria-label="CPU 난이도 선택">
        <span className="hint">CPU 난이도:</span>
        {(["easy", "hard"] as const).map((d) => (
          <button
            key={d}
            type="button"
            className={state.difficulty === d ? "primary" : ""}
            onClick={() => onDifficulty(d)}
            aria-pressed={state.difficulty === d}
          >
            {difficultyLabel(d)}
          </button>
        ))}
      </div>

      <div className="controls">
        <span className="hint">방향: {state.orientation === "h" ? "가로 ↔" : "세로 ↕"}</span>
        <button type="button" onClick={onRotate}>
          회전 (R)
        </button>
        <button type="button" onClick={onRandom}>
          무작위 배치
        </button>
        <button type="button" onClick={onReset} disabled={state.placed.length === 0}>
          초기화
        </button>
        <button type="button" className="primary" onClick={onStart} disabled={!complete}>
          이 배치로 시작
        </button>
      </div>

      <p className={complete ? "outcome" : "hint"}>
        {placementStatusLabel(state.placed, FLEET)}
      </p>
      {state.placementError && (
        <p className="error" role="alert">
          {state.placementError}
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
                const view = cellView(cell, r, c, { revealShips: true, sunk: false });
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
                return (
                  <button
                    key={`${r},${c}`}
                    ref={setCellRef(c, r)}
                    type="button"
                    role="gridcell"
                    className={`cell bs-cell bs-${view.state}${previewClass}`}
                    tabIndex={tabIndexFor(c, r)}
                    onClick={() => {
                      focusOn(c, r);
                      if (!complete) onPlace(r, c);
                    }}
                    onMouseEnter={() => setHover({ row: r, col: c })}
                    onFocus={() => {
                      focusOn(c, r);
                      setHover({ row: r, col: c });
                    }}
                    aria-disabled={complete}
                    aria-label={`${view.label}${previewLabel}`}
                  >
                    {view.glyph}
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
