// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// card.ts의 Card/Rank 타입과 rankValue(에이스 하이)를 재사용한다. 랭크 수치를 재정의하지 않는다.

import type { Card } from "./card";
import { rankValue } from "./card";

/** 족보 카테고리(약→강). 숫자가 클수록 강하다. */
export enum PokerHandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export interface PokerHandRank {
  category: PokerHandCategory;
  /** 동일 카테고리 내 타이브레이크용. 강한 그룹/높은 랭크 우선으로 내림차순 정렬된 랭크 수치 배열. */
  tiebreakers: number[];
}

/**
 * 5장 랭크 수치로 스트레이트 여부를 판정한다.
 * - 서로 다른 5개 랭크가 연속이면 스트레이트.
 * - A-2-3-4-5(휠)는 A를 1로 취급하는 최약 스트레이트(high=5).
 * - A-K-Q-J-10은 high=14인 최강 스트레이트.
 */
function detectStraight(values: number[]): {
  isStraight: boolean;
  straightHigh: number;
} {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  if (distinct.length !== 5) return { isStraight: false, straightHigh: 0 };

  // 휠(A-2-3-4-5): 수치 집합이 {2,3,4,5,14}, high=5로 취급한다.
  const isWheel = [2, 3, 4, 5, 14].every((v) => distinct.includes(v));
  if (isWheel) return { isStraight: true, straightHigh: 5 };

  // 일반 스트레이트: 오름차순 인접 차이가 모두 1.
  let prev: number | null = null;
  for (const v of distinct) {
    if (prev !== null && v - prev !== 1) {
      return { isStraight: false, straightHigh: 0 };
    }
    prev = v;
  }
  return { isStraight: true, straightHigh: Math.max(...distinct) };
}

/**
 * 정확히 5장의 핸드를 평가해 족보와 타이브레이크 정보를 반환한다(불변·결정적).
 * - 5장이 아니면 throw.
 * - 무늬(suit)는 우열 판정에 사용하지 않는다.
 * - 타이브레이크는 같은 카테고리 안에서 그룹 크기(예: 풀하우스의 트리플 → 페어)
 *   우선, 그다음 높은 랭크 순으로 비교가 일관되게 동작하도록 내림차순 정렬한다.
 */
export function evaluatePokerHand(cards: Card[]): PokerHandRank {
  if (cards.length !== 5) {
    throw new Error(`핸드는 정확히 5장이어야 한다(받은 카드 수: ${cards.length}).`);
  }

  const values = cards.map((c) => rankValue(c.rank));
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;

  // 랭크 수치별 개수.
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  // 그룹을 (개수 내림차순, 랭크 내림차순)으로 정렬한다.
  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });
  const groupRanks = groups.map((g) => g[0]);
  const countPattern = groups.map((g) => g[1]);

  const valuesDesc = [...values].sort((a, b) => b - a);
  const { isStraight, straightHigh } = detectStraight(values);

  const isFour = countPattern[0] === 4;
  const isThree = countPattern[0] === 3;
  const pairCount = countPattern.filter((c) => c === 2).length;

  if (isStraight && isFlush) {
    return { category: PokerHandCategory.StraightFlush, tiebreakers: [straightHigh] };
  }
  if (isFour) {
    // [포카드 랭크, 키커]
    return { category: PokerHandCategory.FourOfAKind, tiebreakers: groupRanks };
  }
  if (isThree && pairCount === 1) {
    // [트리플 랭크, 페어 랭크]
    return { category: PokerHandCategory.FullHouse, tiebreakers: groupRanks };
  }
  if (isFlush) {
    return { category: PokerHandCategory.Flush, tiebreakers: valuesDesc };
  }
  if (isStraight) {
    return { category: PokerHandCategory.Straight, tiebreakers: [straightHigh] };
  }
  if (isThree) {
    // [트리플 랭크, 키커1, 키커2]
    return { category: PokerHandCategory.ThreeOfAKind, tiebreakers: groupRanks };
  }
  if (pairCount === 2) {
    // [높은 페어, 낮은 페어, 키커]
    return { category: PokerHandCategory.TwoPair, tiebreakers: groupRanks };
  }
  if (pairCount === 1) {
    // [페어 랭크, 키커1, 키커2, 키커3]
    return { category: PokerHandCategory.OnePair, tiebreakers: groupRanks };
  }
  return { category: PokerHandCategory.HighCard, tiebreakers: valuesDesc };
}

/** 타이브레이크 배열을 앞에서부터 비교한다(내림차순 우선순위). a가 강하면 양수. */
function compareTiebreakers(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * 두 핸드의 우열을 비교한다(불변·결정적).
 * - a가 강하면 양수, 약하면 음수, 완전히 같은 강도면 0.
 * - 카테고리를 먼저 비교하고, 같으면 타이브레이크로 가린다.
 */
export function comparePokerHands(a: Card[], b: Card[]): number {
  const ra = evaluatePokerHand(a);
  const rb = evaluatePokerHand(b);
  if (ra.category !== rb.category) return ra.category - rb.category;
  return compareTiebreakers(ra.tiebreakers, rb.tiebreakers);
}
