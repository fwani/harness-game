import { useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import {
  playBaccaratRound,
  resolveBaccaratWager,
  type BaccaratRoundResult,
} from "../../application/playBaccaratRound";
import type { BaccaratSettlement } from "../../domain/baccarat";
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
import {
  STARTING_BANKROLL,
  BET_PRESETS,
  DEFAULT_BET_AMOUNT,
  clampBet,
  isValidBet,
  isBankrupt,
  nextBankroll,
  baccaratSettlementLabel,
} from "./baccaratBankrollView";
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

/** 한 판의 타블로 결과·그 판에 실제로 건 베팅 측/액수·정산 결과를 함께 보관한다(이후 선택을 바꿔도 표시 일관). */
interface RoundState {
  result: BaccaratRoundResult;
  bet: BaccaratBet;
  betAmount: number;
  settlement: BaccaratSettlement;
}

export function Baccarat() {
  // 다음 딜에 적용할 베팅 측(플레이어/뱅커/타이). 시작 옵션으로 사람이 선택한다.
  const [bet, setBet] = useState<BaccaratBet>(DEFAULT_BACCARAT_BET);
  // 다음 딜에 걸 베팅액(가상 칩). 잔고를 초과할 수 없다.
  const [betAmount, setBetAmount] = useState<number>(DEFAULT_BET_AMOUNT);
  // 가상 칩 잔고(뱅크롤). 세션/로컬 상태로만 유지(외부 인증·실거래 없음).
  const [bankroll, setBankroll] = useState<number>(STARTING_BANKROLL);
  const [round, setRound] = useState<RoundState | null>(null);
  // 바카라 통산 전적을 화면에 표시한다(게임별 고유 키 "baccarat").
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "baccarat");

  const bankrupt = isBankrupt(bankroll);
  const canDeal = isValidBet(betAmount, bankroll);

  const deal = () => {
    if (!canDeal) {
      return;
    }
    const result = playBaccaratRound(rng);
    const { settlement } = resolveBaccaratWager(bet, betAmount, result);
    const updated = nextBankroll(bankroll, settlement);
    // 선택한 베팅 기준으로 전적에 기록한다(나=a 적중, b 빗나감, draw 타이 푸시 환원).
    recordGame("baccarat", SELF_PLAYER, "CPU", baccaratBetResult(bet, result.outcome));
    setBankroll(updated);
    setRound({ result, bet, betAmount, settlement });
    // 줄어든 잔고를 넘지 않도록 베팅액을 다시 범위 안으로 클램프(잔고 소진 시 0).
    setBetAmount((prev) => clampBet(prev, updated));
  };

  const resetBankroll = () => {
    setBankroll(STARTING_BANKROLL);
    setBetAmount(DEFAULT_BET_AMOUNT);
    setRound(null);
  };

  const selectBetAmount = (amount: number) => {
    setBetAmount(clampBet(amount, bankroll));
  };

  return (
    <section className="game">
      <h2>바카라</h2>
      <p className="hint">
        베팅 측과 베팅액(칩)을 고른 뒤 딜링하세요. 표준 punto banco 타블로로 자동 진행됩니다 — 양측
        끗수(0~9) 중 큰 쪽이 승, 같으면 타이. 배당: 플레이어 1:1 · 뱅커 1:1(커미션 5% 차감) · 타이 8:1.
        타이가 나오면 플레이어·뱅커 베팅은 무효 환원(푸시)됩니다.
      </p>

      <p className="hint" aria-live="polite">
        보유 칩(뱅크롤): <strong>{bankroll}</strong>
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

      <div className="controls" role="group" aria-label="베팅액 선택">
        {BET_PRESETS.map((amount) => (
          <button
            key={amount}
            className={betAmount === amount ? "primary" : ""}
            aria-pressed={betAmount === amount}
            disabled={amount > bankroll}
            onClick={() => selectBetAmount(amount)}
          >
            {amount} 칩
          </button>
        ))}
        <label>
          베팅액
          <input
            type="number"
            min={1}
            max={bankroll}
            step={1}
            value={betAmount}
            disabled={bankrupt}
            aria-label="베팅액 직접 입력"
            onChange={(e) => selectBetAmount(Number(e.target.value))}
          />
        </label>
      </div>

      <p className="hint" aria-live="polite">
        현재 베팅: <strong>{BET_OPTIONS.find((o) => o.value === bet)?.label}</strong> · 베팅액{" "}
        <strong>{betAmount} 칩</strong>
      </p>

      <div className="controls">
        <button className="primary" onClick={deal} disabled={!canDeal}>
          {round ? "다시 딜링" : "딜링"}
        </button>
        {bankrupt && <button onClick={resetBankroll}>새 뱅크롤로 리셋</button>}
      </div>

      {bankrupt && (
        <p className="error" role="alert">
          칩이 모두 소진되었습니다. "새 뱅크롤로 리셋"으로 다시 시작하세요.
        </p>
      )}

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
          <p className="outcome" aria-live="polite">
            정산({round.betAmount} 칩 베팅): <strong>{baccaratSettlementLabel(round.settlement)}</strong>{" "}
            · 갱신 잔고 <strong>{bankroll}</strong>
          </p>
        </div>
      )}

      <StreakPanel title="바카라 통산 전적 (나)" summary={streak} />
    </section>
  );
}
