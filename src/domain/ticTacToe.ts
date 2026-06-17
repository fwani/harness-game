// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 틱택토(3목, Tic-Tac-Toe)의 3×3 보드 모델 + 착수 + 가로/세로/대각 승리·무승부 판정.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts / connectFour.ts / minesweeper.ts와 동일하다(board[row][col]).
// 무작위 수 선택·턴 진행·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 두 플레이어의 마크. */
export type Mark = "X" | "O";

/** 빈 칸(null) 또는 점유한 마크. */
export type Cell = Mark | null;

/** 행 우선(row-major) 3×3 보드. 접근은 board[row][col]. row 0 = 최상단. */
export type Board = Cell[][];

/** 표준 틱택토 크기: 3×3. */
const SIZE = 3;

/** 모든 칸이 null인 3×3 보드를 새로 생성한다. 매 호출마다 새 인스턴스를 반환한다. */
export function createTicTacToeBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null as Cell));
}

function inBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < SIZE &&
    col >= 0 &&
    col < SIZE
  );
}

/**
 * (row,col)에 mark를 둔 새 보드를 반환한다(불변: 입력 보드는 변형하지 않는다).
 * 좌표가 범위를 벗어나거나(비정수 포함) 이미 채워진 칸이면 사유 포함 throw(불법 착수).
 */
export function applyTicTacToeMove(board: Board, row: number, col: number, mark: Mark): Board {
  if (!inBounds(row, col)) {
    throw new Error("applyTicTacToeMove: coordinate out of bounds");
  }
  if (board[row]![col] !== null) {
    throw new Error("applyTicTacToeMove: cell already occupied");
  }
  return board.map((r, rowIdx) =>
    rowIdx === row ? r.map((cell, colIdx) => (colIdx === col ? mark : cell)) : r.slice(),
  );
}

// 8개 승리 라인(가로 3·세로 3·대각 2). 각 라인은 [row, col] 좌표 3개.
const LINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  // 가로
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  // 세로
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  // 대각
  [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
];

/**
 * 8개 라인 중 같은 마크로 채워진 라인이 있으면 그 마크를 반환, 없으면 null.
 * - 입력 board를 변형하지 않는다.
 */
export function findTicTacToeWinner(board: Board): Mark | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const first = board[a![0]]?.[a![1]] ?? null;
    if (first === null) {
      continue;
    }
    if (first === board[b![0]]?.[b![1]] && first === board[c![0]]?.[c![1]]) {
      return first;
    }
  }
  return null;
}

/**
 * 보드가 가득 찼고(빈 칸 0개) 승자가 없으면 무승부.
 * - 빈 칸이 하나라도 있으면 false. 승자가 있으면 false.
 */
export function isTicTacToeDraw(board: Board): boolean {
  const full = board.every((row) => row.every((cell) => cell !== null));
  if (!full) {
    return false;
  }
  return findTicTacToeWinner(board) === null;
}
