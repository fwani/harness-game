// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 바둑(Go)의 단순 패(ko) 반복 금지 규칙. 한 수를 두어 포획까지 끝낸 결과가 직전 국면
// (previousBoard)을 그대로 재현하면 패 위반으로 판정한다. go.ts의 보드/착수 규칙을
// 재사용하며 재정의하지 않는다. 계가·종료·슈퍼코(전역 반복) 판정은 이 모듈 범위 밖이다.

import { placeStone, type Board, type Stone } from "./go";

/** 두 보드가 같은 크기이고 모든 칸이 동일하면 true. 크기가 다르면 false. */
export function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let y = 0; y < a.length; y += 1) {
    const rowA = a[y]!;
    const rowB = b[y]!;
    if (rowA.length !== rowB.length) {
      return false;
    }
    for (let x = 0; x < rowA.length; x += 1) {
      if (rowA[x] !== rowB[x]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 단순 패(ko) 위반 여부.
 * board에 stone을 (x,y)로 두어 포획까지 끝낸 결과가 previousBoard(직전 국면)와
 * 완전히 동일하면 패 반복 → true.
 * 해당 수가 placeStone 기준으로 불법(범위 밖/점유/자살수)이면 패 판단 대상이 아니므로
 * false를 반환한다(throw 금지). 입력 보드들은 변형하지 않는다.
 */
export function violatesKo(
  board: Board,
  x: number,
  y: number,
  stone: Stone,
  previousBoard: Board,
): boolean {
  let result: Board;
  try {
    result = placeStone(board, x, y, stone).board;
  } catch {
    // 범위 밖/점유/자살수 등 둘 수 없는 수는 패 판단 대상이 아니다.
    return false;
  }
  return boardsEqual(result, previousBoard);
}
