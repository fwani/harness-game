import { useState } from "react";
import { createBoard, placeStone, type Board, type Stone } from "../../domain/go";

const SIZE = 9;

const STONE = { black: "●", white: "○" } as const;

export function Go() {
  const [board, setBoard] = useState<Board>(() => createBoard(SIZE));
  const [turn, setTurn] = useState<Stone>("black");
  const [captures, setCaptures] = useState({ black: 0, white: 0 });
  const [error, setError] = useState<string | null>(null);

  const place = (x: number, y: number) => {
    try {
      const { board: next, captured } = placeStone(board, x, y, turn);
      setBoard(next);
      setCaptures((c) => ({ ...c, [turn]: c[turn] + captured }));
      setTurn(turn === "black" ? "white" : "black");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reset = () => {
    setBoard(createBoard(SIZE));
    setTurn("black");
    setCaptures({ black: 0, white: 0 });
    setError(null);
  };

  return (
    <section className="game">
      <h2>바둑 ({SIZE}×{SIZE})</h2>
      <p className="hint">
        {turn === "black" ? "흑" : "백"} 차례 · 따냄 흑 {captures.black} / 백{" "}
        {captures.white}
      </p>
      <p className="hint">착수와 따냄(활로 0 그룹 제거)만 지원 — 집 계산·승패 판정은 없습니다.</p>
      <div
        className="board go"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {board.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x},${y}`}
              className="cell"
              onClick={() => place(x, y)}
              disabled={cell !== null}
            >
              {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
            </button>
          )),
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" onClick={reset}>
        새 게임
      </button>
    </section>
  );
}
