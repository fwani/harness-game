// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 커넥트포(사목, Connect Four)의 보드 모델 + 중력 낙하 착수 + 4목 승리/무승부 판정.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts / reversi.ts와 동일하다(board[row][col]).
// 무작위 수 선택·턴 진행·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 1=선(먼저 두는 쪽), 2=후. */
export type Player = 1 | 2;

/** 0=빈 칸, 그 외 점유한 플레이어. */
export type Cell = 0 | Player;

/** 행 우선(row-major) 보드. 접근은 board[row][col]. row 0 = 최상단. */
export type Board = Cell[][];

/** 표준 커넥트포 크기: 7열(가로) × 6행(세로). */
const COLS = 7;
const ROWS = 6;

/** 승리에 필요한 연속 개수. */
const CONNECT = 4;

/** 빈 7×6 보드를 새로 생성한다(모든 칸 0). 매 호출마다 새 인스턴스를 반환한다. */
export function createConnectFourBoard(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0 as Cell));
}

function rowCount(board: Board): number {
  return board.length;
}

function colCount(board: Board): number {
  return board[0]?.length ?? 0;
}

function inBounds(board: Board, row: number, col: number): boolean {
  return row >= 0 && row < rowCount(board) && col >= 0 && col < colCount(board);
}

function isColInRange(board: Board, col: number): boolean {
  return Number.isInteger(col) && col >= 0 && col < colCount(board);
}

/**
 * 해당 열이 가득 찼는지 여부(최상단 행이 점유됨).
 * 범위 밖(비정수 포함)이거나 빈 보드면 true로 취급한다(둘 수 없음).
 */
export function isColumnFull(board: Board, col: number): boolean {
  if (!isColInRange(board, col) || rowCount(board) === 0) {
    return true;
  }
  return board[0]![col] !== 0;
}

/**
 * 해당 열에 디스크가 떨어질 가장 아래의 빈 행 인덱스를 반환한다.
 * 가득 찼거나 범위 밖(비정수 포함)이면 null.
 * - 입력 board를 변형하지 않는다.
 */
export function lowestEmptyRow(board: Board, col: number): number | null {
  if (!isColInRange(board, col)) {
    return null;
  }
  for (let row = rowCount(board) - 1; row >= 0; row -= 1) {
    if (board[row]![col] === 0) {
      return row;
    }
  }
  return null;
}

/** 현재 둘 수 있는 열 인덱스 목록(가득 차지 않은 열). 좌→우 오름차순. */
export function legalColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < colCount(board); col += 1) {
    if (!isColumnFull(board, col)) {
      cols.push(col);
    }
  }
  return cols;
}

function isPlayer(value: number): value is Player {
  return value === 1 || value === 2;
}

/**
 * player가 col에 디스크를 떨어뜨린 결과 보드를 새로 반환한다(입력 보드 불변).
 * 중력에 따라 가장 아래 빈 행에 놓인다.
 * - 열이 가득 찼거나 범위 밖(비정수 포함)이면, 또는 player 값이 1/2가 아니면 둘 수 없으므로 null.
 */
export function dropDisc(board: Board, col: number, player: Player): Board | null {
  if (!isPlayer(player)) {
    return null;
  }
  const row = lowestEmptyRow(board, col);
  if (row === null) {
    return null;
  }
  const next: Board = board.map((r) => r.slice());
  next[row]![col] = player;
  return next;
}

// 가로, 세로, 두 대각선(↘, ↗)의 단위 방향 벡터. [dCol, dRow].
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], // 가로 →
  [0, 1], // 세로 ↓
  [1, 1], // 대각 ↘
  [1, -1], // 대각 ↗
];

function cellAt(board: Board, row: number, col: number): Cell {
  if (!inBounds(board, row, col)) {
    return 0;
  }
  return board[row]![col]!;
}

/**
 * 가로/세로/대각(↗↘) 4목을 만든 승자를 반환한다. 없으면 null.
 * - 입력 board를 변형하지 않는다. 빈 보드/불규칙 보드도 안전하게 처리한다.
 * - 두 색이 동시에 4목이면(비정상 상태) 먼저 발견된 칸의 색을 반환한다.
 */
export function findConnectFourWinner(board: Board): Player | null {
  for (let row = 0; row < rowCount(board); row += 1) {
    for (let col = 0; col < (board[row]?.length ?? 0); col += 1) {
      const cell = board[row]![col]!;
      if (cell === 0) {
        continue;
      }
      for (const [dCol, dRow] of DIRECTIONS) {
        let count = 1;
        let nc = col + dCol;
        let nr = row + dRow;
        while (cellAt(board, nr, nc) === cell) {
          count += 1;
          if (count >= CONNECT) {
            return cell;
          }
          nc += dCol;
          nr += dRow;
        }
      }
    }
  }
  return null;
}

/**
 * 보드가 가득 찼고(빈 칸 0개) 승자가 없으면 무승부.
 * - 빈 칸이 하나라도 있으면 false. 승자가 있으면 false.
 */
export function isConnectFourDraw(board: Board): boolean {
  if (rowCount(board) === 0) {
    return false;
  }
  const full = board.every((row) => row.every((cell) => cell !== 0));
  if (!full) {
    return false;
  }
  return findConnectFourWinner(board) === null;
}
