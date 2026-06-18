import { useRef, useState, useSyncExternalStore } from "react";
import {
  startChessGame,
  applyChessMove,
  type ChessGameState,
  type Square,
} from "../../application/playChess";
import { pieceAt, type ChessColor } from "../../domain/chess";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { boardGridStyle } from "./boardView";
import { chooseCpuChessMove } from "./chessCpuView";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  cellKey,
  chessSquareView,
  chessStatusLabel,
  chessMoveErrorReason,
  chessWinSide,
  legalTargetsFrom,
} from "./chessView";
import {
  chessColorOptions,
  chessHumanColor,
  cpuPlaysFirst,
  normalizeChessStartOptions,
  type ChessStartOptions,
} from "./chessStartOptionsView";

const SIZE = 8;

type Mode = "local" | "cpu";

/** vs CPU 모드의 난수 어댑터(부수효과는 infrastructure에). 테스트는 헬퍼에 스텁을 주입한다. */
const rng = new MathRandomSource();

/** 진영 자형(색 비의존 단서). 백=외곽선 ♔ / 흑=채움 ♚. */
const KING_GLYPH: Record<ChessColor, string> = { white: "♔", black: "♚" };

/**
 * 선택한 옵션으로 새 게임을 시작한다. 체스는 항상 백이 선착하므로, vs CPU에서 사람이 흑(후공)이면
 * CPU(백)가 곧바로 첫 수를 둔다(화면이 사람 차례로 시작하도록). 직전 수 강조용 lastMove도 함께 반환.
 */
function startNewGame(
  humanWhite: boolean,
  mode: Mode,
): { state: ChessGameState; lastMove: { from: Square; to: Square } | null } {
  let state = startChessGame();
  let lastMove: { from: Square; to: Square } | null = null;
  if (mode === "cpu" && cpuPlaysFirst(humanWhite)) {
    const cpuMove = chooseCpuChessMove(state, rng);
    if (cpuMove !== null) {
      state = applyChessMove(state, cpuMove.from, cpuMove.to);
      lastMove = cpuMove;
    }
  }
  return { state, lastMove };
}

