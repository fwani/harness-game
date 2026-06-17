import { useRef, useState } from "react";
import {
  startChessGame,
  applyChessMove,
  type ChessGameState,
  type Square,
} from "../../application/playChess";
import { pieceAt } from "../../domain/chess";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import {
  cellKey,
  chessSquareView,
  chessStatusLabel,
  chessMoveErrorReason,
  chessWinSide,
  legalTargetsFrom,
} from "./chessView";

const SIZE = 8;

export function Chess() {
  const [state, setState] = useState<ChessGameState>(() => startChessGame());
  const [selected, setSelected] = useState<Square | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 직전 수(from→to) 강조용 — 상대가 무엇을 뒀는지(핫시트) 인지하게 한다.
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드.
  const recorded = useRef(false);

  const recordIfFinished = (prev: ChessGameState, next: ChessGameState) => {
    if (!next.finished || prev.finished || recorded.current) {
      return;
    }
    recorded.current = true;
    // 백=a/흑=b/무승부=draw. 핫시트라 플레이어 라벨은 진영명으로 둔다.
    recordGame("chess", "백", "흑", chessWinSide(next));
  };

  const click = (row: number, col: number) => {
    if (state.finished) {
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
          const next = applyChessMove(state, selected, sq);
          setState(next);
          setLastMove({ from: selected, to: sq });
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

  const isLastMove = (row: number, col: number) =>
    lastMove !== null &&
    ((lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col));

  const status = chessStatusLabel(state);

  return (
    <section className="game">
      <h2>체스 (2인)</h2>
      <p className="hint">
        두 사람이 번갈아 둡니다. 둘 기물을 누르면 갈 수 있는 칸이 표시되고, 그 칸을 누르면
        착수합니다. 같은 칸을 다시 누르면 선택이 해제됩니다.
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
            // 선택 가능 칸·합법 도착 칸·현재 선택 칸만 활성화한다.
            const playable =
              !state.finished && (view.selectable || view.target || view.selected);
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
      <button className="primary" onClick={reset}>
        새 게임
      </button>
    </section>
  );
}
