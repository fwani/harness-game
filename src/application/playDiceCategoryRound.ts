// Application layer: orchestrates a single dice round judged by category (야추류).
// Depends on domain only. evaluateDiceRoll/compareDiceCategory를 재사용해 판정한다.
import {
  evaluateDiceRoll,
  compareDiceCategory,
  type DiceRollRank,
} from "../domain/diceCategory";
import type { DiceOutcome } from "../domain/dice";
import type { RandomSource } from "./dealCards";

export interface DiceCategoryRoundResult {
  /** A가 굴린 눈들 (각 1..6, 길이 diceCount) */
  a: number[];
  /** B가 굴린 눈들 (각 1..6, 길이 diceCount) */
  b: number[];
  /** A 족보 판정 결과 */
  aRank: DiceRollRank;
  /** B 족보 판정 결과 */
  bRank: DiceRollRank;
  /** "a" | "b" | "draw" — 족보(category) 기준 승자 */
  result: DiceOutcome;
}

const DEFAULT_DICE_COUNT = 5;

/**
 * 두 플레이어가 각각 diceCount개의 주사위를 rng로 굴려 족보로 승부한다(불변, 결정적).
 * 굴림 순서: A의 diceCount개 먼저, 그다음 B의 diceCount개. 각 눈은 rng.nextInt(6) + 1.
 * diceCount 기본값은 5. diceCount가 5 미만 정수이거나 정수가 아니면 throw
 * (evaluateDiceRoll이 5개 굴림을 전제로 하므로 최소 5개 보장).
 */
export function playDiceCategoryRound(
  rng: RandomSource,
  diceCount: number = DEFAULT_DICE_COUNT,
): DiceCategoryRoundResult {
  if (!Number.isInteger(diceCount) || diceCount < DEFAULT_DICE_COUNT) {
    throw new Error(
      `diceCount must be an integer >= ${DEFAULT_DICE_COUNT}, got ${diceCount}`,
    );
  }

  const roll = (): number[] => {
    const dice: number[] = [];
    for (let i = 0; i < diceCount; i++) {
      const value = rng.nextInt(6) + 1;
      if (!Number.isInteger(value) || value < 1 || value > 6) {
        throw new Error(`RandomSource produced out-of-range die value: ${value}`);
      }
      dice.push(value);
    }
    return dice;
  };

  const a = roll();
  const b = roll();
  const aRank = evaluateDiceRoll(a);
  const bRank = evaluateDiceRoll(b);
  const result = compareDiceCategory(a, b);
  return { a, b, aRank, bRank, result };
}
