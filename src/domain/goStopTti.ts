// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { classifyHwatuCard } from "./hwatuCategory";

/** 단(段) 종류 */
export type DanType = "홍단" | "청단" | "초단";

/**
 * 각 단(段)을 구성하는 띠의 월(month) — 표준 분류표 기준(결정적).
 *   - 홍단(紅短): 1·2·3월의 띠
 *   - 청단(靑短): 6·9·10월의 띠
 *   - 초단(草短): 4·5·7월의 띠
 * (12월 띠 등 그 외 띠는 어느 단에도 속하지 않으며 "띠 장수" 보너스에만 포함된다.)
 */
const DAN_MONTHS: Readonly<Record<DanType, readonly number[]>> = {
  홍단: [1, 2, 3],
  청단: [6, 9, 10],
  초단: [4, 5, 7],
};

/**
 * 띠 카드 한 장이 속한 단(段)을 판정한다. 어느 단에도 속하지 않으면 null.
 * - 띠가 아닌 카드도 null(throw 아님). 유효하지 않은 카드는 throw(classifyHwatuCard 위임).
 * - 입력 카드를 변형하지 않는다.
 */
export function classifyDan(card: HwatuCard): DanType | null {
  if (classifyHwatuCard(card) !== "띠") {
    return null;
  }
  for (const dan of Object.keys(DAN_MONTHS) as DanType[]) {
    if (DAN_MONTHS[dan].includes(card.month)) {
      return dan;
    }
  }
  return null;
}

/**
 * 손에 든(먹은) 카드들로 고스톱 띠(단) 점수를 계산한다.
 * 표준 규칙(모두 합산):
 *   - 홍단 3장 모두 보유: +3점
 *   - 청단 3장 모두 보유: +3점
 *   - 초단 3장 모두 보유: +3점
 *   - 띠(분류상 "띠") 5장 이상: 5장=1점, 이후 띠 1장당 +1점
 *   - 예: 홍단 3장만 가진 5장 띠 = 3(단) + 1(장수) = 4점
 * - 띠가 아닌 카드는 무시(throw 아님). 유효하지 않은 카드는 throw.
 * - 입력 배열/원소를 변형하지 않는다. 빈 배열은 0점.
 * - 같은 카드 중복은 장수에 그대로 합산된다(단 완성 판정은 월 단위라 영향 없음).
 */
export function scoreTti(cards: HwatuCard[]): number {
  let ttiCount = 0;
  const danMonthsHeld = new Set<number>();

  for (const card of cards) {
    if (classifyHwatuCard(card) !== "띠") {
      continue;
    }
    ttiCount += 1;
    danMonthsHeld.add(card.month);
  }

  let score = 0;

  // 각 단 3장 모두 보유 시 +3점
  for (const dan of Object.keys(DAN_MONTHS) as DanType[]) {
    if (DAN_MONTHS[dan].every((month) => danMonthsHeld.has(month))) {
      score += 3;
    }
  }

  // 띠 장수 보너스: 5장=1점, 이후 1장당 +1점
  if (ttiCount >= 5) {
    score += ttiCount - 4;
  }

  return score;
}
