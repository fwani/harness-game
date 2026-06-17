import { useState } from "react";
import { scoreArea, type GoScore } from "../../domain/goScore";
import { startGame, applyMove, pass, type GoState } from "../../application/playGo";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";

const SIZE = 9;

const STONE = { black: "●", white: "○" } as const;

export function Go() {
  const [state, setState] = useState<GoState>(() => startGame(SIZE));
  const [error, setError] = useState<string | null>(null);

  const place = (x: number, y: number) => {
    if (state.finished) {
      return;
    }
    try {
      setState(applyMove(state, x, y));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const doPass = () => {
    const next = pass(state);
    setState(next);
    setError(null);
    // 연속 2회 패스로 막 종료됐다면 계가 결과를 기록한다.
    if (next.finished && !state.finished) {
      const s = scoreArea(next.board);
      recordGame("go", "흑", "백", s.winner === null ? "draw" : s.winner === "black" ? "a" : "b");
    }
  };

  const reset = () => {
    setState(startGame(SIZE));
    setError(null);
  };

  // 연속 2회 패스로 종료되면 영역 계가로 집·점수·승자를 계산한다.
  const score: GoScore | null = state.finished ? scoreArea(state.board) : null;

  const winnerLabel =
    score === null
      ? null
      : score.winner === null
        ? "무승부"
        : `${score.winner === "black" ? "흑" : "백"} 승리! 🎉`;

  return (
    <section className="game">
      <h2>바둑 ({SIZE}×{SIZE})</h2>
      {state.finished ? (
        <p className="hint">
          종료(연속 2회 패스) · 흑 {score!.black} / 백 {score!.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint">
          {state.next === "black" ? "흑" : "백"} 차례 · 따냄 흑{" "}
          {state.captures.black} / 백 {state.captures.white}
          {state.lastWasPass ? " · 직전 패스(한 번 더 패스하면 종료)" : ""}
        </p>
      )}
      <div
        className="board go"
        style={boardGridStyle(SIZE)}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x},${y}`}
              className="cell"
              onClick={() => place(x, y)}
              disabled={cell !== null || state.finished}
            >
              {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
            </button>
          )),
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="controls">
        <button className="primary" onClick={doPass} disabled={state.finished}>
          패스
        </button>
        <button className="primary" onClick={reset}>
          새 게임
        </button>
      </div>
    </section>
  );
}
