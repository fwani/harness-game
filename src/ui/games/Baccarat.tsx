import { useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import { playBaccaratRound, type BaccaratRoundResult } from "../../application/playBaccaratRound";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { baccaratOutcomeLabel } from "./baccaratView";
import {
  DEFAULT_BACCARAT_BET,
  baccaratBetOptions,
  baccaratBetOutcomeLabel,
  baccaratBetResult,
  type BaccaratBet,
} from "./baccaratStartOptionsView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

const BET_OPTIONS = baccaratBetOptions();

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

/** 한 판의 타블로 결과와 그 판에 실제로 건 베팅 측을 함께 보관한다(이후 선택을 바꿔도 표시 일관). */
interface RoundState {
  result: BaccaratRoundResult;
  bet: BaccaratBet;
}

export function Baccarat() {
  // 다음 딜에 적용할 베팅 측(플레이어/뱅커/타이). 시작 옵션으로 사람이 선택한다.
  const [bet, setBet] = useState<BaccaratBet>(DEFAULT_BACCARAT_BET);
  const [round, setRound] = useState<RoundState | null>(null);
  // 바카라 통산 전적을 화면에 표시한다(게임별 고유 키 "baccarat").
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "baccarat");

  const deal = () => {
    const result = playBaccaratRound(rng);
    // 선택한 베팅 기준으로 정산해 전적에 기록한다(나=a 적중, b 빗나감, draw 타이 푸시 환원).
    recordGame("baccarat", SELF_PLAYER, "CPU", baccaratBetResult(bet, result.outcome));
    setRound({ result, bet });
  };

  return (
    <section className="game">
      <h2>바카라</h2>
      <p className="hint">
        베팅 측을 고른 뒤 딜링하세요. 표준 punto banco 타블로로 자동 진행됩니다 — 양측 끗수(0~9) 중
        큰 쪽이 승, 같으면 타이. 타이가 나오면 플레이어·뱅커 베팅은 무효 환원(푸시)됩니다.
      </p>
      <div className="controls" role="group" aria-label="베팅 측 선택">
        {BET_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={bet === opt.value ? "primary" : ""}
            aria-pressed={bet === opt.value}
            onClick={() => setBet(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="hint" aria-live="polite">
        현재 베팅: <strong>{BET_OPTIONS.find((o) => o.value === bet)?.label}</strong>
      </p>
      <div className="controls">
        <button className="primary" onClick={deal}>
          {round ? "다시 딜링" : "딜링"}
        </button>
      </div>
      {round && (
        <div className="result">
          <div className="versus">
            <Hand label="플레이어" hand={round.result.playerHand} score={round.result.playerScore} />
            <span className="vs">vs</span>
            <Hand label="뱅커" hand={round.result.bankerHand} score={round.result.bankerScore} />
          </div>
          <p className="outcome" aria-live="polite">
            핸드 결과: {baccaratOutcomeLabel(round.result.outcome)} ·{" "}
            <strong>{baccaratBetOutcomeLabel(round.bet, round.result.outcome)}</strong>
          </p>
        </div>
      )}
      <StreakPanel title="바카라 통산 전적 (나)" summary={streak} />
    </section>
  );
}
