// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// card.ts의 Card/Rank 타입을 재사용한다. 카드 모델을 재정의하지 않는다.
// 바카라 끗수는 블랙잭과 다르다(A는 항상 1, 11로 올리지 않는다). 전용 매핑을 둔다.

import type { Card, Rank } from "./card";

export interface BaccaratValue {
  /** 손패 합을 10으로 나눈 나머지(0~9). */
  score: number;
  /** 정확히 2장이며 score가 8 또는 9(내추럴)인가. */
  isNatural: boolean;
}

/**
 * 바카라 전용 랭크 끗수 값. A=1, 2~9=숫자 그대로, 10·J·Q·K=0.
 * 블랙잭과 달리 에이스는 항상 1로만 센다.
 */
const BACCARAT_VALUES: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 0,
  J: 0,
  Q: 0,
  K: 0,
};

/**
 * 바카라 손패의 끗수(점수)와 내추럴 여부를 계산한다(불변·순수). suit는 무시한다.
 * - 빈 배열이면 throw(손패에는 최소 1장 필요).
 * - 점수는 끗수 합을 10으로 나눈 나머지(0~9).
 * - 내추럴: 정확히 2장이며 점수가 8 또는 9.
 */
export function evaluateBaccaratHand(cards: Card[]): BaccaratValue {
  if (cards.length === 0) {
    throw new Error("evaluateBaccaratHand: 손패에는 최소 1장이 필요하다");
  }

  let pipTotal = 0;
  for (const card of cards) {
    pipTotal += BACCARAT_VALUES[card.rank];
  }

  const score = pipTotal % 10;
  const isNatural = cards.length === 2 && (score === 8 || score === 9);

  return { score, isNatural };
}

/** punto banco 한 판의 승자(끗수 비교 결과). player·banker·tie 세 가지. */
export type BaccaratOutcome = "player" | "banker" | "tie";

/** 플레이어가 걸 수 있는 베팅 측. 결과(BaccaratOutcome)와 같은 집합이지만 의미가 달라 별칭으로 둔다. */
export type BaccaratBetSide = BaccaratOutcome;

export interface BaccaratSettlement {
  /** 베팅액 대비 순손익(양수=획득, 음수=손실, 0=push). 환원되는 원금은 제외한 순액. */
  net: number;
  /** push(원금 환원) 여부 — Tie 결과에서 Player/Banker 베팅. */
  push: boolean;
}

/** 뱅커 적중 시 커미션 차감 비율(5%). 실수령 배당은 0.95:1. */
const BANKER_COMMISSION = 0.05;
/** Tie 적중 배당 배수(8:1). */
const TIE_PAYOUT = 8;

/**
 * 베팅 측·베팅액·라운드 결과로 표준 punto banco 배당을 정산한다(불변·순수).
 * - player 적중: +bet (1:1)
 * - banker 적중: +floor(bet*0.95) (커미션 5% 차감, 내림) — 반올림 규칙은 단위 테스트로 고정
 * - tie 적중: +bet*8 (8:1)
 * - tie 결과에서 player/banker 베팅: push(net 0, 원금 환원)
 * - 그 외 미적중: -bet
 * - bet이 양의 정수가 아니면 throw
 */
export function settleBaccaratBet(
  side: BaccaratBetSide,
  bet: number,
  outcome: BaccaratOutcome,
): BaccaratSettlement {
  if (!Number.isInteger(bet) || bet <= 0) {
    throw new Error("settleBaccaratBet: 베팅액은 양의 정수여야 한다");
  }

  if (outcome === "tie") {
    // 타이 결과: 타이 베팅은 8:1 적중, 플레이어·뱅커 베팅은 무효 환원(push).
    if (side === "tie") {
      return { net: bet * TIE_PAYOUT, push: false };
    }
    return { net: 0, push: true };
  }

  // 타이가 아닌 결과: 타이 베팅은 무조건 패배.
  if (side === "tie") {
    return { net: -bet, push: false };
  }

  if (side === outcome) {
    // 뱅커 적중은 5% 커미션을 내림으로 차감(실수령 0.95:1), 플레이어 적중은 1:1.
    const net = side === "banker" ? Math.floor(bet * (1 - BANKER_COMMISSION)) : bet;
    return { net, push: false };
  }

  return { net: -bet, push: false };
}
