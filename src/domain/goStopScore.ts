// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { classifyHwatuCard } from "./hwatuCategory";

/**
 * 비광(雨光) 여부를 판정한다 — 표준 분류표상 12월의 광 카드(`{ month: 12, index: 0 }`).
 * - 유효하지 않은 카드는 classifyHwatuCard 에 위임해 throw.
 * - 입력 카드를 변형하지 않는다.
 */
export function isBiGwang(card: HwatuCard): boolean {
  return classifyHwatuCard(card) === "광" && card.month === 12 && card.index === 0;
}

/**
 * 손에 든(또는 먹은) 카드들로 고스톱 광(光) 점수를 계산한다.
 * 표준 규칙:
 *   - 광 0~2장: 0점
 *   - 3광: 비광(12월 광)을 포함하면 2점, 아니면 3점
 *   - 4광: 4점
 *   - 5광: 15점
 * - 광이 아닌 카드는 점수 계산에서 무시한다(throw 아님). 빈 배열은 0점.
 * - 유효하지 않은 카드가 섞이면 throw(기존 classifyHwatuCard 위임).
 * - 입력 배열/원소를 변형하지 않는다.
 */
export function scoreGwang(cards: HwatuCard[]): number {
  let gwangCount = 0;
  let hasBiGwang = false;
  for (const card of cards) {
    if (classifyHwatuCard(card) !== "광") {
      continue;
    }
    gwangCount += 1;
    if (card.month === 12 && card.index === 0) {
      hasBiGwang = true;
    }
  }

  if (gwangCount >= 5) {
    return 15;
  }
  if (gwangCount === 4) {
    return 4;
  }
  if (gwangCount === 3) {
    return hasBiGwang ? 2 : 3;
  }
  return 0;
}
