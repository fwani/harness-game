// Presentation helper for the Connect Four(커넥트포·사목) vs CPU 모드. 순수·결정적(난수 외)
// 함수만 둔다 — React 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다.
// 합법 열 열거/무작위 선택 규칙은 domain(legalColumns)·application(chooseRandomConnectFourColumn)을
// 재사용하며 여기서 재구현하지 않는다. gomokuCpuView.ts / reversiCpuView.ts와 동일한 패턴이다.
import type { Board } from "../../domain/connectFour";
import { findConnectFourWinner } from "../../domain/connectFour";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomConnectFourColumn } from "../../application/playConnectFour";

/**
 * vs CPU 모드에서 CPU가 디스크를 떨어뜨릴 열을 고른다.
 * - 이미 4목 승자가 있거나 둘 곳(가득 차지 않은 열)이 하나도 없으면 null을 반환한다
 *   (throw 하지 않는다). 호출부는 null이면 무승부/종료로 처리한다.
 * - 그 외에는 chooseRandomConnectFourColumn으로 합법 열 하나를 균등 선택해 반환한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuConnectFourColumn(board: Board, rng: RandomSource): number | null {
  if (findConnectFourWinner(board) !== null) {
    return null;
  }
  return chooseRandomConnectFourColumn(board, rng);
}
