// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 장기(Janggi)의 토대가 되는 보드 모델과 표준 초기 배치. 기물 이동/포획/장군·외통
// 판정·상마 교체(차림) 변형 배치는 이 모듈 범위 밖이다(별도 이슈).

export type Side = "cho" | "han";

export type PieceType =
  | "general"
  | "guard"
  | "elephant"
  | "horse"
  | "chariot"
  | "cannon"
  | "soldier";

export interface Piece {
  side: Side;
  type: PieceType;
}

export type Cell = Piece | null;

/** 행 우선(row-major) 보드. board[y][x]. y: 0..9, x: 0..8. */
export type Board = Cell[][];

/** 장기 보드 너비(가로 9칸). */
export const WIDTH = 9;
/** 장기 보드 높이(세로 10칸). */
export const HEIGHT = 10;

/**
 * 좌표 규약:
 * - `han` 진영은 위쪽(y가 작은 쪽)에 둔다. 1선(back rank)은 y=0, 궁성은 y=0..2, 장은 (4,1).
 * - `cho` 진영은 아래쪽(y가 큰 쪽)에 둔다. 1선(back rank)은 y=9, 궁성은 y=7..9, 장은 (4,8).
 * - 두 진영은 보드 중앙선(y=4.5)을 기준으로 상하 대칭으로 배치된다.
 */

/** 9×10 빈 보드(모든 칸 null)를 만든다. */
export function createEmptyBoard(): Board {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => null as Cell),
  );
}

// 1선(back rank)의 x=0..8 기물 배치. 차/마/상/사/(장은 궁성)/사/상/마/차.
// x=4 자리는 비운다(장은 궁성 중앙에 따로 배치).
const BACK_RANK: ReadonlyArray<PieceType | null> = [
  "chariot",
  "horse",
  "elephant",
  "guard",
  null,
  "guard",
  "elephant",
  "horse",
  "chariot",
];

// 졸·병이 놓이는 열(x=0,2,4,6,8).
const SOLDIER_COLUMNS: ReadonlyArray<number> = [0, 2, 4, 6, 8];

// 포(cannon)가 놓이는 열(x=1,7).
const CANNON_COLUMNS: ReadonlyArray<number> = [1, 7];

// 한 진영의 기물을 보드에 배치한다(입력 보드를 직접 갱신; 호출부에서 복제본을 넘긴다).
// backRankY: 1선 y, generalY: 장 y, cannonY: 포 y, soldierY: 졸·병 y.
function placeSide(
  board: Board,
  side: Side,
  backRankY: number,
  generalY: number,
  cannonY: number,
  soldierY: number,
): void {
  BACK_RANK.forEach((type, x) => {
    if (type !== null) {
      board[backRankY]![x] = { side, type };
    }
  });
  board[generalY]![4] = { side, type: "general" };
  for (const x of CANNON_COLUMNS) {
    board[cannonY]![x] = { side, type: "cannon" };
  }
  for (const x of SOLDIER_COLUMNS) {
    board[soldierY]![x] = { side, type: "soldier" };
  }
}

/**
 * 표준 차림으로 모든 기물이 배치된 새 보드를 반환한다(불변).
 * 진영당 16개(장1·사2·상2·마2·차2·포2·졸5), 합 32개.
 * - han(위): 1선 y=0, 장 (4,1), 포 y=2, 병 y=3.
 * - cho(아래): 1선 y=9, 장 (4,8), 포 y=7, 졸 y=6.
 * (상마 교체 등 변형 차림은 이 이슈 범위 밖 — 한 가지 표준 배치만 구현한다.)
 */
export function createInitialBoard(): Board {
  const board = createEmptyBoard();
  // han: 위쪽. 1선 y=0, 궁성 y=0..2 중앙 장 (4,1), 포 y=2, 병 y=3.
  placeSide(board, "han", 0, 1, 2, 3);
  // cho: 아래쪽. 1선 y=9, 궁성 y=7..9 중앙 장 (4,8), 포 y=7, 졸 y=6.
  placeSide(board, "cho", 9, 8, 7, 6);
  return board;
}

/** (x,y)가 보드 범위(0<=x<9, 0<=y<10) 안인지. */
export function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < (board[y]?.length ?? 0);
}

/** 범위 밖이면 null, 아니면 해당 칸의 기물(또는 null)을 반환한다(throw하지 않는다). */
export function pieceAt(board: Board, x: number, y: number): Cell {
  if (!inBounds(board, x, y)) {
    return null;
  }
  return board[y]![x]!;
}
