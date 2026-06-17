// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 오델로(Reversi)의 보드 모델 + 표준 초기 배치 + 한 수의 뒤집힘/합법성 계산.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts와 동일하다. 실제 착수 적용·합법 수 전체
// 열거·계가·턴 진행은 이 모듈 범위 밖이다(후속 이슈로 분리).

import type { Stone, Cell, Board } from "./gomoku";

export type { Stone, Cell, Board };

/** 표준 오델로 보드 크기(8×8). */
const REVERSI_SIZE = 8;

function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < (board[y]?.length ?? 0);
}

/** 범위 밖이면 null, 아니면 해당 칸의 값을 반환한다(throw하지 않는다). */
function cellAt(board: Board, x: number, y: number): Cell {
  if (!inBounds(board, x, y)) {
    return null;
  }
  return board[y]![x]!;
}

/** stone의 반대 색을 반환한다. */
function opponent(stone: Stone): Stone {
  return stone === "black" ? "white" : "black";
}

/**
 * 표준 8×8 오델로 보드에 중앙 4개 디스크를 초기 배치해 반환한다.
 * 중앙 배치: (3,3)=white, (4,4)=white, (3,4)=black, (4,3)=black (board[y][x] 기준).
 * - 매 호출마다 입력과 무관한 새 인스턴스를 반환한다.
 */
export function createReversiBoard(): Board {
  const board: Board = Array.from({ length: REVERSI_SIZE }, () =>
    Array.from({ length: REVERSI_SIZE }, () => null),
  );
  board[3]![3] = "white";
  board[4]![4] = "white";
  board[3]![4] = "black";
  board[4]![3] = "black";
  return board;
}

// 가로·세로·대각 8방향의 단위 방향 벡터.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`flipsForMove: ${label} must be an integer`);
  }
}

/**
 * (x,y)에 stone을 두었을 때 뒤집히는 상대 디스크들의 좌표 목록을 계산한다(순수, 결정적).
 * 8방향 각각: 인접칸부터 상대 디스크가 1개 이상 연속되고, 그 끝이 내 디스크로 막히면
 * 그 사이의 상대 디스크들이 모두 뒤집힌다. 한쪽이라도 비거나 보드 끝이면 그 방향은 무효.
 * - 대상 칸이 이미 점유돼 있으면 빈 배열(둘 수 없음).
 * - 좌표가 보드 범위를 벗어나거나 비정수면 throw(placeStone과 결을 맞춤).
 * - 입력 board를 변형하지 않는다.
 * - 반환 좌표는 결정적 순서(y asc, 그다음 x asc)로 정렬한다.
 */
export function flipsForMove(
  board: Board,
  x: number,
  y: number,
  stone: Stone,
): Array<[number, number]> {
  assertInteger(x, "x");
  assertInteger(y, "y");
  if (!inBounds(board, x, y)) {
    throw new Error("flipsForMove: coordinate out of bounds");
  }
  if (cellAt(board, x, y) !== null) {
    return [];
  }
  const foe = opponent(stone);
  const flips: Array<[number, number]> = [];
  for (const [dx, dy] of DIRECTIONS) {
    const line: Array<[number, number]> = [];
    let nx = x + dx;
    let ny = y + dy;
    // 인접칸부터 상대 디스크가 연속되는 동안 후보로 모은다.
    while (cellAt(board, nx, ny) === foe) {
      line.push([nx, ny]);
      nx += dx;
      ny += dy;
    }
    // 연속 구간이 1개 이상이고 그 끝이 내 디스크로 막히면 확정 뒤집힘.
    if (line.length > 0 && cellAt(board, nx, ny) === stone) {
      flips.push(...line);
    }
  }
  flips.sort((a, b) => (a[1] - b[1] !== 0 ? a[1] - b[1] : a[0] - b[0]));
  return flips;
}

/**
 * 합법 수 여부 = 빈 칸이며 한 방향 이상에서 뒤집힘이 발생(flipsForMove 비어있지 않음).
 * - 좌표가 보드 범위를 벗어나거나 비정수면 flipsForMove가 throw한다(동일 계약).
 */
export function isLegalReversiMove(board: Board, x: number, y: number, stone: Stone): boolean {
  return flipsForMove(board, x, y, stone).length > 0;
}
