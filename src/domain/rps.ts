// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type Hand = "rock" | "paper" | "scissors";

export type RpsResult = "a-win" | "b-win" | "draw";

/** a가 이기는 상대 손: rock > scissors, scissors > paper, paper > rock. */
const BEATS: Record<Hand, Hand> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

/** a 기준으로 가위바위보 승패를 판정한다. 같은 손이면 draw. */
export function judge(a: Hand, b: Hand): RpsResult {
  if (a === b) {
    return "draw";
  }
  return BEATS[a] === b ? "a-win" : "b-win";
}
