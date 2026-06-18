import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Card, Suit } from "../../domain/card";
import {
  playBaccaratRound,
  resolveBaccaratWager,
  type BaccaratRoundResult,
} from "../../application/playBaccaratRound";
import {
  evaluateBaccaratHand,
  type BaccaratSettlement,
} from "../../domain/baccarat";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import {
  baccaratOutcomeLabel,
  baccaratRevealSteps,
  baccaratRevealStatusLabel,
  baccaratRevealedThrough,
} from "./baccaratView";
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

/** 한 단계(카드 한 장/결과) 공개 간격(ms). 즉시 점프 대신 사람이 진행을 "구경"할 수 있게 한다. */
const REVEAL_INTERVAL_MS = 700;

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

function Hand({ label, hand, score }: { label: string; hand: Card[]; score: number | null }) {
  return (
    <div>
      <div className="hand-label">
        {label}
        {score === null ? "" : ` ${score}`}
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
  // 현재 딜에서 공개된 reveal step 개수(0=시작 전, steps.length=결과까지 전부 공개).
  const [revealIndex, setRevealIndex] = useState(0);
  // 마지막 result 공개 시 정산/전적/잔고 갱신을 단 한 번만 적용하기 위한 가드.
  const settledRef = useRef(false);
  // 바카라 통산 전적을 화면에 표시한다(게임별 고유 키 "baccarat").
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "baccarat");

  const bankrupt = isBankrupt(bankroll);
  // 단계 공개 순서는 결과 손패에서 결정적으로 유도한다(도메인 규칙 재구현 금지).
  const steps = round ? baccaratRevealSteps(round.result) : [];
  const revealing = round !== null && revealIndex < steps.length;
  // 공개 진행 중에는 새 딜을 막아 중복 딜·중복 정산을 방지한다.
  const canDeal = isValidBet(betAmount, bankroll) && !revealing;

  // 타이머 기반 단계 자동 진행: 다음 카드/결과를 한 장씩 공개한다(타이머 상태는 UI에만).
  useEffect(() => {
    if (!round || revealIndex >= steps.length) {
      return;
    }
    const id = setTimeout(() => {
      setRevealIndex((i) => i + 1);
    }, REVEAL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [round, revealIndex, steps.length]);

  // 마지막 result step에 도달하면 정산·전적·잔고를 한 번만 반영한다(중간 step에서는 절대 반영하지 않음).
  useEffect(() => {
    if (!round || settledRef.current || revealIndex < steps.length) {
      return;
    }
    settledRef.current = true;
    const updated = nextBankroll(bankroll, round.settlement);
    // 선택한 베팅 기준으로 전적에 기록한다(나=a 적중, b 빗나감, draw 타이 푸시 환원).
    recordGame("baccarat", SELF_PLAYER, "CPU", baccaratBetResult(round.bet, round.result.outcome));
    setBankroll(updated);
    // 줄어든 잔고를 넘지 않도록 베팅액을 다시 범위 안으로 클램프(잔고 소진 시 0).
    setBetAmount((prev) => clampBet(prev, updated));
  }, [round, revealIndex, steps.length, bankroll]);

  const deal = () => {
    if (!canDeal) {
      return;
    }
    const result = playBaccaratRound(rng);
    const { settlement } = resolveBaccaratWager(bet, betAmount, result);
    settledRef.current = false;
    setRound({ result, bet, betAmount, settlement });
    // 첫 카드(플레이어 1장)는 즉시 공개하고 이후 단계는 타이머로 진행한다.
    setRevealIndex(1);
  };

  // 단계 공개를 기다리지 않고 즉시 전체(결과 포함)를 공개하는 선택지. 기본은 단계 공개.
  const skipReveal = () => {
    if (round) {
      setRevealIndex(steps.length);
    }
  };

  const resetBankroll = () => {
    settledRef.current = false;
    setBankroll(STARTING_BANKROLL);
    setBetAmount(DEFAULT_BET_AMOUNT);
    setRound(null);
    setRevealIndex(0);
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
        {revealing && <button onClick={skipReveal}>건너뛰기(전체 공개)</button>}
        {bankrupt && !revealing && (
          <button onClick={resetBankroll}>새 뱅크롤로 리셋</button>
        )}
      </div>

      {bankrupt && (
        <p className="error" role="alert">
          칩이 모두 소진되었습니다. "새 뱅크롤로 리셋"으로 다시 시작하세요.
        </p>
      )}

      {round &&
        (() => {
          // 지금까지 공개된 손패만 보여준다(즉시 점프 금지). 끗수는 공개된 부분 손패로 계산한다.
          const revealed = baccaratRevealedThrough(round.result, steps, revealIndex);
          // 끗수는 카드가 1장 이상일 때만 계산한다(빈 손패는 도메인이 예외를 던지므로 null 표기).
          const playerShownScore = revealed.playerHand.length
            ? evaluateBaccaratHand(revealed.playerHand).score
            : null;
          const bankerShownScore = revealed.bankerHand.length
            ? evaluateBaccaratHand(revealed.bankerHand).score
            : null;
          // 진행 중에는 다음에 공개될 단계를 "공개 중"으로 안내한다(뱅커 차례·드로우가 화면에 드러남).
          const status = revealing ? baccaratRevealStatusLabel(steps[revealIndex]!) : null;
          return (
            <div className="result">
              {status && (
                <p className="round-label" role="status" aria-live="polite">
                  딜링 중… {status}
                </p>
              )}
              <div className="versus">
                <Hand label="플레이어" hand={revealed.playerHand} score={playerShownScore} />
                <span className="vs">vs</span>
                <Hand label="뱅커" hand={revealed.bankerHand} score={bankerShownScore} />
              </div>
              {revealed.resultRevealed ? (
                <>
                  <p className="outcome" aria-live="polite">
                    핸드 결과: {baccaratOutcomeLabel(round.result.outcome)} ·{" "}
                    <strong>{baccaratBetOutcomeLabel(round.bet, round.result.outcome)}</strong>
                  </p>
                  <p className="outcome" aria-live="polite">
                    정산({round.betAmount} 칩 베팅):{" "}
                    <strong>{baccaratSettlementLabel(round.settlement)}</strong> · 갱신 잔고{" "}
                    <strong>{bankroll}</strong>
                  </p>
                </>
              ) : (
                <p className="hint" aria-live="polite">
                  카드를 한 장씩 공개하는 중입니다. 끗수·승자·정산은 모든 카드 공개 후 표시됩니다.
                </p>
              )}
            </div>
          );
        })()}

      <StreakPanel title="바카라 통산 전적 (나)" summary={streak} />
    </section>
  );
}
