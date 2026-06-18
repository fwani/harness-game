// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 지뢰찾기(Minesweeper)의 보드 모델 + 칸 공개(reveal)·연쇄 공개(flood fill) + 깃발 토글 + 승패 판정.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts / reversi.ts / connectFour.ts와 동일하다(board[row][col]).
// 무작위 지뢰 배치(RandomSource 주입)·한 판 진행·UI 연동은 이 모듈 범위 밖이다(application/playMinesweeper, src/ui).

/** 한 칸의 상태: 지뢰 여부 + 공개/미공개 + 깃발 표시 + 인접 지뢰 수(0~8). */
export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean; // 지뢰 의심 표시(깃발). 공개된 칸엔 깃발을 꽂지 않는다.
  adjacent: number; // 인접 지뢰 수 0~8
}

/** 행 우선(row-major) 보드. 접근은 board[row][col]. row 0 = 최상단. */
export type Board = Cell[][];

// 8방향 이웃의 단위 방향 벡터. [dRow, dCol].
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function rowCount(board: Board): number {
  return board.length;
}

function colCount(board: Board): number {
  return board[0]?.length ?? 0;
}

function inBounds(board: Board, row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < rowCount(board) &&
    col >= 0 &&
    col < (board[row]?.length ?? 0)
  );
}

/** 보드를 깊은 복사한다(각 셀 객체까지 새로). 입력 board를 변형하지 않기 위해 사용. */
function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * rows×cols 보드를 지뢰 좌표 목록으로 결정적으로 생성한다(모든 칸 미공개).
 * 각 칸의 adjacent(인접 지뢰 수 0~8)를 미리 계산해 채운다.
 * - 비정상 크기(정수 아님, 0 이하)이면 빈 보드([])를 반환한다.
 * - 범위 밖/비정수 지뢰 좌표는 안전하게 무시한다. 중복 좌표는 한 칸으로 합쳐진다(멱등).
 * - 매 호출마다 새 인스턴스를 반환한다(불변).
 */
export function createMinefield(
  rows: number,
  cols: number,
  mines: ReadonlyArray<readonly [number, number]>,
): Board {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    return [];
  }
  const board: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  );

  for (const [r, c] of mines) {
    if (Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < rows && c >= 0 && c < cols) {
      board[r]![c]!.mine = true; // 멱등: 중복 좌표는 자연히 한 칸으로 합쳐진다.
    }
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let count = 0;
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr]![nc]!.mine) {
          count += 1;
        }
      }
      board[r]![c]!.adjacent = count;
    }
  }

  return board;
}

/**
 * (row,col)을 연다. 입력 보드를 변형하지 않고 새 보드를 반환한다.
 * - 범위 밖(비정수 포함)/이미 공개된 칸이면 변화 없이 복사본만 반환한다.
 * - 깃발이 꽂힌 칸은 보호한다(표준 규칙): 시작 칸이 깃발이면 변화 없이 반환하고,
 *   연쇄 공개(flood fill)도 깃발 칸으로는 퍼지지 않는다.
 * - 지뢰 칸이면 그 칸만 공개한다(패배는 isLoss로 판정).
 * - 인접 지뢰 0인 빈 칸이면 8방향 연쇄 공개(flood fill)로 이웃을 함께 연다.
 *   연쇄는 인접 지뢰가 0인 칸을 통해서만 퍼지고, 숫자 칸(인접>0)·깃발 칸·경계에서 멈춘다.
 *   인접 0인 칸은 정의상 이웃에 지뢰가 없으므로 연쇄가 지뢰를 열지 않는다.
 */
export function revealCell(board: Board, row: number, col: number): Board {
  const next = cloneBoard(board);
  if (!inBounds(next, row, col)) {
    return next;
  }
  const start = next[row]![col]!;
  if (start.revealed || start.flagged) {
    return next;
  }
  if (start.mine) {
    start.revealed = true;
    return next;
  }

  const stack: Array<[number, number]> = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const cur = next[r]![c]!;
    if (cur.revealed || cur.mine || cur.flagged) {
      continue;
    }
    cur.revealed = true;
    if (cur.adjacent === 0) {
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(next, nr, nc)) {
          const nb = next[nr]![nc]!;
          if (!nb.revealed && !nb.mine && !nb.flagged) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }

  return next;
}

/**
 * (row,col)의 깃발을 토글한다. 입력 보드를 변형하지 않고 새 보드를 반환한다.
 * - 범위 밖(비정수 포함)/이미 공개된 칸이면 변화 없이 복사본만 반환한다(공개된 칸엔 깃발 불가).
 * - 미공개 칸이면 flagged를 반전한다.
 */
export function toggleFlag(board: Board, row: number, col: number): Board {
  const next = cloneBoard(board);
  if (!inBounds(next, row, col)) {
    return next;
  }
  const cell = next[row]![col]!;
  if (cell.revealed) {
    return next;
  }
  cell.flagged = !cell.flagged;
  return next;
}

/** 깃발이 꽂힌 칸의 수를 센다(순수·결정적, 입력 불변). "남은 지뢰 수 = 지뢰 − 깃발" 카운터용. */
export function countFlags(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.flagged) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 지뢰가 아닌 모든 칸이 공개되면 승리.
 * - 빈 보드는 게임이 아니므로 false.
 */
export function isWin(board: Board): boolean {
  if (rowCount(board) === 0 || colCount(board) === 0) {
    return false;
  }
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}

/** 지뢰 칸이 하나라도 공개되면 패배. */
export function isLoss(board: Board): boolean {
  return board.some((row) => row.some((cell) => cell.mine && cell.revealed));
}
