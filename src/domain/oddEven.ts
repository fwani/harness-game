// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type Parity = "odd" | "even";

/** 정수의 홀짝을 판정한다. */
export function parityOf(n: number): Parity {
  if (!Number.isInteger(n)) {
    throw new Error("parityOf requires an integer");
  }
  return n % 2 === 0 ? "even" : "odd";
}

/** 추첨된 수가 추측한 홀짝과 일치하면 승리. */
export function isWin(guess: Parity, drawn: number): boolean {
  return parityOf(drawn) === guess;
}
