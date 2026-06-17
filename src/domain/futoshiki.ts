// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 후토시키(Futoshiki·부등호 라틴방진): 일부 칸이 미리 채워진(고정 단서, given) N×N 격자를 1..N으로
// 채워, (1) 각 행에 1..N이 한 번씩, (2) 각 열에 1..N이 한 번씩, (3) 인접 칸 사이에 주어진 부등호
// (<,>) 제약을 모두 만족하면 클리어하는 결정적 1인 퍼즐. 기존 결정적 퍼즐 패밀리
// (sudoku/binairo/nonogram 등)와 같은 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를
// 반환한다(불변). 무작위성이 없어 내장 고정 퍼즐(FUTOSHIKI_PUZZLES)만 쓰며, 플레이 화면(UI)·전적
// 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 1..N 또는 빈 칸(null). */
export type FutoshikiValue = number | null;

/** 행 우선(row-major) N×N 격자. grid[row][col]. */
export type FutoshikiGrid = FutoshikiValue[][];

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface FutoshikiPos {
  row: number;
  col: number;
}

/**
 * 인접한 두 칸 사이의 부등호 제약.
 * - lt: 더 작은 값이 와야 하는 칸, gt: 더 큰 값이 와야 하는 칸(둘은 가로/세로로 인접).
 * - 충족 조건: grid[lt] < grid[gt].
 */
export interface FutoshikiConstraint {
  lt: FutoshikiPos;
  gt: FutoshikiPos;
}

/** 내장 퍼즐 정의(고정 단서 + 부등호 제약). */
export interface FutoshikiPuzzle {
  /** 값이 있는 칸 = 고정 단서, null = 빈 칸. 정사각. */
  givens: FutoshikiGrid;
  constraints: ReadonlyArray<FutoshikiConstraint>;
}

/** 진행 중 퍼즐 상태(고정 단서 + 현재 값 + 제약). 불변으로 다룬다. */
export interface FutoshikiState {
  /** N(한 변 길이). */
  readonly size: number;
  /** true = 고정 단서(편집 불가), N×N. */
  readonly givens: boolean[][];
  /** 현재 채움 상태(고정 단서 포함), N×N. */
  readonly grid: FutoshikiGrid;
  readonly constraints: ReadonlyArray<FutoshikiConstraint>;
}

/** value가 빈 칸(null) 또는 정수 1..size인지 검증한다. */
function isValidFutoshikiValue(value: FutoshikiValue, size: number): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= size)
  );
}

/**
 * 입력 격자가 정사각(행 N개·각 행 N칸, N은 2 이상)이고 값이 모두 null 또는 정수 1..N인지 검증한다.
 * - 비정상 입력이면 throw(한국어 사유). 검증된 변 길이 N을 반환한다.
 */
