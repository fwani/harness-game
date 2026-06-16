// Infrastructure layer: adapter implementing the application port.
// Side effects (randomness) live at the edge, not in domain/application.
import type { RandomSource } from "../application/dealCards";

export class MathRandomSource implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
      throw new Error(
        `maxExclusive must be an integer >= 1, got ${maxExclusive}`,
      );
    }
    return Math.floor(Math.random() * maxExclusive);
  }
}
