import { useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import { playBlackjackRound, type BlackjackRoundResult } from "../../application/playBlackjack";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { blackjackWinSide, handTotalLabel } from "./blackjackView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

const SUIT: Record<Suit, { sym: string; red: boolean }> = {
  spades: { sym: "♠", red: false },
  clubs: { sym: "♣", red: false },
  hearts: { sym: "♥", red: true },
  diamonds: { sym: "♦", red: true },
};

const OUTCOME: Record<BlackjackRoundResult["outcome"], string> = {
  player: "🎉 승리!",
  dealer: "😢 패배",
  push: "🤝 무승부",
};

function CardChip({ card }: { card: Card }) {
  const s = SUIT[card.suit];
  return (
    <span className={s.red ? "card-chip red" : "card-chip"}>
      {card.rank}
      {s.sym}
    </span>
  );
}

function Hand({ label, cards }: { label: string; cards: Card[] }) {
  return (
    <div className="hand">
      <div className="hand-label">{label}</div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <CardChip key={`${card.suit}-${card.rank}-${i}`} card={card} />
        ))}
      </div>
      <strong>{handTotalLabel(cards)}</strong>
    </div>
  );
}

export function Blackjack() {
  const [round, setRound] = useState<BlackjackRoundResult | null>(null);
  // 카드 게임 5종이 공유하는 "card" 통산 전적을 화면에 표시한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "card");

  return (
    <section className="game">
      <h2>블랙잭</h2>
      <p className="hint">
        딜링하면 17 미만 히트·17 이상 스탠드 하우스 룰로 자동 진행됩니다. 21에 가까운(버스트 없는) 쪽이 승.
      </p>
      <button
        className="primary"
        onClick={() => {
          const result = playBlackjackRound(rng);
          setRound(result);
          recordGame("card", SELF_PLAYER, "CPU", blackjackWinSide(result.outcome));
        }}
      >
        {round ? "다시 딜링" : "딜링"}
      </button>
      {round && (
        <div className="result">
          <Hand label="나" cards={round.playerHand} />
          <Hand label="딜러" cards={round.dealerHand} />
          <p className="outcome">{OUTCOME[round.outcome]}</p>
        </div>
      )}
      <StreakPanel title="카드 게임 통산 전적 (나)" summary={streak} />
    </section>
  );
}
