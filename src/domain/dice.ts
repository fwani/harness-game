// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type DiceOutcome = "a" | "b" | "draw";

/**
 * 주사위 눈들의 합을 구한다(순수).
 * - 빈 배열이면 throw(최소 1개 필요).
 * - 각 눈은 1~6의 정수여야 한다. 범위를 벗어나거나 정수가 아니면 throw.
 */
export function sumDice(dice: number[]): number {
  if (dice.length === 0) {
    throw new Error("sumDice requires at least one die");
  }
  let total = 0;
  for (const die of dice) {
    if (!Number.isInteger(die) || die < 1 || die > 6) {
      throw new Error("sumDice requires each die to be an integer in 1..6");
    }
    total += die;
  }
  return total;
}

/**
 * 두 플레이어 a, b의 주사위 굴림을 합 기준으로 비교한다(순수).
 * 입력 배열을 변형하지 않는다. 각각 sumDice 검증 규칙을 따른다.
 * a 합이 크면 "a", b 합이 크면 "b", 같으면 "draw".
 */
export function compareDiceRolls(a: number[], b: number[]): DiceOutcome {
  const sumA = sumDice(a);
  const sumB = sumDice(b);
  if (sumA > sumB) return "a";
  if (sumA < sumB) return "b";
  return "draw";
}
