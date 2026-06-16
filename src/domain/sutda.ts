// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// hwatu.ts의 HwatuCard/isSameMonth를 재사용한다(중복 정의 금지). 화투 2장으로
// 섯다 패의 등급(땡/끗)을 매기고 비교하는 evaluate/compare 패턴을 따른다
// (포커 evaluatePokerHand/comparePokerHands, 주사위 evaluateDiceRoll/compareDiceCategory와 동일).

import type { HwatuCard } from "./hwatu";
import { isSameMonth } from "./hwatu";

/** 섯다 패의 종류. 위계: 땡 > 특수패(멍텅구리 끗) > 끗 */
export type SutdaCategory = "ddaeng" | "special" | "kkut"; // 땡 | 특수패 | 끗

/** 카테고리별 비교 강도(땡 > 특수패 > 끗). 같은 category는 같은 strength를 가진다. */
const CATEGORY_STRENGTH: Record<SutdaCategory, number> = {
  ddaeng: 2, // 땡
  special: 1, // 특수패(멍텅구리 끗)
  kkut: 0, // 끗
};

export interface SutdaHandRank {
  category: SutdaCategory;
  /** 땡이면 month(1~10), 특수패면 내부 강도(1~6), 끗이면 0~9 */
  value: number;
}

/**
 * 멍텅구리 끗(특수패) 월 조합 → 내부 강도(클수록 강함). 키는 정렬된 "min·max".
 * 강→약: 알리 1·2(6) > 독사 1·4(5) > 구삥 1·9(4) > 장삥 1·10(3) > 장사 4·10(2) > 세륙 4·6(1).
 */
const SPECIAL_KKUT_STRENGTH: Record<string, number> = {
  "1,2": 6, // 알리
  "1,4": 5, // 독사
  "1,9": 4, // 구삥
  "1,10": 3, // 장삥
  "4,10": 2, // 장사
  "4,6": 1, // 세륙
};

/**
 * 두 월(month) 조합이 특수패면 내부 강도(1~6)를, 아니면 null을 반환한다.
 * 월 순서는 무관하다([min,max]로 정규화). 같은 월(땡)은 호출 전에 걸러진다.
 */
function specialKkutValue(a: number, b: number): number | null {
  const key = a <= b ? `${a},${b}` : `${b},${a}`;
  return SPECIAL_KKUT_STRENGTH[key] ?? null;
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
 * 판정 순서:
 *   1. 같은 월 → 땡(value=month).
 *   2. 특수패 조합(알리·독사·구삥·장삥·장사·세륙) → special(value=내부 강도 1~6).
 *   3. 그 외 → 끗(value=(a.month + b.month) % 10).
 */
export function evaluateSutdaHand(a: HwatuCard, b: HwatuCard): SutdaHandRank {
  validatePip(a.month);
  validatePip(b.month);

  if (isSameMonth(a, b)) {
    return { category: "ddaeng", value: a.month };
  }

  const special = specialKkutValue(a.month, b.month);
  if (special !== null) {
    return { category: "special", value: special };
  }

  return { category: "kkut", value: (a.month + b.month) % 10 };
}

/**
 * 두 섯다 패의 우열을 비교한다(순수·불변).
 * a가 강하면 양수, b가 강하면 음수, 동급이면 0.
 * 우선순위: 땡 > 특수패 > 끗, 같은 종류면 value가 큰 쪽이 강하다.
 */
export function compareSutdaHands(a: SutdaHandRank, b: SutdaHandRank): number {
  const sa = CATEGORY_STRENGTH[a.category];
  const sb = CATEGORY_STRENGTH[b.category];
  if (sa !== sb) return sa - sb;
  return a.value - b.value;
}
