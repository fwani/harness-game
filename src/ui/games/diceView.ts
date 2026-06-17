// Presentation helpers for the Dice (주사위) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 합계/승패 규칙은
// domain(sumDice/compareDiceRolls)·application(playDiceRound)을 재사용하며 여기서 재구현하지 않는다.
import type { DiceOutcome } from "../../domain/dice";
import type { DiceCategory, DiceRollRank } from "../../domain/diceCategory";

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

/** 주사위 족보(category)를 화면용 한국어 이름으로 매핑한다. 판정 규칙은 domain(evaluateDiceRoll)에서 온다. */
const CATEGORY_LABELS: Record<DiceCategory, string> = {
  yacht: "야추",
  fourOfAKind: "포카드",
  fullHouse: "풀하우스",
  largeStraight: "라지 스트레이트",
  smallStraight: "스몰 스트레이트",
  threeOfAKind: "트리플",
  twoPair: "투페어",
  onePair: "원페어",
  highDice: "노페어",
};

/** 족보 판정 결과를 한국어 족보 이름으로 변환한다(예: yacht → "야추"). */
export function formatDiceCategory(rank: DiceRollRank): string {
  const label = CATEGORY_LABELS[rank.category];
  if (label === undefined) {
    throw new Error(`unknown dice category: ${rank.category}`);
  }
  return label;
}
