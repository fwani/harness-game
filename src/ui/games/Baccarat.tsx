import { useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import { playBaccaratRound, type BaccaratRoundResult } from "../../application/playBaccaratRound";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { baccaratWinSide, baccaratOutcomeLabel } from "./baccaratView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

const SUIT: Record<Suit, { sym: string; red: boolean }> = {
  spades: { sym: "♠", red: false },
  clubs: { sym: "♣", red: false },
  hearts: { sym: "♥", red: true },
  diamonds: { sym: "♦", red: true },
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

function Hand({ label, hand, score }: { label: string; hand: Card[]; score: number }) {
  return (
    <div>
      <div className="hand-label">
        {label} {score}
      </div>
      <div className="hand-cards">
        {hand.map((card, i) => (
          <BigCard key={`${card.suit}-${card.rank}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

export function Baccarat() {
  const [round, setRound] = useState<BaccaratRoundResult | null>(null);
  // 바카라 통산 전적을 화면에 표시한다(게임별 고유 키 "baccarat").
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "baccarat");

  return (
    <section className="game">
      <h2>바카라</h2>
      <p className="hint">
        표준 punto banco 타블로로 자동 진행됩니다. 양측 끗수(0~9) 중 큰 쪽이 승, 같으면 무승부.
      </p>
      <button
        className="primary"
        onClick={() => {
          const result = playBaccaratRound(rng);
          setRound(result);
          recordGame("baccarat", SELF_PLAYER, "CPU", baccaratWinSide(result.outcome));
        }}
      >
        {round ? "다시 딜링" : "딜링"}
      </button>
      {round && (
        <div className="result">
          <div className="versus">
            <Hand label="나" hand={round.playerHand} score={round.playerScore} />
            <span className="vs">vs</span>
            <Hand label="뱅커" hand={round.bankerHand} score={round.bankerScore} />
          </div>
          <p className="outcome">{baccaratOutcomeLabel(round.outcome)}</p>
        </div>
      )}
      <StreakPanel title="바카라 통산 전적 (나)" summary={streak} />
    </section>
  );
}
