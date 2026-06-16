// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { classifyHwatuCard } from "./hwatuCategory";

/**
 * 고도리(godori) 구성패의 월(month) — 표준 분류표 기준(결정적).
 *   - 2월 열끗, 4월 열끗, 8월 열끗 세 장.
 * (인덱스를 하드코딩하지 않고 classifyHwatuCard 분류 + 월로 판별해 분류표 변경에 견고하게 한다.)
 */
const GODORI_MONTHS: readonly number[] = [2, 4, 8];

/**
 * 카드 한 장이 고도리(2·4·8월 열끗) 구성패인지 판정한다.
 * - 열끗이 아니거나 해당 월이 아니면 false(throw 아님).
 * - 유효하지 않은 카드는 throw(classifyHwatuCard 위임).
 * - 입력 카드를 변형하지 않는다.
 */
export function isGodoriCard(card: HwatuCard): boolean {
  if (classifyHwatuCard(card) !== "열끗") {
    return false;
  }
  return GODORI_MONTHS.includes(card.month);
}

/**
 * 손에 든(먹은) 카드들로 고스톱 열끗 점수를 계산한다.
 * 표준 규칙(모두 합산):
 *   - 열끗(분류상 "열끗") 5장 이상: 5장=1점, 이후 열끗 1장당 +1점
 *   - 고도리(2·4·8월 열끗) 3장 모두 보유: +5점
 *   - 예: 고도리 3장 포함 열끗 5장 = 1(장수) + 5(고도리) = 6점
 * - 열끗이 아닌 카드는 무시(throw 아님). 유효하지 않은 카드는 throw.
 * - 입력 배열/원소를 변형하지 않는다. 빈 배열은 0점.
 * - 같은 카드 중복은 장수에 그대로 합산된다(고도리 완성 판정은 월 단위라 영향 없음).
 */
export function scoreYeol(cards: HwatuCard[]): number {
  let yeolCount = 0;
  const godoriMonthsHeld = new Set<number>();

  for (const card of cards) {
    if (classifyHwatuCard(card) !== "열끗") {
      continue;
    }
    yeolCount += 1;
    if (GODORI_MONTHS.includes(card.month)) {
      godoriMonthsHeld.add(card.month);
    }
  }

  let score = 0;

  // 열끗 장수 보너스: 5장=1점, 이후 1장당 +1점
  if (yeolCount >= 5) {
    score += yeolCount - 4;
  }

  // 고도리 3장(2·4·8월 열끗) 모두 보유 시 +5점
  if (GODORI_MONTHS.every((month) => godoriMonthsHeld.has(month))) {
    score += 5;
  }

  return score;
}