function assertValidGrid(puzzle: FutoshikiGrid): number {
  if (!Array.isArray(puzzle)) {
    throw new Error("후토시키 잘못된 격자: 배열이 아님");
  }
  const size = puzzle.length;
  if (size < 2) {
    throw new Error(
      `후토시키 잘못된 격자: 변은 2 이상이어야 함(받은 행 수 ${size})`,
    );
  }
  for (let row = 0; row < size; row += 1) {
    const cells = puzzle[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `후토시키 잘못된 격자: 각 행은 ${size}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      if (!isValidFutoshikiValue(cells[col] ?? null, size)) {
        throw new Error(
          `후토시키 잘못된 값: (row=${row}, col=${col})는 null 또는 정수 1..${size}만 허용(받은 값 ${String(
            cells[col],
          )})`,
        );
      }
    }
  }
  return size;
}

/** pos가 정수이고 0..size-1 경계 안이면 true. */
function inGridBounds(pos: FutoshikiPos, size: number): boolean {
  return (
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < size &&
    pos.col >= 0 &&
    pos.col < size
  );
}

/** 두 좌표가 가로/세로로 인접(맨해튼 거리 1)하면 true. */
function isAdjacent(a: FutoshikiPos, b: FutoshikiPos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

/** 제약 좌표가 모두 격자 내부이고 lt/gt가 인접함을 검증한다. 위반 시 throw(한국어 사유). */
function assertValidConstraints(
  constraints: ReadonlyArray<FutoshikiConstraint>,
  size: number,
): void {
  if (!Array.isArray(constraints)) {
    throw new Error("후토시키 잘못된 제약: 배열이 아님");
  }
  constraints.forEach((constraint, index) => {
    const { lt, gt } = constraint;
    if (!inGridBounds(lt, size) || !inGridBounds(gt, size)) {
      throw new Error(
        `후토시키 잘못된 제약 ${index}: 좌표가 격자(0..${size - 1}) 밖(lt=(${lt.row},${lt.col}), gt=(${gt.row},${gt.col}))`,
      );
    }
    if (!isAdjacent(lt, gt)) {
      throw new Error(
        `후토시키 잘못된 제약 ${index}: lt=(${lt.row},${lt.col})와 gt=(${gt.row},${gt.col})는 가로/세로로 인접해야 함`,
      );
    }
  });
}

/**
 * 내장 고정 퍼즐 뱅크. 풀이 가능한 4×4 퍼즐 2개(고정 단서 일부 + 부등호 제약 + 나머지 null).
 * 각 퍼즐은 한 가지 정답으로 빈 칸을 채우면 모든 제약(행/열 라틴 + 부등호)을 만족한다.
 */
export const FUTOSHIKI_PUZZLES: ReadonlyArray<FutoshikiPuzzle> = [
  // 정답:
  //   1 2 3 4
  //   2 1 4 3
  //   3 4 1 2
  //   4 3 2 1
  {
    givens: [
      [1, null, null, 4],
      [null, 1, null, null],
      [null, null, 1, null],
      [4, null, null, 1],
    ],
    constraints: [
      { lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }, // 1 < 2
      { lt: { row: 1, col: 1 }, gt: { row: 1, col: 0 } }, // 1 < 2
      { lt: { row: 2, col: 2 }, gt: { row: 2, col: 3 } }, // 1 < 2
      { lt: { row: 3, col: 2 }, gt: { row: 3, col: 1 } }, // 2 < 3
      { lt: { row: 0, col: 2 }, gt: { row: 1, col: 2 } }, // 3 < 4
      { lt: { row: 2, col: 0 }, gt: { row: 3, col: 0 } }, // 3 < 4
    ],
  },
  // 정답:
  //   2 3 4 1
  //   1 4 3 2
  //   4 1 2 3
  //   3 2 1 4
  {
    givens: [
      [2, null, null, null],
      [null, 4, null, null],
      [null, null, 2, null],
      [null, null, null, 4],
    ],
    constraints: [
      { lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }, // 2 < 3
      { lt: { row: 0, col: 3 }, gt: { row: 0, col: 2 } }, // 1 < 4
      { lt: { row: 1, col: 0 }, gt: { row: 1, col: 1 } }, // 1 < 4
      { lt: { row: 2, col: 1 }, gt: { row: 2, col: 2 } }, // 1 < 2
      { lt: { row: 3, col: 1 }, gt: { row: 3, col: 0 } }, // 2 < 3
      { lt: { row: 0, col: 3 }, gt: { row: 1, col: 3 } }, // 1 < 2
    ],
  },
];

/**
 * 퍼즐로 시작 상태를 만든다.
 * - 정사각·값 1..N/null 검증, 제약 좌표가 격자 내부이며 lt/gt 인접 검증. 비정상 입력은 throw(한국어 사유).
 * - 채워진 칸(non-null)을 given=true(고정 단서)로 표시, grid는 입력 그대로 깊은 복사(불변).
 */
export function createFutoshiki(puzzle: FutoshikiPuzzle): FutoshikiState {
  if (puzzle === null || typeof puzzle !== "object") {
    throw new Error("후토시키 잘못된 퍼즐: 객체가 아님");
  }
  const size = assertValidGrid(puzzle.givens);
  assertValidConstraints(puzzle.constraints, size);
  const grid: FutoshikiGrid = puzzle.givens.map((rowCells) =>
    rowCells.map((value) => value ?? null),
  );
  const givens: boolean[][] = grid.map((rowCells) =>
    rowCells.map((value) => value !== null),
  );
  const constraints = puzzle.constraints.map((c) => ({
    lt: { row: c.lt.row, col: c.lt.col },
    gt: { row: c.gt.row, col: c.gt.col },
  }));
  return { size, givens, grid, constraints };
}

/** pos가 격자 경계 안의 정수 좌표면 true(0..N-1). */
export function inFutoshikiBounds(
  state: FutoshikiState,
  pos: FutoshikiPos,
): boolean {
  return inGridBounds(pos, state.size);
}

/** (row,col)이 고정 단서(편집 불가)면 true. */
export function isFutoshikiGiven(
  state: FutoshikiState,
  pos: FutoshikiPos,
): boolean {
  if (!inFutoshikiBounds(state, pos)) {
    return false;
  }
  return state.givens[pos.row]![pos.col] === true;
}

/**
 * (row,col)의 값을 value(1..N 또는 null=비우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 1..N·null 외 값, 고정 단서 칸 편집은 throw(조용한 무시 금지).
 */
export function setFutoshikiValue(
  state: FutoshikiState,
  pos: FutoshikiPos,
  value: FutoshikiValue,
): FutoshikiState {
  if (!inFutoshikiBounds(state, pos)) {
    throw new Error(
      `후토시키 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidFutoshikiValue(value, state.size)) {
    throw new Error(
      `후토시키 잘못된 값: '${String(value)}'는 null 또는 정수 1..${state.size}만 허용`,
    );
  }
  if (state.givens[pos.row]![pos.col] === true) {
    throw new Error(
      `후토시키 고정 단서 편집 불가: (row=${pos.row}, col=${pos.col})는 편집할 수 없는 고정 칸`,
    );
  }
  const nextGrid: FutoshikiGrid = state.grid.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return {
    size: state.size,
    givens: state.givens,
    grid: nextGrid,
    constraints: state.constraints,
  };
}

/** 같은 줄(행 또는 열) 안에서 값이 중복되는 칸 좌표를 set에 모은다. 빈 칸은 무시. */
function collectLineDuplicates(
  positions: FutoshikiPos[],
  grid: FutoshikiGrid,
  out: Set<string>,
): void {
  const seen = new Map<number, FutoshikiPos[]>();
  for (const pos of positions) {
    const value = grid[pos.row]![pos.col];
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
 * 현재 제약을 어기는(색 비의존 강조용) 칸 좌표 목록을 반환한다. 빈 칸이 끼면 그 제약은 위반이 아니다.
 * 다음을 모두 검사한다:
 *  - 같은 행에 같은 값 중복 → 그 칸들,
 *  - 같은 열에 같은 값 중복 → 그 칸들,
 *  - 부등호 제약 위반(lt 값 >= gt 값, 둘 다 채워진 경우) → 그 두 칸.
 * 반환 좌표는 중복 없이 (row, col) 오름차순으로 정렬한다.
 */
export function futoshikiViolations(state: FutoshikiState): FutoshikiPos[] {
  const { grid, size, constraints } = state;
  const out = new Set<string>();

  // 행/열 중복.
  for (let i = 0; i < size; i += 1) {
    const rowPositions: FutoshikiPos[] = [];
    const colPositions: FutoshikiPos[] = [];
    for (let j = 0; j < size; j += 1) {
      rowPositions.push({ row: i, col: j });
      colPositions.push({ row: j, col: i });
    }
    collectLineDuplicates(rowPositions, grid, out);
    collectLineDuplicates(colPositions, grid, out);
  }

  // 부등호 제약 위반(둘 다 채워진 경우에만 판정).
  for (const { lt, gt } of constraints) {
    const ltValue = grid[lt.row]![lt.col] ?? null;
    const gtValue = grid[gt.row]![gt.col] ?? null;
    if (ltValue === null || gtValue === null) {
      continue;
    }
    if (ltValue >= gtValue) {
      out.add(`${lt.row},${lt.col}`);
      out.add(`${gt.row},${gt.col}`);
    }
  }

  return Array.from(out)
    .map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row: row!, col: col! };
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

/** 빈 칸이 하나도 없으면(non-null) true. */
export function isFutoshikiComplete(state: FutoshikiState): boolean {
  return state.grid.every((rowCells) =>
    rowCells.every((value) => value !== null),
  );
}

/**
 * 전부 채워졌고(isFutoshikiComplete) 위반이 전혀 없으면(futoshikiViolations 빈 배열) 클리어.
 */
export function isFutoshikiSolved(state: FutoshikiState): boolean {
  return isFutoshikiComplete(state) && futoshikiViolations(state).length === 0;
}
