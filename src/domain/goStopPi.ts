// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { classifyHwatuCard } from "./hwatuCategory";

/**
 * 손에 든(먹은) 카드들로 고스톱 피(皮) 점수를 계산한다.
 * 표준 규칙(장수 보너스):
 *   - 피(분류상 "피") 10장 이상: 10장=1점, 이후 피 1장당 +1점
 *   - 9장 이하: 0점
 *   - 예: 피 10장 = 1점, 12장 = 3점
 * - 피가 아닌 카드(광/열끗/띠)는 무시(throw 아님). 유효하지 않은 카드는 throw(classifyHwatuCard 위임).
 * - 모든 피는 1장으로 계산한다(쌍피 가중치 없음 — 이번 범위 제외).
 * - 입력 배열/원소를 변형하지 않는다. 빈 배열은 0점.
 * - 같은 카드 중복은 장수에 그대로 합산된다.
 */
export function scorePi(cards: HwatuCard[]): number {
  let piCount = 0;

  for (const card of cards) {
    if (classifyHwatuCard(card) !== "피") {
      continue;
    }
    piCount += 1;
  }

  // 피 장수 보너스: 10장=1점, 이후 1장당 +1점. 9장 이하는 0점.
  if (piCount >= 10) {
    return piCount - 9;
  }

  return 0;
}
