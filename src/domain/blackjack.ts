// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// card.ts의 Card/Rank 타입을 재사용한다. 카드 모델을 재정의하지 않는다.
// rankValue(에이스 하이=14)는 비교 전용이므로 블랙잭 점수에는 쓰지 않고, 전용 매핑을 둔다.

import type { Card, Rank } from "./card";

export interface BlackjackValue {
  /** 21을 넘지 않는 한 에이스를 최대한 11로 센 최선의 합. 버스트면 모든 A를 1로 센 최소 합. */
  total: number;
  /** 에이스를 11로 센 합이 채택됐는가(소프트 핸드). 버스트면 false. */
  isSoft: boolean;
  /** 모든 A를 1로 세도 21 초과인가. */
  isBust: boolean;
  /** 정확히 2장이며 A+10가치로 21(내추럴 블랙잭)인가. */
  isBlackjack: boolean;
}

/**
 * 블랙잭 전용 랭크 점수(에이스는 1로 센 기본값). 2~10=숫자, J/Q/K=10, A=1.
 * 에이스를 11로 올리는 처리는 evaluateBlackjackHand에서 합 계산 시 수행한다.
 */
const BLACKJACK_BASE_VALUES: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
};

/**
 * 블랙잭 손패의 합계와 상태를 계산한다(불변·순수). suit는 무시한다.
 * - 빈 배열이면 throw(손패에는 최소 1장 필요).
 * - 에이스는 21을 넘지 않는 한 하나만 11로 셀 수 있다(두 장을 11로 세면 항상 22 초과).
 */
export function evaluateBlackjackHand(cards: Card[]): BlackjackValue {
  if (cards.length === 0) {
    throw new Error("evaluateBlackjackHand: 손패에는 최소 1장이 필요하다");
  }

  // 모든 에이스를 1로 센 최소 합.
  let minTotal = 0;
  let aceCount = 0;
  for (const card of cards) {
    minTotal += BLACKJACK_BASE_VALUES[card.rank];
    if (card.rank === "A") aceCount += 1;
  }

  if (minTotal > 21) {
    // 모든 A를 1로 세도 초과 → 버스트.
    return { total: minTotal, isSoft: false, isBust: true, isBlackjack: false };
  }

  // 에이스가 있고 11로 올려도(+10) 21을 넘지 않으면 그 합을 채택(소프트 핸드).
  const isSoft = aceCount > 0 && minTotal + 10 <= 21;
  const total = isSoft ? minTotal + 10 : minTotal;

  // 내추럴: 정확히 2장으로 21(=A+10가치)인 경우.
  const isBlackjack = cards.length === 2 && total === 21;

  return { total, isSoft, isBust: false, isBlackjack };
}
