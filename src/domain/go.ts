// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 바둑(Go)의 착수 + 활로(liberty) 기반 돌 포획 규칙. 오목(gomoku.ts)과 포획 의미가
// 달라 별도 모듈로 둔다. 패(ko)·계가·종료 판정은 이 모듈 범위 밖이다.

export type Stone = "black" | "white";

export type Cell = Stone | null;

/** 행 우선(row-major) 2차원 보드. 접근은 board[y][x]. */
export type Board = Cell[][];

/** size×size 빈 보드를 만든다. 기본 19. size가 정수가 아니거나 1 미만이면 throw. */
export function createBoard(size = 19): Board {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("createBoard requires an integer size >= 1");
  }
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < board.length;
}

/** 범위 밖이면 null, 아니면 해당 칸의 값을 반환한다(throw하지 않는다). */
function cellAt(board: Board, x: number, y: number): Cell {
  if (!inBounds(board, x, y)) {
    return null;
  }
  return board[y]![x]!;
}

// 상하좌우 4방향 인접(대각선 제외).
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// 같은 색으로 4방향 연결된 그룹과 그 그룹의 활로(빈 인접칸) 개수를 구한다.
// stones: 그룹에 속한 돌들의 "x,y" 키 집합, liberties: 활로 칸의 "x,y" 키 집합.
function collectGroup(
  board: Board,
  x: number,
  y: number,
): { stones: Set<string>; liberties: Set<string> } {
  const color = cellAt(board, x, y);
  const stones = new Set<string>();
  const liberties = new Set<string>();
  if (color === null) {
    return { stones, liberties };
  }
  const stack: Array<[number, number]> = [[x, y]];
  stones.add(`${x},${y}`);
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(board, nx, ny)) {
        continue;
      }
      const key = `${nx},${ny}`;
      const cell = cellAt(board, nx, ny);
      if (cell === null) {
        liberties.add(key);
      } else if (cell === color && !stones.has(key)) {
        stones.add(key);
        stack.push([nx, ny]);
      }
    }
  }
  return { stones, liberties };
}

/**
 * (x,y)에 stone을 둔 새 보드를 반환한다(불변: 입력 보드는 변형하지 않는다).
 * 착수 순서:
 *   ① 해당 칸에 돌 배치
 *   ② 인접한 '상대' 그룹 중 활로가 0인 그룹을 모두 제거(포획)
 *   ③ 포획 후에도 자기 그룹의 활로가 0이면 자살수 → throw(보드 변형 없음)
 * 좌표가 범위를 벗어나거나 이미 돌이 있으면 throw.
 * @returns { board: 갱신된 보드, captured: 포획한 상대 돌 개수 }
 */
export function placeStone(
  board: Board,
  x: number,
  y: number,
  stone: Stone,
): { board: Board; captured: number } {
  if (!inBounds(board, x, y)) {
    throw new Error("placeStone: coordinate out of bounds");
  }
  if (cellAt(board, x, y) !== null) {
    throw new Error("placeStone: cell already occupied");
  }

  // ① 입력 보드를 복제한 뒤 돌을 배치한다(원본 불변).
  const next: Board = board.map((row) => row.slice());
  next[y]![x] = stone;

  const opponent: Stone = stone === "black" ? "white" : "black";

  // ② 방금 둔 돌과 인접한 상대 그룹 중 활로 0인 그룹을 제거한다.
  let captured = 0;
  const removed = new Set<string>();
  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (cellAt(next, nx, ny) !== opponent) {
      continue;
    }
    const key = `${nx},${ny}`;
    if (removed.has(key)) {
      continue;
    }
    const group = collectGroup(next, nx, ny);
    if (group.liberties.size === 0) {
      for (const stoneKey of group.stones) {
        const [sx, sy] = stoneKey.split(",").map(Number) as [number, number];
        next[sy]![sx] = null;
        removed.add(stoneKey);
        captured += 1;
      }
    }
  }

  // ③ 포획 후 자기 그룹의 활로가 0이면 자살수.
  const self = collectGroup(next, x, y);
  if (self.liberties.size === 0) {
    throw new Error("placeStone: suicide move is not allowed");
  }

  return { board: next, captured };
}
