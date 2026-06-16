// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 바둑(Go)의 합법 수(legal moves) 열거. 빈 칸 중 placeStone이 허용하고(범위·점유·자살수 제외)
// 패(ko)를 위반하지 않는 모든 착수점을 결정적으로 모은다. 보드/착수/패 규칙은 go.ts·goKo.ts를
// 재사용하며 재정의하지 않는다. AI 선택/턴 진행/종국 판정은 이 모듈 범위 밖이다.

import { placeStone, type Board, type Stone } from "./go";
import { violatesKo } from "./goKo";

/** 착수 가능한 한 점(좌표). */
export interface GoMove {
  x: number;
  y: number;
}

/**
 * 현재 board에서 stone 색이 둘 수 있는 합법 수 전체를 열거한다(불변, 결정적).
 * - 빈 칸(null)만 후보로 본다.
 * - 그 칸에 두는 것이 placeStone 기준으로 가능해야 한다(범위 밖·점유·자살수면 제외).
 * - previousBoard가 주어지면 violatesKo가 true인 착수점은 제외한다(단순 패 금지).
 *   previousBoard가 생략되면 패 검사는 하지 않는다.
 * - 반환 순서는 결정적: y(행) 오름차순, 같은 y 내 x(열) 오름차순.
 * - 둘 수 있는 수가 없으면 빈 배열([])을 반환한다(throw 금지).
 * - 입력 board / previousBoard를 변형하지 않는다.
 */
export function legalGoMoves(
  board: Board,
  stone: Stone,
  previousBoard?: Board,
): GoMove[] {
  const moves: GoMove[] = [];
  for (let y = 0; y < board.length; y += 1) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== null) {
        continue;
      }
      // placeStone이 throw하면(점유·범위 밖·자살수) 합법 수가 아니다.
      try {
        placeStone(board, x, y, stone);
      } catch {
        continue;
      }
      // previousBoard가 있으면 단순 패(ko) 위반 점은 제외.
      if (previousBoard !== undefined && violatesKo(board, x, y, stone, previousBoard)) {
        continue;
      }
      moves.push({ x, y });
    }
  }
  return moves;
}
