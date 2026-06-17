import { useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import { evaluatePokerHand } from "../../domain/pokerHand";
import { playPokerShowdown, type PokerShowdownResult } from "../../application/playPokerShowdown";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { pokerCategoryLabel, pokerOutcomeLabel, winnersToWinSide } from "./pokerView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

const SUIT: Record<Suit, { sym: string; red: boolean }> = {
  spades: { sym: "♠", red: false },
  clubs: { sym: "♣", red: false },
  hearts: { sym: "♥", red: true },
  diamonds: { sym: "♦", red: true },
};

/** 카드 칩: 무늬 기호+숫자를 함께 표기한다(색만으로 구분하지 않음). */
function CardChip({ card }: { card: Card }) {
  const s = SUIT[card.suit];
  return (
    <span className={s.red ? "card-chip big red" : "card-chip big"}>
      {card.rank}
      {s.sym}
    </span>
  );
}

function Hand({ label, cards, winner }: { label: string; cards: Card[]; winner: boolean }) {
  // 족보 이름은 domain(evaluatePokerHand)을 호출만 해서 얻는다(규칙 재구현 금지).
  const category = pokerCategoryLabel(evaluatePokerHand(cards).category);
  return (
    <div>
      <div className="hand-label">
        {label} · {category}
        {winner ? " · 승자" : ""}
      </div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <CardChip key={`${card.suit}-${card.rank}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

export function Poker() {
  const [round, setRound] = useState<PokerShowdownResult | null>(null);
  // 카드 게임 5종이 공유하는 "card" 통산 전적을 화면에 표시한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "card");

  return (
    <section className="game">
      <h2>포커</h2>
      <p className="hint">
        각자 5장을 받아 족보가 높은 쪽이 이깁니다(동률이면 무승부).
      </p>
      <button
        className="primary"
        onClick={() => {
          const result = playPokerShowdown(rng, 2);
          setRound(result);
          recordGame("card", SELF_PLAYER, "CPU", winnersToWinSide(result.winners));
        }}
      >
        {round ? "다시 딜링" : "딜링"}
      </button>
      {round && (
        <div className="result">
          <div className="versus">
            <Hand label="나" cards={round.hands[0]!} winner={round.winners.includes(0)} />
            <span className="vs">vs</span>
            <Hand label="CPU" cards={round.hands[1]!} winner={round.winners.includes(1)} />
          </div>
          <p className="outcome">{pokerOutcomeLabel(round.winners)}</p>
        </div>
      )}
      <StreakPanel title="카드 게임 통산 전적 (나)" summary={streak} />
    </section>
  );
}
