import { useState } from "react";
import { playRound, type RoundResult } from "../../application/playOddEven";
import type { Parity } from "../../domain/oddEven";
import { RandomNumberSource } from "../../infrastructure/randomNumberSource";
import { recordGame } from "../records";

const GUESSES: { parity: Parity; label: string }[] = [
  { parity: "odd", label: "홀" },
  { parity: "even", label: "짝" },
];

const source = new RandomNumberSource();

export function OddEven() {
  const [round, setRound] = useState<RoundResult | null>(null);

  const play = (guess: Parity) => {
    const result = playRound(guess, source);
    setRound(result);
    recordGame("oddEven", "나", "딜러", result.won ? "a" : "b");
  };

  return (
    <section className="game">
      <h2>홀짝</h2>
      <p className="hint">0–99 사이 무작위 수의 홀짝을 맞혀보세요.</p>
      <div className="choices">
        {GUESSES.map((g) => (
          <button key={g.parity} className="choice" onClick={() => play(g.parity)}>
            <span className="label-big">{g.label}</span>
          </button>
        ))}
      </div>
      {round && (
        <div className="result">
          <p className="drawn">
            추첨된 수 <strong>{round.drawn}</strong> (
            {round.drawn % 2 === 0 ? "짝" : "홀"})
          </p>
          <p className="outcome">{round.won ? "🎉 정답!" : "😢 오답"}</p>
        </div>
      )}
    </section>
  );
}
