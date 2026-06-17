// Presentation helper for the Checkers (체커) vs CPU mode. Pure & deterministic (난수 외) —
// keeps the React component thin and lets us unit-test the CPU decision without a DOM.
// 합법 수 선택 규칙은 application(chooseRandomCheckersMove)을 재사용하고, 멀티 점프 연속 중에는
// 같은 기물로만 이어가야 하므로 domain 합법 수에서 그 기물의 수만 추려(legalDestinations) 무작위로 고른다.
// reversiCpuView/connectFourCpuView와 동일한 패턴(난수는 RandomSource로 주입).
import type {
  CheckersBoard,
  CheckersColor,
  CheckersCoord,
  CheckersMove,
} from "../../domain/checkers";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomCheckersMove } from "../../application/playCheckers";
import { legalDestinations } from "./checkersView";

/**
 * CPU(color)가 둘 한 수를 고른다. 둘 곳이 없으면 null(이미 승부가 났거나 스테일메이트).
 * - 멀티 점프 연속 중(continuingFrom 제공)에는 그 기물의 다음 점프만 후보로 두어 같은 기물 제한을 지킨다.
 * - 그 외에는 chooseRandomCheckersMove(application)로 전체 합법 수 중 무작위 선택(강제 점프 반영됨).
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuCheckersMove(
  board: CheckersBoard,
  color: CheckersColor,
  rng: RandomSource,
  continuingFrom?: CheckersCoord,
): CheckersMove | null {
  if (continuingFrom !== undefined) {
    // 연속은 "점프를 이어가는" 것이므로 그 기물의 점프 수만 후보로 둔다(단순 이동은 제외).
    const moves = legalDestinations(board, continuingFrom, color).filter(
      (m) => m.captured !== undefined,
    );
    if (moves.length === 0) {
      return null;
    }
    const idx = rng.nextInt(moves.length);
    if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
      throw new Error(`RandomSource returned out-of-range index: ${idx}`);
    }
    return moves[idx]!;
  }
  return chooseRandomCheckersMove(board, color, rng);
}
