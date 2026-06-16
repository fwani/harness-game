// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type Stone = "black" | "white";

export type Cell = Stone | null;

/** 행 우선(row-major) 2차원 보드. 접근은 board[y][x]. */
export type Board = Cell[][];

/** size×size 빈 보드를 만든다. size가 정수가 아니거나 1 미만이면 throw. */
export function createBoard(size = 15): Board {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("createBoard requires an integer size >= 1");
  }
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < board.length;
}

/** 범위 밖이면 null, 아니면 해당 칸의 값을 반환한다. */
function cellAt(board: Board, x: number, y: number): Cell {
  if (!inBounds(board, x, y)) {
    return null;
  }
  return board[y]![x]!;
}

/**
 * (x,y)에 돌을 놓은 새 보드를 반환한다(불변: 입력 보드는 변형하지 않는다).
 * 좌표가 범위를 벗어나거나 이미 돌이 있으면 throw.
 */
export function placeStone(board: Board, x: number, y: number, stone: Stone): Board {
  if (!inBounds(board, x, y)) {
    throw new Error("placeStone: coordinate out of bounds");
  }
  if (cellAt(board, x, y) !== null) {
    throw new Error("placeStone: cell already occupied");
  }
  return board.map((row, rowY) =>
    rowY === y ? row.map((cell, colX) => (colX === x ? stone : cell)) : row.slice(),
  );
}

// 가로, 세로, 두 대각선의 단위 방향 벡터.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/**
 * 방금 둔 (x,y)를 기준으로 4방향 중 같은 색 돌이 5개 이상 연속이면 그 색을 반환, 아니면 null.
 * (x,y)가 범위를 벗어나거나 빈 칸이면 일관되게 null을 반환한다(throw하지 않는다).
 */
export function checkWin(board: Board, x: number, y: number): Stone | null {
  const stone = cellAt(board, x, y);
  if (stone === null) {
    return null;
  }
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    // 한 방향과 그 반대 방향으로 연속 개수를 센다.
    for (const sign of [1, -1]) {
      let nx = x + dx * sign;
      let ny = y + dy * sign;
      while (cellAt(board, nx, ny) === stone) {
        count += 1;
        nx += dx * sign;
        ny += dy * sign;
      }
    }
    if (count >= 5) {
      return stone;
    }
  }
  return null;
}
