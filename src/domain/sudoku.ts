// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 스도쿠(Sudoku): 일부 칸이 미리 채워진(고정 단서, given) 9×9 격자에서 빈 칸에 1~9를 채우거나
// 지우며 진행하다, 모든 칸이 채워지고 모든 행·열·3×3 박스에 1~9가 중복 없이 들어가면 클리어하는
// 결정적 1인 퍼즐. 기존 결정적 퍼즐 패밀리(lightsOut/nonogram/sokoban/pegSolitaire/slidePuzzle)와
// 같은 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를 반환한다(불변). 풀이 가능한 퍼즐
// 공급(프리셋/무작위, application)·플레이 화면(UI)은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 1~9 또는 빈 칸(null). */
export type SudokuValue = number | null;

/** 행 우선(row-major) 9×9 격자. board[row][col]. */
export type SudokuGrid = SudokuValue[][];

/** 진행 중 퍼즐 상태(고정 단서 + 현재 값). 불변으로 다룬다. */
export interface SudokuState {
  /** true = 고정 단서(편집 불가), 9×9. */
  readonly given: boolean[][];
  /** 현재 값(고정 단서 포함), 9×9. */
  readonly cells: SudokuGrid;
}

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface SudokuPos {
  row: number;
  col: number;
}

/** 표준 스도쿠 한 변 길이(고정 9). */
export const SUDOKU_SIZE = 9;
/** 3×3 박스 한 변 길이(고정 3). */
export const SUDOKU_BOX = 3;

/** value가 빈 칸(null) 또는 정수 1~9인지 검증한다. */
function isValidSudokuValue(value: SudokuValue): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= SUDOKU_SIZE)
  );
}

/**
 * 입력 격자가 9×9(행 9개·각 행 9칸)이고 값이 모두 null 또는 정수 1~9인지 검증한다.
 * - 비정상 입력이면 throw(한국어 사유).
 */
