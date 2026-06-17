// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { scoreGwang } from "./goStopScore";
import { scorePi } from "./goStopPi";
import { scoreGoStopTotal } from "./goStopTotal";
import { countHwatuByCategory } from "./hwatuCategory";

/** 적용된 박(배수) 규칙 플래그. */
export interface GoStopBakFlags {
  /** 광박 — 승자가 광 점수를 얻고 패자가 광을 한 장도 못 먹음 */
  gwangbak: boolean;
  /** 피박 — 승자가 피 점수를 얻고 패자의 피가 7장 미만 */
  pibak: boolean;
}

/** 박(배수)을 적용한 고스톱 한 판 최종 점수. */
export interface GoStopFinalScore {
  /** 승자의 카테고리 합산 점수 (scoreGoStopTotal) */
  base: number;
  /** 적용된 배수 (1, 2, 4) */
  multiplier: number;
  /** 적용된 박 플래그 */
  flags: GoStopBakFlags;
  /** base * multiplier */
  total: number;
}

/**
 * 승자/패자가 먹은 카드를 비교해 박(배수) 규칙을 적용한 고스톱 최종 점수를 계산한다(순수, 결정적).
 *
 * 박 규칙(이번 범위는 광박·피박 두 가지만, 분쟁 소지 있는 멍박/열끗박·고박은 제외):
 *   - 광박(gwangbak): scoreGwang(winnerCards) > 0(광 3장 이상)이고 패자가 광 카드를
 *     한 장도 먹지 못한 경우 true.
 *   - 피박(pibak): scorePi(winnerCards) > 0(피 10장 이상)이고 패자의 피 카드 수가
 *     7장 미만인 경우 true.
 *
 * - base = scoreGoStopTotal(winnerCards) — 기존 점수 함수에 위임(규칙 복제 없음).
 * - multiplier 는 적용된 박마다 ×2로 누적: 둘 다면 ×4, 하나면 ×2, 없으면 ×1.
 * - total = base * multiplier. base === 0 이면 박이 떠도 total 은 0(0 × 배수 = 0).
 * - 패자 카드의 광/피 개수는 countHwatuByCategory(→ classifyHwatuCard)로 센다(규칙 복제 없음).
 * - 유효하지 않은 카드가 섞이면 위임 함수(scoreGwang/scorePi/classifyHwatuCard 등)에서 throw — 별도 검증 추가 없음.
 * - 입력 배열/원소를 변형하지 않는다.
 */
export function applyGoStopBak(
  winnerCards: HwatuCard[],
  loserCards: HwatuCard[],
): GoStopFinalScore {
  const base = scoreGoStopTotal(winnerCards);

  const loserCounts = countHwatuByCategory(loserCards);

  const gwangbak = scoreGwang(winnerCards) > 0 && loserCounts.광 === 0;
  const pibak = scorePi(winnerCards) > 0 && loserCounts.피 < 7;

  let multiplier = 1;
  if (gwangbak) {
    multiplier *= 2;
  }
  if (pibak) {
    multiplier *= 2;
  }

  return {
    base,
    multiplier,
    flags: { gwangbak, pibak },
    total: base * multiplier,
  };
}
