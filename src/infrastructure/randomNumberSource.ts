// Infrastructure layer: adapter implementing the application port.
// Side effects (randomness) live at the edge, not in domain/application.
import type { NumberSource } from "../application/playOddEven";

export class RandomNumberSource implements NumberSource {
  constructor(private readonly max = 100) {}

  draw(): number {
    return Math.floor(Math.random() * this.max);
  }
}
