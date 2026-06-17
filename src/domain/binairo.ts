// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 비나이로(Binairo·Takuzu, 이진 퍼즐): 일부 칸이 미리 채워진(고정 단서, given) N×N(짝수 변) 격자를
// 0/1로 채워, (1) 같은 값 3연속 금지, (2) 각 행·열에 0과 1이 같은 개수, (3) 모든 행끼리·모든
// 열끼리 중복 금지를 모두 만족하면 클리어하는 결정적 1인 퍼즐. 기존 결정적 퍼즐 패밀리
// (sudoku/nonogram/lightsOut 등)와 같은 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를
// 반환한다(불변). 무작위성이 없어 내장 고정 퍼즐(BINAIRO_PUZZLES)만 쓰며, 플레이 화면(UI)·전적
// 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 0, 1 또는 빈 칸(null). */
export type BinairoValue = 0 | 1 | null;

/** 행 우선(row-major) N×N 격자. grid[row][col]. 변은 짝수. */
export type BinairoGrid = BinairoValue[][];

/** 진행 중 퍼즐 상태(고정 단서 + 현재 값). 불변으로 다룬다. */
export interface BinairoState {
  /** true = 고정 단서(편집 불가), grid와 동일 크기. */
  readonly givens: boolean[][];
  /** 현재 채움 상태(고정 단서 포함), N×N. */
  readonly grid: BinairoGrid;
}

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface BinairoPos {
  row: number;
  col: number;
}

/** value가 빈 칸(null) 또는 0/1인지 검증한다. */
function isValidBinairoValue(value: BinairoValue): boolean {
  return value === null || value === 0 || value === 1;
}

/**
 * 입력 격자가 정사각·짝수 변(행 N개·각 행 N칸, N은 2 이상 짝수)이고 값이 모두 null 또는 0/1인지
 * 검증한다. 비정상 입력이면 throw(한국어 사유).
 */
