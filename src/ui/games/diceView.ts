// Presentation helpers for the Dice (주사위) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 합계/승패 규칙은
// domain(sumDice/compareDiceRolls)·application(playDiceRound)을 재사용하며 여기서 재구현하지 않는다.
import type { DiceOutcome } from "../../domain/dice";

/** 주사위 눈(1..6)을 유니코드 주사위 면으로 매핑한다. 범위를 벗어나면 throw. */
const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"] as const;

export function dieFace(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`dieFace requires an integer in 1..6, got ${value}`);
  }
  return DIE_FACES[value - 1]!;
}

/** 주사위 한 판 결과를 화면용 라벨로 만든다: a=승리, b=패배, draw=무승부. */
export function diceOutcomeLabel(result: DiceOutcome): string {
  if (result === "a") return "🎉 승리!";
  if (result === "b") return "😢 패배";
  return "🤝 무승부";
}
