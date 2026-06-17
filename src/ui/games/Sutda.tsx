import { useState, useSyncExternalStore } from "react";
import type { HwatuCard } from "../../domain/hwatu";
import type { SutdaHandRank } from "../../domain/sutda";
import { playSutdaRound, type SutdaRoundResult } from "../../application/playSutdaRound";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { sutdaRankLabel, sutdaOutcomeLabel } from "./sutdaView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

/** 화투 카드 칩: 월(月)을 텍스트로 명확히 표기한다(색만으로 구분하지 않음). */
function HwatuChip({ card }: { card: HwatuCard }) {
  return <span className="card-chip big">{card.month}월</span>;
}

function Hand({
  label,
  cards,
  rank,
}: {
  label: string;
  cards: [HwatuCard, HwatuCard];
  rank: SutdaHandRank;
}) {
  return (
    <div>
      <div className="hand-label">
        {label} · {sutdaRankLabel(rank)}
      </div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <HwatuChip key={`${card.month}-${card.index}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

export function Sutda() {
  const [round, setRound] = useState<SutdaRoundResult | null>(null);
  // 카드 게임 5종이 공유하는 "card" 통산 전적을 화면에 표시한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "card");

  return (
    <section className="game">
      <h2>섯다</h2>
      <p className="hint">
        화투 2장으로 끗/땡/특수패를 겨뤄 높은 패가 이깁니다(땡 &gt; 특수패 &gt; 끗).
      </p>
      <button
        className="primary"
        onClick={() => {
          const result = playSutdaRound(rng);
          setRound(result);
          recordGame("card", SELF_PLAYER, "CPU", result.result);
        }}
      >
        {round ? "다시 딜링" : "딜링"}
      </button>
      {round && (
        <div className="result">
          <div className="versus">
            <Hand label="나" cards={round.a} rank={round.aRank} />
            <span className="vs">vs</span>
            <Hand label="CPU" cards={round.b} rank={round.bRank} />
          </div>
          <p className="outcome">{sutdaOutcomeLabel(round.result)}</p>
        </div>
      )}
      <StreakPanel title="카드 게임 통산 전적 (나)" summary={streak} />
    </section>
  );
}
