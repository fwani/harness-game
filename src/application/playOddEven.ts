// Application layer: orchestrates a round. Depends on domain only.
import { isWin, type Parity } from "../domain/oddEven";

/** Port: 추첨 수의 공급원. 구현은 infrastructure 레이어에 둔다. */
export interface NumberSource {
  draw(): number;
}

export interface RoundResult {
  guess: Parity;
  drawn: number;
  won: boolean;
}

/** 한 라운드를 진행한다. */
export function playRound(guess: Parity, source: NumberSource): RoundResult {
  const drawn = source.draw();
  return { guess, drawn, won: isWin(guess, drawn) };
}
