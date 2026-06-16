// Infrastructure layer: adapter implementing the application HandSource port.
// 난수(부수효과)는 가장자리에서만 발생한다.
import type { HandSource } from "../application/playRps";
import type { Hand } from "../domain/rps";
import { MathRandomSource } from "./mathRandomSource";

const HANDS: readonly Hand[] = ["rock", "paper", "scissors"];

export class RandomHandSource implements HandSource {
  private readonly rng = new MathRandomSource();
  choose(): Hand {
    return HANDS[this.rng.nextInt(HANDS.length)]!;
  }
}
