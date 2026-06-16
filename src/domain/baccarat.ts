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
