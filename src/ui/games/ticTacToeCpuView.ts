// Presentation helper for the Tic-Tac-Toe (틱택토) vs CPU 모드. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 규칙(합법 수/승리/보드 꽉참)은
// application·domain을 재사용하며 여기서 재구현하지 않는다(gomokuCpuView.ts와 동일 패턴).
import type { Board } from "../../domain/ticTacToe";
import { findTicTacToeWinner } from "../../domain/ticTacToe";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomTicTacToeMove } from "../../application/playTicTacToe";

/** CPU가 둘 한 수의 좌표(행 우선). */
export interface TicTacToeMove {
  row: number;
  col: number;
}

/**
 * vs CPU 모드에서 CPU(O)가 둘 한 수를 고른다.
 * - 이미 승부가 났으면(domain findTicTacToeWinner) null을 반환한다(둘 수 없음, throw 하지 않는다).
 * - 그 외에는 chooseRandomTicTacToeMove로 빈 칸 하나를 균등 선택해 반환한다.
 *   보드가 가득 차 합법 수가 없으면 chooseRandomTicTacToeMove가 null을 돌려준다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuTicTacToeMove(board: Board, rng: RandomSource): TicTacToeMove | null {
  if (findTicTacToeWinner(board) !== null) {
    return null;
  }
  return chooseRandomTicTacToeMove(board, rng);
}