function assertValidGrid(puzzle: SudokuGrid): void {
  if (!Array.isArray(puzzle) || puzzle.length !== SUDOKU_SIZE) {
    throw new Error(
      `스도쿠 잘못된 격자: 행 ${SUDOKU_SIZE}개가 필요함(받은 행 수 ${
        Array.isArray(puzzle) ? puzzle.length : "비배열"
      })`,
    );
  }
  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    const cells = puzzle[row];
    if (!Array.isArray(cells) || cells.length !== SUDOKU_SIZE) {
      throw new Error(
        `스도쿠 잘못된 격자: 각 행은 ${SUDOKU_SIZE}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      if (!isValidSudokuValue(cells[col] ?? null)) {
        throw new Error(
          `스도쿠 잘못된 값: (row=${row}, col=${col})는 null 또는 정수 1~9만 허용(받은 값 ${String(
            cells[col],
          )})`,
        );
      }
    }
  }
}

/**
 * 퍼즐 격자로 시작 상태를 만든다.
 * - 9×9 검증(행 9개, 각 행 9칸), 값은 null 또는 정수 1~9만 허용. 비정상 입력은 throw(한국어 사유).
 * - 채워진 칸(non-null)을 given=true(고정 단서)로 표시, cells는 입력 그대로 깊은 복사(불변).
 */
export function createSudoku(puzzle: SudokuGrid): SudokuState {
  assertValidGrid(puzzle);
  const cells: SudokuGrid = puzzle.map((rowCells) =>
    rowCells.map((value) => value ?? null),
  );
  const given: boolean[][] = cells.map((rowCells) =>
    rowCells.map((value) => value !== null),
  );
  return { given, cells };
}

/** pos가 격자 경계 안의 정수 좌표면 true(0..8). */
export function inSudokuBounds(pos: SudokuPos): boolean {
  const { row, col } = pos;
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < SUDOKU_SIZE &&
    col >= 0 &&
    col < SUDOKU_SIZE
  );
}

/** (row,col)이 고정 단서(편집 불가)면 true. */
export function isSudokuGiven(state: SudokuState, pos: SudokuPos): boolean {
  if (!inSudokuBounds(pos)) {
    return false;
  }
  return state.given[pos.row]![pos.col] === true;
}

/**
 * (row,col)의 값을 value(1~9 또는 null=지우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 1~9·null 외 값, 고정 단서 칸 편집은 throw(조용한 무시 금지).
 */
export function placeSudokuValue(
  state: SudokuState,
  pos: SudokuPos,
  value: SudokuValue,
): SudokuState {
  if (!inSudokuBounds(pos)) {
    throw new Error(
      `스도쿠 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidSudokuValue(value)) {
    throw new Error(
      `스도쿠 잘못된 값: '${String(value)}'는 null 또는 정수 1~9만 허용`,
    );
  }
  if (state.given[pos.row]![pos.col] === true) {
    throw new Error(
      `스도쿠 고정 단서 편집 불가: (row=${pos.row}, col=${pos.col})는 편집할 수 없는 고정 칸`,
    );
  }
  const nextCells: SudokuGrid = state.cells.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return { given: state.given, cells: nextCells };
}

/** 같은 그룹(행/열/박스) 안에서 값이 중복되는 칸 좌표를 set에 모은다. 빈 칸은 무시. */
function collectGroupConflicts(
  cells: SudokuGrid,
  positions: SudokuPos[],
  out: Set<string>,
): void {
  const seen = new Map<number, SudokuPos[]>();
  for (const pos of positions) {
    const value = cells[pos.row]![pos.col];
    if (value === null || value === undefined) {
      continue;
    }
    const bucket = seen.get(value);
    if (bucket) {
      bucket.push(pos);
    } else {
      seen.set(value, [pos]);
    }
  }
  for (const bucket of seen.values()) {
    if (bucket.length > 1) {
      for (const pos of bucket) {
        out.add(`${pos.row},${pos.col}`);
      }
    }
  }
}

/**
 * 같은 행/열/3×3 박스에서 값이 중복되는(규칙 위반) 칸 좌표를 모두 반환한다.
 * - 빈 칸(null)은 충돌이 아니다.
 * - 반환 좌표는 중복 없이, (row, col) 오름차순으로 정렬한다.
 */
export function sudokuConflicts(state: SudokuState): SudokuPos[] {
  const { cells } = state;
  const conflicts = new Set<string>();

  // 행
  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    const positions: SudokuPos[] = [];
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      positions.push({ row, col });
    }
    collectGroupConflicts(cells, positions, conflicts);
  }
  // 열
  for (let col = 0; col < SUDOKU_SIZE; col += 1) {
    const positions: SudokuPos[] = [];
    for (let row = 0; row < SUDOKU_SIZE; row += 1) {
      positions.push({ row, col });
    }
    collectGroupConflicts(cells, positions, conflicts);
  }
  // 3×3 박스
  for (let boxRow = 0; boxRow < SUDOKU_SIZE; boxRow += SUDOKU_BOX) {
    for (let boxCol = 0; boxCol < SUDOKU_SIZE; boxCol += SUDOKU_BOX) {
      const positions: SudokuPos[] = [];
      for (let r = 0; r < SUDOKU_BOX; r += 1) {
        for (let c = 0; c < SUDOKU_BOX; c += 1) {
          positions.push({ row: boxRow + r, col: boxCol + c });
        }
      }
      collectGroupConflicts(cells, positions, conflicts);
    }
  }

  return Array.from(conflicts)
    .map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row: row!, col: col! };
    })
    .sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

/** 모든 칸이 채워졌으면(non-null) true. */
export function isSudokuComplete(state: SudokuState): boolean {
  return state.cells.every((rowCells) =>
    rowCells.every((value) => value !== null),
  );
}

/**
 * 모든 칸이 채워졌고(isSudokuComplete) 충돌이 하나도 없으면(sudokuConflicts 빈 배열) true.
 */
export function isSudokuSolved(state: SudokuState): boolean {
  return isSudokuComplete(state) && sudokuConflicts(state).length === 0;
}
