import { useState } from "react";
import { startGame, applyMove, type GomokuState } from "../../application/playGomoku";
import { recordGame } from "../records";

const SIZE = 15;

const STONE = { black: "●", white: "○" } as const;

export function Gomoku() {
  const [state, setState] = useState<GomokuState>(() => startGame(SIZE));

  const place = (x: number, y: number) => {
    if (state.winner !== null || state.board[y]![x] !== null) {
      return;
    }
    const next = applyMove(state, x, y);
    setState(next);
    if (next.winner !== null) {
      recordGame("gomoku", "흑", "백", next.winner === "black" ? "a" : "b");
    }
  };

  return (
    <section className="game">
      <h2>오목 (2인)</h2>
      <p className="hint">
        {state.winner
          ? `${state.winner === "black" ? "흑" : "백"} 승리! 🎉`
          : `${state.next === "black" ? "흑" : "백"} 차례`}
      </p>
      <div
        className="board"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x},${y}`}
              className="cell"
              onClick={() => place(x, y)}
              disabled={state.winner !== null || cell !== null}
            >
              {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
            </button>
          )),
        )}
      </div>
      <button className="primary" onClick={() => setState(startGame(SIZE))}>
        새 게임
      </button>
    </section>
  );
}
