// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 오델로(Reversi)의 합법 수(legal moves) 열거. 빈 칸 중 한 방향 이상에서 뒤집힘이 발생하는
// 모든 착수점을 결정적으로 모은다. 보드/뒤집힘/합법성 규칙은 reversi.ts를 재사용하며
// 재정의하지 않는다. 패스/종료 판정·턴 진행·계가는 이 모듈 범위 밖이다.

import { isLegalReversiMove, type Board, type Stone } from "./reversi";

/** 착수 가능한 한 점(좌표). */
export interface ReversiMove {
  x: number;
  y: number;
}

/**
 * 현재 board에서 stone 색이 둘 수 있는 합법 수 전체를 열거한다(불변, 결정적).
 * - 빈 칸(null)만 후보로 본다.
 * - 그 칸이 isLegalReversiMove 기준으로 합법(한 방향 이상 뒤집힘)이어야 한다.
 * - 반환 순서는 결정적: y(행) 오름차순, 같은 y 내 x(열) 오름차순.
 * - 둘 수 있는 수가 없으면 빈 배열([])을 반환한다(throw 금지).
 * - 입력 board를 변형하지 않는다.
 */
export function legalReversiMoves(board: Board, stone: Stone): ReversiMove[] {
  const moves: ReversiMove[] = [];
  for (let y = 0; y < board.length; y += 1) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== null) {
        continue;
      }
      if (isLegalReversiMove(board, x, y, stone)) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
}

/**
 * stone 색이 둘 수 있는 합법 수가 하나라도 있으면 true(패스 판정의 토대).
 * - legalReversiMoves를 재사용한다.
 * - 입력 board를 변형하지 않는다.
 */
export function hasLegalReversiMove(board: Board, stone: Stone): boolean {
  return legalReversiMoves(board, stone).length > 0;
}
