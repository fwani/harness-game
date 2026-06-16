// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard, isValidHwatuCard } from "./hwatu";

/** 화투 카드의 고스톱 기본 분류. */
export type HwatuCategory = "광" | "열끗" | "띠" | "피";

/**
 * 표준 고스톱 48장 분류표 — 이 표가 단일 소스(결정적).
 * 각 월(month) 4장의 index 0→3 순서에 대한 분류.
 * 합계: 광=5(월 1·3·8·11·12), 열끗=9(월 2·4·5·6·7·8·9·10·12),
 *       띠=10(월 1·2·3·4·5·6·7·9·10·12), 피=24, 총 48.
 */
const CLASSIFICATION: Readonly<Record<number, readonly HwatuCategory[]>> = {
  1: ["광", "띠", "피", "피"],
  2: ["열끗", "띠", "피", "피"],
  3: ["광", "띠", "피", "피"],
  4: ["열끗", "띠", "피", "피"],
  5: ["열끗", "띠", "피", "피"],
  6: ["열끗", "띠", "피", "피"],
  7: ["열끗", "띠", "피", "피"],
  8: ["광", "열끗", "피", "피"],
  9: ["열끗", "띠", "피", "피"],
  10: ["열끗", "띠", "피", "피"],
  11: ["광", "피", "피", "피"],
  12: ["광", "열끗", "띠", "피"],
};

/**
 * 화투 카드 한 장을 고스톱 기본 분류(광/열끗/띠/피)로 판정한다.
 * - 위 표준 분류표에 따라 (month, index) → category 로 결정(결정적).
 * - isValidHwatuCard 로 유효하지 않은 카드면 throw.
 * - 입력 카드를 변형하지 않는다.
 */
export function classifyHwatuCard(card: HwatuCard): HwatuCategory {
  if (!isValidHwatuCard(card)) {
    throw new Error(
      `유효하지 않은 화투 카드: month=${card.month}, index=${card.index}`,
    );
  }
  // isValidHwatuCard 통과 → month 1~12, index 0~3 보장이므로 조회는 항상 성공한다.
  const category = CLASSIFICATION[card.month]?.[card.index];
  if (category === undefined) {
    throw new Error(
      `분류표에 없는 화투 카드: month=${card.month}, index=${card.index}`,
    );
  }
  return category;
}

/**
 * 카드 묶음을 분류별 개수로 집계한다(고스톱 점수 집계의 토대).
 * - 항상 네 분류 키를 모두 포함(0 포함)한다: { 광, 열끗, 띠, 피 }.
 * - 유효하지 않은 카드가 섞이면 throw. 빈 배열이면 모두 0.
 * - 입력 배열/원소를 변형하지 않는다.
 */
export function countHwatuByCategory(
  cards: HwatuCard[],
): Record<HwatuCategory, number> {
  const counts: Record<HwatuCategory, number> = { 광: 0, 열끗: 0, 띠: 0, 피: 0 };
  for (const card of cards) {
    counts[classifyHwatuCard(card)] += 1;
  }
  return counts;
}