export function Chess() {
  const [mode, setMode] = useState<Mode>("local");
  // 폼에서 고르는 시작 옵션(사람 색). 기본 사람 백(♔·선공).
  const [options, setOptions] = useState<ChessStartOptions>(() =>
    normalizeChessStartOptions({}),
  );
  // 진행 중인 판이 시작된 시점의 색 설정(폼을 바꿔도 진행 중 판의 라벨/턴 분기가 흔들리지 않게 고정).
  const [activeHumanWhite, setActiveHumanWhite] = useState(options.humanWhite);
  const [state, setState] = useState<ChessGameState>(
    () => startNewGame(options.humanWhite, "local").state,
  );
  const [selected, setSelected] = useState<Square | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 직전 수(from→to) 강조용 — 상대(핫시트/CPU)가 무엇을 뒀는지 인지하게 한다.
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드.
  const recorded = useRef(false);

  // vs CPU에서 사람이 조작하는 색(현재 판 기준). 백 선공이면 "white", 흑 후공이면 "black".
  const humanColor = chessHumanColor(activeHumanWhite);
  const cpuColor: ChessColor = humanColor === "white" ? "black" : "white";

  // vs CPU 모드의 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "chess");

  // 종료로 막 전환됐을 때 1회 전적을 기록한다.
  // vs CPU: 항상 사람=a / CPU=b 라벨로 기록한다. chessWinSide는 백→a/흑→b/무승부→draw이므로
  // 사람이 흑이면 승/패 위치를 사람=a 기준으로 뒤집어, 색 선택과 무관하게 집계 의미를 보존한다.
  // 2인 로컬: 기존 백=a/흑=b 핫시트 기록을 그대로 유지한다.
  const recordIfFinished = (prev: ChessGameState, next: ChessGameState) => {
    if (!next.finished || prev.finished || recorded.current) {
      return;
    }
    recorded.current = true;
    const raw = chessWinSide(next);
    if (mode === "cpu") {
      const win =
        humanColor === "black"
          ? raw === "a"
            ? "b"
            : raw === "b"
              ? "a"
              : "draw"
          : raw;
      recordGame("chess", SELF_PLAYER, "CPU", win);
    } else {
      recordGame("chess", "백", "흑", raw);
    }
  };

  const click = (row: number, col: number) => {
    if (state.finished) {
      return;
    }
    // vs CPU: 사람 색 차례에만 입력을 받는다(CPU 차례 입력은 들어올 일이 없지만 방어적으로 차단).
    if (mode === "cpu" && state.next !== humanColor) {
      return;
    }
    const sq: Square = { row, col };
    if (selected !== null) {
      // 같은 칸 재클릭 → 선택 해제.
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        setError(null);
        return;
      }
      // 선택 기물의 합법 도착 칸 → 착수.
      const isTarget = legalTargetsFrom(state, selected).some(
        (t) => t.row === row && t.col === col,
      );
      if (isTarget) {
        try {
          let next = applyChessMove(state, selected, sq);
          let shownMove = { from: selected, to: sq };
          // vs CPU: 사람 수로 끝나지 않았다면 CPU(상대 색)가 곧바로 한 수 둔다.
          if (mode === "cpu" && !next.finished) {
            const cpuMove = chooseCpuChessMove(next, rng);
            if (cpuMove !== null) {
              next = applyChessMove(next, cpuMove.from, cpuMove.to);
              shownMove = cpuMove;
            }
          }
          setState(next);
          setLastMove(shownMove);
          setSelected(null);
          setError(null);
          recordIfFinished(state, next);
        } catch (e) {
          setError(chessMoveErrorReason(e));
        }
        return;
      }
    }
    // 현재 차례의 (둘 수 있는) 기물을 클릭 → 선택.
    const piece = pieceAt(state.board, row, col);
    if (piece !== null && piece.color === state.next) {
      setSelected(sq);
      setError(null);
      return;
    }
    // 그 외(빈 칸·상대 기물)는 선택 해제.
    setSelected(null);
  };

  /** 옵션을 적용해 새 게임을 시작한다(진행 판의 색 설정 고정 + CPU 선착 처리 포함). */
  const applyOptions = (next: ChessStartOptions, nextMode: Mode) => {
    setOptions(next);
    setActiveHumanWhite(next.humanWhite);
    recorded.current = false;
    const started = startNewGame(next.humanWhite, nextMode);
    setState(started.state);
    setLastMove(started.lastMove);
    setSelected(null);
    setError(null);
  };

  const reset = () => applyOptions(options, mode);

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    applyOptions(options, nextMode);
  };

  const selectHumanWhite = (humanWhite: boolean) => {
    applyOptions({ ...options, humanWhite }, mode);
  };

  const isLastMove = (row: number, col: number) =>
    lastMove !== null &&
    ((lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col));

  const status = chessStatusLabel(state);

  return (
    <section className="game">
      <h2>체스 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
      <div className="controls" role="group" aria-label="플레이 모드 선택">
        <button
          type="button"
          className={mode === "local" ? "primary" : ""}
          aria-pressed={mode === "local"}
          onClick={() => switchMode("local")}
        >
          2인 로컬
        </button>
        <button
          type="button"
          className={mode === "cpu" ? "primary" : ""}
          aria-pressed={mode === "cpu"}
          onClick={() => switchMode("cpu")}
        >
          vs CPU
        </button>
      </div>
      {mode === "cpu" && (
        <div className="controls" role="group" aria-label="사람 색 선택">
          <span className="hint">사람 색:</span>
          {chessColorOptions().map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className={options.humanWhite === opt.value ? "primary" : ""}
              aria-pressed={options.humanWhite === opt.value}
              onClick={() => selectHumanWhite(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        {mode === "cpu"
          ? `내가 ${humanColor === "white" ? "백(♔, 선)" : "흑(♚, 후)"}이고 CPU가 ${KING_GLYPH[cpuColor]}(${cpuColor === "white" ? "백, 선" : "흑, 후"})입니다. 둘 기물을 누르면 갈 수 있는 칸이 표시되고, 그 칸을 누르면 착수합니다. 내가 두면 CPU가 곧바로 한 수 둡니다.`
          : "두 사람이 번갈아 둡니다. 둘 기물을 누르면 갈 수 있는 칸이 표시되고, 그 칸을 누르면 착수합니다. 같은 칸을 다시 누르면 선택이 해제됩니다."}
      </p>
      {state.finished ? (
        <p className="outcome">
          종료 · <strong>{status}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {mode === "cpu" && state.next === cpuColor
            ? "CPU가 생각 중…"
            : status}
        </p>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="hint">
        진영 구분(색에 의존하지 않음): 백은 외곽선 기물(♔♕♖♗♘♙)·흑은 채움 기물(♚♛♜♝♞♟),
        각 칸은 좌표(a1~h8)와 기물 이름으로도 안내됩니다.
      </p>
      <div className="board chess" style={boardGridStyle(SIZE)}>
        {state.board.map((cells, row) =>
          cells.map((_, col) => {
            const view = chessSquareView(state, selected, { row, col });
            // 체스판 교대 칸: 색 외 단서가 아니라 판 모양을 위한 시각 배경.
            const light = (row + col) % 2 === 0;
            const classes = ["cell", light ? "sq-light" : "sq-dark"];
            if (view.selected) classes.push("selected");
            if (view.target) classes.push("legal");
            if (isLastMove(row, col)) classes.push("last-move");
            // vs CPU에서 CPU 색 차례면 입력을 막는다(동기 착수라 보통 즉시 사람 차례로 돌아옴).
            const cpuTurn = mode === "cpu" && state.next !== humanColor;
            // 선택 가능 칸·합법 도착 칸·현재 선택 칸만 활성화한다.
            const playable =
              !state.finished &&
              !cpuTurn &&
              (view.selectable || view.target || view.selected);
            return (
              <button
                key={cellKey(row, col)}
                className={classes.join(" ")}
                onClick={() => click(row, col)}
                disabled={!playable}
                aria-pressed={view.selected}
                aria-label={view.ariaLabel}
              >
                {view.color !== null && (
                  <span className={`chess-piece ${view.color}`} aria-hidden="true">
                    {view.glyph}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
      <div className="controls">
        <button type="button" className="primary" onClick={reset}>
          새 게임
        </button>
      </div>
      {mode === "cpu" && <StreakPanel title="내 전적 (나)" summary={streak} />}
    </section>
  );
}
