// Application layer: orchestrates a round. Depends on domain only.
import { judge, type Hand, type RpsResult } from "../domain/rps";

/** Port: 손을 내는 플레이어의 공급원. 구현(랜덤/입력)은 infrastructure 레이어에 둔다. */
export interface HandSource {
  choose(): Hand;
}

export interface RpsRoundResult {
  a: Hand;
  b: Hand;
  result: RpsResult;
}

/** 두 플레이어의 손을 받아 한 라운드를 진행한다. */
export function playRpsRound(playerA: HandSource, playerB: HandSource): RpsRoundResult {
  const a = playerA.choose();
  const b = playerB.choose();
  return { a, b, result: judge(a, b) };
}
