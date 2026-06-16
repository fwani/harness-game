// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// hwatu.ts의 HwatuCard/isSameMonth를 재사용한다(중복 정의 금지). 화투 2장으로
// 섯다 패의 등급(땡/끗)을 매기고 비교하는 evaluate/compare 패턴을 따른다
// (포커 evaluatePokerHand/comparePokerHands, 주사위 evaluateDiceRoll/compareDiceCategory와 동일).

import type { HwatuCard } from "./hwatu";
import { isSameMonth } from "./hwatu";

/** 섯다 패의 종류 */
export type SutdaCategory = "ddaeng" | "kkut"; // 땡 | 끗

/** 카테고리별 비교 강도(땡이 끗보다 강하다). 같은 category는 같은 strength를 가진다. */
const CATEGORY_STRENGTH: Record<SutdaCategory, number> = {
  ddaeng: 1, // 땡
  kkut: 0, // 끗
};

export interface SutdaHandRank {
  category: SutdaCategory;
  /** 땡이면 month(1~10), 끗이면 0~9 */
  value: number;
}

/** 섯다에서 유효한 month 핀 범위(1~10). 11·12월은 섯다에서 사용하지 않는다. */
const MIN_PIP = 1;
const MAX_PIP = 10;

/** 섯다용 월(month)이 1~10의 정수인지 검증한다. 위반 시 throw. */
function validatePip(month: number): void {
  if (!Number.isInteger(month) || month < MIN_PIP || month > MAX_PIP) {
    throw new Error(`섯다 카드의 month는 ${MIN_PIP}~${MAX_PIP}의 정수여야 한다(받은 값: ${month}).`);
  }
}

/**
 * 섯다 2장 패의 등급을 판정한다(순수·불변).
 * - 두 카드의 month는 1~10 정수여야 하며, 아니면 throw. 입력 카드를 변형하지 않는다.
 * - 같은 월이면 땡(value=month), 아니면 끗(value=(a.month + b.month) % 10).
 */
export function evaluateSutdaHand(a: HwatuCard, b: HwatuCard): SutdaHandRank {
  validatePip(a.month);
  validatePip(b.month);

  if (isSameMonth(a, b)) {
    return { category: "ddaeng", value: a.month };
  }
  return { category: "kkut", value: (a.month + b.month) % 10 };
}

/**
 * 두 섯다 패의 우열을 비교한다(순수·불변).
 * a가 강하면 양수, b가 강하면 음수, 동급이면 0.
 * 우선순위: 땡 > 끗, 같은 종류면 value가 큰 쪽이 강하다.
 */
export function compareSutdaHands(a: SutdaHandRank, b: SutdaHandRank): number {
  const sa = CATEGORY_STRENGTH[a.category];
  const sb = CATEGORY_STRENGTH[b.category];
  if (sa !== sb) return sa - sb;
  return a.value - b.value;
}
