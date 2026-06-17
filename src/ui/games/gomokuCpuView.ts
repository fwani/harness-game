// Presentation helper for the Gomoku (오목) vs CPU 모드. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 규칙(합법 수/5목 승리/보드 꽉참)은
// application·domain을 재사용하며 여기서 재구현하지 않는다.
import type { Board } from "../../domain/gomoku";
import { checkWin, isBoardFull } from "../../domain/gomoku";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomGomokuMove, type GomokuMove } from "../../application/gomokuAi";

/**
 * 보드에 이미 5목 승자가 있으면 true. 마지막으로 둔 칸을 알 수 없으므로 놓인 돌마다
 * domain checkWin으로 검사한다(불변·결정적, 승리 판정은 재구현하지 않는다).
 */
function hasWinner(board: Board): boolean {
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== null && checkWin(board, x, y) !== null) {
        return true;
      }
    }
  }
  return false;
}

/**
 * vs CPU 모드에서 CPU가 둘 한 수를 고른다.
 * - 이미 승부가 났거나(5목) 빈 칸이 없으면 null(둘 수 없음)을 반환한다(throw 하지 않는다).
 * - 그 외에는 chooseRandomGomokuMove로 합법(빈) 좌표 하나를 균등 선택해 반환한다.
 * - 입력 board를 변형하지 않는다(불변, 결정적).
 */
export function chooseCpuGomokuMove(board: Board, rng: RandomSource): GomokuMove | null {
  if (isBoardFull(board) || hasWinner(board)) {
    return null;
  }
  return chooseRandomGomokuMove(board, rng);
}
