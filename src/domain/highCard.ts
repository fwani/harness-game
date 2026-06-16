// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// card.ts의 타입만 사용한다.

import type { Card, Rank } from "./card";

/** 두 카드 비교 결과. "first" = a 승, "second" = b 승, "draw" = 무승부. */
export type HighCardResult = "first" | "second" | "draw";

/**
 * 비교용 랭크 정수값(에이스 하이 표준). 2..10 = 2..10, J=11, Q=12, K=13, A=14.
 */
const RANK_VALUES: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/**
 * 랭크의 비교용 수치를 반환한다(에이스 하이: A=14, K=13 … 2=2).
 */
export function rankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

/**
 * 두 카드를 랭크 수치로 비교한다(불변·결정적).
 * - rankValue(a) > rankValue(b) → "first"
 * - rankValue(a) < rankValue(b) → "second"
 * - 같으면 → "draw" (무늬는 비교에 사용하지 않는다)
 */
export function compareHighCard(a: Card, b: Card): HighCardResult {
  const av = rankValue(a.rank);
  const bv = rankValue(b.rank);
  if (av > bv) return "first";
  if (av < bv) return "second";
  return "draw";
}
