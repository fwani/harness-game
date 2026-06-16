// Application layer: orchestrates a single dice round (two players). Depends on domain only.
import { compareDiceRolls, type DiceOutcome } from "../domain/dice";
import type { RandomSource } from "./dealCards";

export interface DiceRoundResult {
  /** 플레이어 A가 굴린 눈들 (각 1..6, 길이 diceCount) */
  a: number[];
  /** 플레이어 B가 굴린 눈들 (각 1..6, 길이 diceCount) */
  b: number[];
  /** "a" = A 승, "b" = B 승, "draw" = 무승부 */
  result: DiceOutcome;
}

/**
 * 두 플레이어가 각각 diceCount개의 주사위를 rng로 굴려 합으로 승자를 가린다(불변, 결정적).
 * diceCount는 1 이상 정수여야 하며, 아니면 throw.
 * 굴림 순서: A의 주사위 diceCount개를 먼저, 그다음 B의 diceCount개.
 * 각 눈은 rng.nextInt(6) + 1 로 1..6 정수를 만든다.
 */
export function playDiceRound(
  diceCount: number,
  rng: RandomSource,
): DiceRoundResult {
  if (!Number.isInteger(diceCount) || diceCount < 1) {
    throw new Error(`diceCount must be an integer >= 1, got ${diceCount}`);
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
  const result = compareDiceRolls(a, b);
  return { a, b, result };
}
