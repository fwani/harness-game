// Presentation helper for the Reversi (오델로) vs CPU mode. Pure & deterministic (난수 외) —
// keeps the React component thin and lets us unit-test the CPU decision without a DOM.
// 합법 수 존재 판정/무작위 합법 수 선택 규칙은 domain(reversiMoves) / application(reversiAi)을
// 재사용하며 여기서 재구현하지 않는다. 자동 패스/턴 진행/계가는 이 모듈 범위 밖이다.
import type { Board, Stone } from "../../domain/reversi";
import { hasLegalReversiMove } from "../../domain/reversiMoves";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomReversiMove } from "../../application/reversiAi";

/**
 * CPU(stone)가 둘 수 있으면 둘 좌표를, 둘 곳이 없으면(자동 패스 대상) null을 반환한다.
 * - chooseRandomReversiMove는 합법 수가 없으면 throw 하므로, 먼저 hasLegalReversiMove로
 *   둘 곳이 있는지 확인하고 없으면 throw 하지 않고 null을 반환한다(자동 패스는
 *   applyReversiTurn 오케스트레이터가 처리).
 * - 둘 곳이 있으면 chooseRandomReversiMove(board, stone, rng)로 무작위 합법 수를 고른다.
 *   반환 좌표는 항상 해당 색이 실제로 둘 수 있는 합법 수다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuReversiMove(
  board: Board,
  stone: Stone,
  rng: RandomSource,
): { x: number; y: number } | null {
  if (!hasLegalReversiMove(board, stone)) {
    return null;
  }
  const move = chooseRandomReversiMove(board, stone, rng);
  return { x: move.x, y: move.y };
}
