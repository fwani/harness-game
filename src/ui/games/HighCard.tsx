import { useState } from "react";
import type { Card, Suit } from "../../domain/card";
import type { HighCardResult } from "../../domain/highCard";
import { playHighCardRound, type HighCardRoundResult } from "../../application/playHighCard";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";

const rng = new MathRandomSource();

const SUIT: Record<Suit, { sym: string; red: boolean }> = {
  spades: { sym: "♠", red: false },
  clubs: { sym: "♣", red: false },
  hearts: { sym: "♥", red: true },
  diamonds: { sym: "♦", red: true },
};

const OUTCOME: Record<HighCardResult, string> = {
  first: "🎉 승리!",
  second: "😢 패배",
  draw: "🤝 무승부",
};

function BigCard({ card }: { card: Card }) {
  const s = SUIT[card.suit];
  return (
    <span className={s.red ? "card-chip big red" : "card-chip big"}>
      {card.rank}
      {s.sym}
    </span>
  );
}

export function HighCard() {
  const [round, setRound] = useState<HighCardRoundResult | null>(null);

  return (
    <section className="game">
      <h2>하이카드</h2>
      <p className="hint">
        카드를 한 장씩 뽑아 더 높은 랭크가 이깁니다(에이스가 가장 높음, 무늬는 무시).
      </p>
      <button
        className="primary"
        onClick={() => {
          const result = playHighCardRound(rng);
          setRound(result);
          recordGame(
            "card",
            "나",
            "CPU",
            result.result === "first" ? "a" : result.result === "second" ? "b" : "draw",
          );
        }}
      >
        카드 뽑기
      </button>
      {round && (
        <div className="result">
          <div className="versus">
            <div>
              <div className="hand-label">나</div>
              <BigCard card={round.a} />
            </div>
            <span className="vs">vs</span>
            <div>
              <div className="hand-label">CPU</div>
              <BigCard card={round.b} />
            </div>
          </div>
          <p className="outcome">{OUTCOME[round.result]}</p>
        </div>
      )}
    </section>
  );
}
