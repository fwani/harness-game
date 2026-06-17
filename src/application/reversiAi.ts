// Application layer: 오델로(Reversi) AI 무작위 합법 수 선택 헬퍼. domain 규칙과
// RandomSource 포트에만 의존한다. infrastructure는 import 하지 않는다(난수는 주입).
// gomokuAi.ts / goAi.ts와 동일한 패턴: 도메인의 합법 수 열거를 재사용하고 난수는 주입받는다.
import type { Board, Stone } from "../domain/reversi";
import { legalReversiMoves, type ReversiMove } from "../domain/reversiMoves";
import type { RandomSource } from "./dealCards";

/**
 * 현재 board에서 stone 색이 둘 수 있는 합법 수 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수 목록은 도메인 legalReversiMoves(board, stone)로 구한다(재구현 금지).
 *   반환 순서는 도메인 함수 순서(y 오름차순, 같은 y 내 x 오름차순)를 그대로 사용한다.
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 합법 수가 하나도 없으면(해당 색이 둘 곳 없음) throw 한다. 자동 패스 처리는
 *   진행 오케스트레이터 책임이며 이 헬퍼 범위 밖이다.
 * - rng.nextInt가 정수가 아니거나 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomReversiMove(
  board: Board,
  stone: Stone,
  rng: RandomSource,
): ReversiMove {
  const moves = legalReversiMoves(board, stone);
  if (moves.length === 0) {
    throw new Error("chooseRandomReversiMove: no legal moves available");
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}