function assertValidGrid(puzzle: BinairoGrid): number {
  if (!Array.isArray(puzzle)) {
    throw new Error("비나이로 잘못된 격자: 배열이 아님");
  }
  const size = puzzle.length;
  if (size < 2 || size % 2 !== 0) {
    throw new Error(
      `비나이로 잘못된 격자: 변은 2 이상 짝수여야 함(받은 행 수 ${size})`,
    );
  }
  for (let row = 0; row < size; row += 1) {
    const cells = puzzle[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `비나이로 잘못된 격자: 각 행은 ${size}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      if (!isValidBinairoValue(cells[col] ?? null)) {
        throw new Error(
          `비나이로 잘못된 값: (row=${row}, col=${col})는 null 또는 0/1만 허용(받은 값 ${String(
            cells[col],
          )})`,
        );
      }
    }
  }
  return size;
}

/**
 * 내장 고정 퍼즐 뱅크. 풀이 가능한 6×6 퍼즐 2개(고정 단서 일부 + 나머지 null).
 * 각 퍼즐은 유일하지 않을 수 있으나, 한 가지 정답으로 빈 칸을 채우면 모든 제약을 만족한다.
 */
export const BINAIRO_PUZZLES: ReadonlyArray<BinairoGrid> = [
  [
    [0, null, 1, null, null, 1],
    [null, 0, null, 1, 0, null],
    [1, null, 0, null, null, 0],
    [null, 1, null, 0, 1, null],
    [1, null, 1, null, null, 0],
    [null, 1, null, 1, 0, null],
  ],
  [
    [0, 0, null, null, 1, null],
    [null, null, 1, 1, null, 1],
    [1, null, null, 0, null, 0],
    [0, 1, null, null, 1, null],
    [null, null, 0, 1, null, null],
    [1, 1, null, null, 0, 0],
  ],
];

/**
 * 퍼즐 격자로 시작 상태를 만든다.
 * - 정사각·짝수 변 검증(행 N개, 각 행 N칸), 값은 null 또는 0/1만 허용. 비정상 입력은 throw(한국어 사유).
 * - 채워진 칸(non-null)을 given=true(고정 단서)로 표시, grid는 입력 그대로 깊은 복사(불변).
 */
export function createBinairo(puzzle: BinairoGrid): BinairoState {
  assertValidGrid(puzzle);
  const grid: BinairoGrid = puzzle.map((rowCells) =>
    rowCells.map((value) => value ?? null),
  );
  const givens: boolean[][] = grid.map((rowCells) =>
    rowCells.map((value) => value !== null),
  );
  return { givens, grid };
}

/** pos가 격자 경계 안의 정수 좌표면 true. */
export function inBinairoBounds(state: BinairoState, pos: BinairoPos): boolean {
  const size = state.grid.length;
  const { row, col } = pos;
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < size &&
    col >= 0 &&
    col < size
  );
}

/** (row,col)이 고정 단서(편집 불가)면 true. */
export function isBinairoGiven(state: BinairoState, pos: BinairoPos): boolean {
  if (!inBinairoBounds(state, pos)) {
    return false;
  }
  return state.givens[pos.row]![pos.col] === true;
}

/**
 * (row,col)의 값을 value(0/1 또는 null=비우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 0/1·null 외 값, 고정 단서 칸 편집은 throw(조용한 무시 금지).
 */
export function setBinairoValue(
  state: BinairoState,
  pos: BinairoPos,
  value: BinairoValue,
): BinairoState {
  if (!inBinairoBounds(state, pos)) {
    throw new Error(
      `비나이로 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidBinairoValue(value)) {
    throw new Error(
      `비나이로 잘못된 값: '${String(value)}'는 null 또는 0/1만 허용`,
    );
  }
  if (state.givens[pos.row]![pos.col] === true) {
    throw new Error(
      `비나이로 고정 단서 편집 불가: (row=${pos.row}, col=${pos.col})는 편집할 수 없는 고정 칸`,
    );
  }
  const nextGrid: BinairoGrid = state.grid.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return { givens: state.givens, grid: nextGrid };
}

/** 한 줄(행/열)을 좌표 목록으로 받아 값 배열을 만든다. */
function lineValues(grid: BinairoGrid, line: BinairoPos[]): BinairoValue[] {
  return line.map((pos) => grid[pos.row]![pos.col] ?? null);
}

/** 한 줄이 빈 칸 없이 전부 채워졌으면 true. */
function lineFilled(values: BinairoValue[]): boolean {
  return values.every((value) => value !== null);
}

/**
 * 현재 제약을 어기는(색 비의존 강조용) 칸 좌표 목록을 반환한다. 빈 칸은 위반이 아니다.
 * 다음을 모두 검사한다:
 *  - 같은 값 3연속(가로/세로) → 그 3칸,
 *  - 한 행/열에서 0 또는 1이 변의 절반을 초과 → 그 줄의 해당 값 칸들,
 *  - 완전히 채워져 동일한 두 행 또는 두 열 → 그 줄들의 칸.
 * 반환 좌표는 중복 없이 (row, col) 오름차순으로 정렬한다.
 */
export function binairoViolations(state: BinairoState): BinairoPos[] {
  const { grid } = state;
  const size = grid.length;
  const half = size / 2;
  const out = new Set<string>();
  const mark = (row: number, col: number) => out.add(`${row},${col}`);

  // 모든 행/열을 좌표 목록으로 미리 구성.
  const rows: BinairoPos[][] = [];
  const cols: BinairoPos[][] = [];
  for (let i = 0; i < size; i += 1) {
    const rowLine: BinairoPos[] = [];
    const colLine: BinairoPos[] = [];
    for (let j = 0; j < size; j += 1) {
      rowLine.push({ row: i, col: j });
      colLine.push({ row: j, col: i });
    }
    rows.push(rowLine);
    cols.push(colLine);
  }
  const allLines = [...rows, ...cols];

  // 1) 같은 값 3연속.
  for (const line of allLines) {
    for (let k = 0; k + 2 < line.length; k += 1) {
      const a = grid[line[k]!.row]![line[k]!.col];
      const b = grid[line[k + 1]!.row]![line[k + 1]!.col];
      const c = grid[line[k + 2]!.row]![line[k + 2]!.col];
      if (a !== null && a === b && a === c) {
        mark(line[k]!.row, line[k]!.col);
        mark(line[k + 1]!.row, line[k + 1]!.col);
        mark(line[k + 2]!.row, line[k + 2]!.col);
      }
    }
  }

  // 2) 한 줄에서 0 또는 1이 절반 초과.
  for (const line of allLines) {
    const values = lineValues(grid, line);
    const zeros = values.filter((v) => v === 0).length;
    const ones = values.filter((v) => v === 1).length;
    if (zeros > half) {
      line.forEach((pos, idx) => {
        if (values[idx] === 0) mark(pos.row, pos.col);
      });
    }
    if (ones > half) {
      line.forEach((pos, idx) => {
        if (values[idx] === 1) mark(pos.row, pos.col);
      });
    }
  }

  // 3) 완전히 채워져 동일한 두 행 / 두 열.
  const markIdenticalLines = (lines: BinairoPos[][]) => {
    for (let a = 0; a < lines.length; a += 1) {
      const va = lineValues(grid, lines[a]!);
      if (!lineFilled(va)) continue;
      for (let b = a + 1; b < lines.length; b += 1) {
        const vb = lineValues(grid, lines[b]!);
        if (!lineFilled(vb)) continue;
        if (va.every((value, idx) => value === vb[idx])) {
          lines[a]!.forEach((pos) => mark(pos.row, pos.col));
          lines[b]!.forEach((pos) => mark(pos.row, pos.col));
        }
      }
    }
  };
  markIdenticalLines(rows);
  markIdenticalLines(cols);

  return Array.from(out)
    .map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row: row!, col: col! };
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

/** 빈 칸이 하나도 없으면(non-null) true. */
export function isBinairoComplete(state: BinairoState): boolean {
  return state.grid.every((rowCells) =>
    rowCells.every((value) => value !== null),
  );
}

/**
 * 전부 채워졌고(isBinairoComplete) 위반이 전혀 없으면(binairoViolations 빈 배열) 클리어.
 */
export function isBinairoSolved(state: BinairoState): boolean {
  return isBinairoComplete(state) && binairoViolations(state).length === 0;
}
