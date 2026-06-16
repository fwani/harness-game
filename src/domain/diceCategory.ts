// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// dice.ts의 DiceOutcome 타입을 재사용한다(중복 정의 금지). 5개 주사위 한 번 굴림을
// 족보(카테고리)로 판정·비교하는 evaluatePokerHand/comparePokerHands 패턴을 따른다.

import type { DiceOutcome } from "./dice";

/** 주사위 족보(높은 → 낮은). 강도 비교는 strength 수치로 한다. */
export type DiceCategory =
  | "yacht" // 5개 모두 같은 눈
  | "fourOfAKind" // 같은 눈 4개
  | "fullHouse" // 3개 + 2개
  | "largeStraight" // 1-2-3-4-5 또는 2-3-4-5-6
  | "smallStraight" // 연속된 눈 4개 이상 포함
  | "threeOfAKind" // 같은 눈 3개
  | "twoPair" // 서로 다른 페어 2쌍
  | "onePair" // 같은 눈 2개
  | "highDice"; // 아무 족보 없음

/** 카테고리별 비교 강도(yacht가 가장 큼). 같은 category는 같은 strength를 가진다. */
const CATEGORY_STRENGTH: Record<DiceCategory, number> = {
  yacht: 9,
  fourOfAKind: 8,
  fullHouse: 7,
  largeStraight: 6,
  smallStraight: 5,
  threeOfAKind: 4,
  twoPair: 3,
  onePair: 2,
  highDice: 1,
};

export interface DiceRollRank {
  /** 족보 이름 */
  category: DiceCategory;
  /** 비교용 족보 강도(yacht가 가장 큼). 동일 category면 같은 값 */
  strength: number;
  /** 동점 보조 비교용 눈 합계(1..6 × 5개) */
  sum: number;
}

const DICE_COUNT = 5;

/**
 * 5개 주사위 입력을 검증한다(순수, 불변).
 * - 정확히 5개여야 하며, 각 눈은 1~6의 정수여야 한다. 위반 시 throw.
 * - 입력 배열을 변형하지 않는다.
 */
function validateDice(dice: number[]): void {
  if (dice.length !== DICE_COUNT) {
    throw new Error(`주사위는 정확히 ${DICE_COUNT}개여야 한다(받은 개수: ${dice.length}).`);
  }
  for (const die of dice) {
    if (!Number.isInteger(die) || die < 1 || die > 6) {
      throw new Error("각 주사위 눈은 1~6의 정수여야 한다.");
    }
  }
}

/** 서로 다른 눈들 중 가장 긴 연속 구간의 길이를 구한다. */
function longestConsecutiveRun(distinctSorted: number[]): number {
  if (distinctSorted.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < distinctSorted.length; i++) {
    if (distinctSorted[i]! - distinctSorted[i - 1]! === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/**
 * 5개 주사위 한 번 굴림을 족보로 판정한다(순수·불변).
 * - 정확히 5개, 각 눈 1~6 정수가 아니면 throw. 입력 배열은 변형하지 않는다.
 * - 카테고리는 strength가 높은 것부터 검사한다.
 */
export function evaluateDiceRoll(dice: number[]): DiceRollRank {
  validateDice(dice);

  // 눈별 개수.
  const counts = new Map<number, number>();
  for (const die of dice) counts.set(die, (counts.get(die) ?? 0) + 1);
  const countValues = [...counts.values()];
  const maxCount = Math.max(...countValues);
  const pairCount = countValues.filter((c) => c === 2).length;

  // 연속 판정(서로 다른 눈 기준). 스트레이트는 눈이 모두 달라야 성립한다.
  const distinctSorted = [...counts.keys()].sort((a, b) => a - b);
  const longestRun = longestConsecutiveRun(distinctSorted);

  const sum = dice.reduce((acc, die) => acc + die, 0);

  let category: DiceCategory;
  if (maxCount === 5) {
    category = "yacht";
  } else if (maxCount === 4) {
    category = "fourOfAKind";
  } else if (maxCount === 3 && pairCount === 1) {
    category = "fullHouse";
  } else if (distinctSorted.length === 5 && longestRun === 5) {
    category = "largeStraight";
  } else if (longestRun >= 4) {
    category = "smallStraight";
  } else if (maxCount === 3) {
    category = "threeOfAKind";
  } else if (pairCount === 2) {
    category = "twoPair";
  } else if (pairCount === 1) {
    category = "onePair";
  } else {
    category = "highDice";
  }

  return { category, strength: CATEGORY_STRENGTH[category], sum };
}

/**
 * 두 굴림을 족보 강도로 비교하고, 동률이면 합으로 가린다(순수·불변).
 * 각각 evaluateDiceRoll의 검증 규칙을 따른다(위반 시 throw).
 * a 우세="a", b 우세="b", 완전 동률="draw".
 */
export function compareDiceCategory(a: number[], b: number[]): DiceOutcome {
  const ra = evaluateDiceRoll(a);
  const rb = evaluateDiceRoll(b);
  if (ra.strength !== rb.strength) return ra.strength > rb.strength ? "a" : "b";
  if (ra.sum !== rb.sum) return ra.sum > rb.sum ? "a" : "b";
  return "draw";
}
