// Presentation helper for the Chess (체스) vs CPU 모드. 순수·결정적 함수만 둔다(난수 외) —
// React 컴포넌트를 얇게 유지하고 DOM 없이 CPU 선택을 단위 테스트할 수 있게 한다. 규칙(합법 수
// 열거·종료 판정)은 application(chessAi/playChess)을 재사용하며 여기서 재구현하지 않는다.
// gomokuCpuView/reversiCpuView와 동일한 패턴.
import { chooseRandomChessMove } from "../../application/chessAi";
import type { ChessGameState, Square } from "../../application/playChess";
import type { RandomSource } from "../../application/dealCards";

/**
 * vs CPU 모드에서 CPU가 둘 한 수(from→to)를 고른다.
 * - 이미 종료된 상태(state.finished)면 null(둘 수 없음)을 반환한다(throw 하지 않는다).
 * - 그 외에는 chooseRandomChessMove로 합법 수 하나를 균등 선택해 반환한다.
 * - 입력 state를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuChessMove(
  state: ChessGameState,
  rng: RandomSource,
): { from: Square; to: Square } | null {
  if (state.finished) {
    return null;
  }
  return chooseRandomChessMove(state, rng);
}
