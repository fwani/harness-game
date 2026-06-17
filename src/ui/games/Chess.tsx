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

const SIZE = 8;

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 백(White, 선), CPU는 흑(Black, 후).
const HUMAN: ChessColor = "white";

/** vs CPU 모드의 난수 어댑터(부수효과는 infrastructure에). 테스트는 헬퍼에 스텁을 주입한다. */
const rng = new MathRandomSource();

export function Chess() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<ChessGameState>(() => startChessGame());
  const [selected, setSelected] = useState<Square | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 직전 수(from→to) 강조용 — 상대(핫시트/CPU)가 무엇을 뒀는지 인지하게 한다.
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드.
  const recorded = useRef(false);

  // vs CPU 모드의 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "chess");

  // 종료로 막 전환됐을 때 1회 전적을 기록한다.
  // vs CPU: 사람=백=a / CPU=흑=b 라벨로 기록(chessWinSide가 백→a/흑→b/무승부→draw이므로
  // 사람/CPU 관점과 그대로 일치한다). 2인 로컬: 기존 백/흑 핫시트 기록을 유지한다.
  const recordIfFinished = (prev: ChessGameState, next: ChessGameState) => {
    if (!next.finished || prev.finished || recorded.current) {
      return;
    }
    recorded.current = true;
    const [a, b] = mode === "cpu" ? [SELF_PLAYER, "CPU"] : ["백", "흑"];
    recordGame("chess", a, b, chessWinSide(next));
  };

  const click = (row: number, col: number) => {
    if (state.finished) {
      return;
    }
    // vs CPU: 사람(백) 차례에만 입력을 받는다(CPU 차례 입력은 들어올 일이 없지만 방어적으로 차단).
    if (mode === "cpu" && state.next !== HUMAN) {
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
          // vs CPU: 사람 수로 끝나지 않았다면 CPU(흑)가 곧바로 한 수 둔다.
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

  const reset = () => {
    recorded.current = false;
    setState(startChessGame());
    setSelected(null);
    setError(null);
    setLastMove(null);
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    recorded.current = false;
    setState(startChessGame());
    setSelected(null);
    setError(null);
    setLastMove(null);
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
      <p className="hint">
        {mode === "cpu"
          ? "내가 백(♔, 선)이고 CPU가 흑(♚, 후)입니다. 둘 기물을 누르면 갈 수 있는 칸이 표시되고, 그 칸을 누르면 착수합니다. 내가 두면 CPU가 곧바로 한 수 둡니다."
          : "두 사람이 번갈아 둡니다. 둘 기물을 누르면 갈 수 있는 칸이 표시되고, 그 칸을 누르면 착수합니다. 같은 칸을 다시 누르면 선택이 해제됩니다."}
      </p>
      {state.finished ? (
        <p className="outcome">
          종료 · <strong>{status}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {status}
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
            // vs CPU에서 CPU(흑) 차례면 입력을 막는다(동기 착수라 보통 즉시 사람 차례로 돌아옴).
            const cpuTurn = mode === "cpu" && state.next !== HUMAN;
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
