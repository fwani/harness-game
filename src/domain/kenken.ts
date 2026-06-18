// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 켄켄(KenKen·Calcudoku): N×N 격자를 1..N으로 채워 (1) 각 행에 1..N이 한 번씩, (2) 각 열에 1..N이
// 한 번씩, (3) 굵은 선으로 묶인 각 케이지(cage)의 숫자들이 주어진 목표값 + 연산(+, -, ×, ÷)을
// 만족하면 클리어하는 결정적 1인 퍼즐. 후토시키(futoshiki)와 같은 라틴방진 토대를 공유하되 부등호
// 대신 산술 케이지 제약을 쓴다. 기존 결정적 퍼즐 패밀리(sudoku/binairo/futoshiki/hitori/nonogram)와
// 같은 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를 반환한다(불변). 무작위성·플레이
// 화면(UI)·전적 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 1..N 또는 빈 칸(null). */
export type KenKenValue = number | null;

/** 행 우선(row-major) N×N 격자. grid[row][col]. */
export type KenKenGrid = KenKenValue[][];

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface KenKenPos {
  row: number;
  col: number;
}

/** 케이지 연산: 덧셈/뺄셈/곱셈/나눗셈. */
export type KenKenOp = "add" | "sub" | "mul" | "div";

/**
 * 굵은 선으로 묶인 케이지. 속한 칸들의 값이 op·target을 만족해야 한다.
 * - add: 모든 칸 합 === target (임의 칸 수).
 * - mul: 모든 칸 곱 === target (임의 칸 수).
 * - sub: 정확히 2칸, |a - b| === target (순서 무관).
 * - div: 정확히 2칸, 큰값 ÷ 작은값 === target (나누어떨어져야 함, 순서 무관).
 * - 단일 칸 케이지(cells.length === 1)는 op와 무관하게 그 칸 값 === target(고정값).
 */
export interface KenKenCage {
  op: KenKenOp;
  target: number;
  cells: ReadonlyArray<KenKenPos>;
}

/** 내장 퍼즐 정의(변 길이 + 케이지 목록). */
export interface KenKenPuzzle {
  /** N(한 변, 2 이상). */
  size: number;
  /** 모든 칸을 빠짐없이/중복 없이 덮는 케이지 목록. */
  cages: ReadonlyArray<KenKenCage>;
}

/** 진행 중 퍼즐 상태(현재 값 + 케이지). 불변으로 다룬다. */
export interface KenKenState {
  /** N(한 변 길이). */
  readonly size: number;
  /** 현재 채움 상태, N×N. grid[row][col]. */
  readonly grid: KenKenGrid;
  readonly cages: ReadonlyArray<KenKenCage>;
}

/** 허용 연산 집합. */
const KENKEN_OPS: ReadonlyArray<KenKenOp> = ["add", "sub", "mul", "div"];

/** value가 빈 칸(null) 또는 정수 1..size인지 검증한다. */
function isValidKenKenValue(value: KenKenValue, size: number): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= size)
  );
}

/** pos가 정수이고 0..size-1 경계 안이면 true. */
function inGridBounds(pos: KenKenPos, size: number): boolean {
  return (
    pos !== null &&
    typeof pos === "object" &&
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < size &&
    pos.col >= 0 &&
    pos.col < size
  );
}

/**
 * 케이지가 size를 기준으로 유효한지 검증하고, 덮는 칸 좌표를 out에 모은다(중복 시 throw).
 * - op는 허용 집합, target은 1 이상의 정수.
 * - cells는 1개 이상의 격자 내부 좌표(중복 없음).
 * - sub/div는 1칸(고정값) 또는 2칸만 허용(2칸 초과면 평가 불가 → throw).
 * 비정상 입력은 한국어 사유로 throw.
 */
function assertValidCage(
  cage: KenKenCage,
  index: number,
  size: number,
  out: Set<string>,
): void {
  if (cage === null || typeof cage !== "object") {
    throw new Error(`켄켄 잘못된 케이지 ${index}: 객체가 아님`);
  }
  if (!KENKEN_OPS.includes(cage.op)) {
    throw new Error(
      `켄켄 잘못된 케이지 ${index}: 연산은 add/sub/mul/div만 허용(받은 값 ${String(cage.op)})`,
    );
  }
  if (!Number.isInteger(cage.target) || cage.target < 1) {
    throw new Error(
      `켄켄 잘못된 케이지 ${index}: 목표값은 1 이상의 정수여야 함(받은 값 ${String(cage.target)})`,
    );
  }
  if (!Array.isArray(cage.cells) || cage.cells.length < 1) {
    throw new Error(`켄켄 잘못된 케이지 ${index}: 칸이 1개 이상이어야 함`);
  }
  if ((cage.op === "sub" || cage.op === "div") && cage.cells.length > 2) {
    throw new Error(
      `켄켄 잘못된 케이지 ${index}: ${cage.op} 연산은 2칸까지만 평가 가능(받은 칸 수 ${cage.cells.length})`,
    );
  }
  for (const pos of cage.cells) {
    if (!inGridBounds(pos, size)) {
      throw new Error(
        `켄켄 잘못된 케이지 ${index}: 좌표가 격자(0..${size - 1}) 밖(row=${String(
          pos?.row,
        )}, col=${String(pos?.col)})`,
      );
    }
    const key = `${pos.row},${pos.col}`;
    if (out.has(key)) {
      throw new Error(
        `켄켄 잘못된 케이지: 칸 (row=${pos.row}, col=${pos.col})이 둘 이상의 케이지에 중복으로 속함`,
      );
    }
    out.add(key);
  }
}

/**
 * 퍼즐로 시작 상태를 만든다.
 * - size>=2 정수, 케이지가 격자의 모든 칸을 정확히 한 번씩 덮는지, 각 케이지 op/target/칸이 유효한지
 *   검증한다(아니면 한국어 사유로 throw).
 * - grid는 전부 null인 빈 격자, cages는 깊은 복사(불변).
 */
export function createKenKen(puzzle: KenKenPuzzle): KenKenState {
  if (puzzle === null || typeof puzzle !== "object") {
    throw new Error("켄켄 잘못된 퍼즐: 객체가 아님");
  }
  const { size, cages } = puzzle;
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`켄켄 잘못된 크기: 변은 2 이상의 정수여야 함(받은 값 ${String(size)})`);
  }
  if (!Array.isArray(cages) || cages.length < 1) {
    throw new Error("켄켄 잘못된 퍼즐: 케이지가 1개 이상이어야 함");
  }
  const covered = new Set<string>();
  cages.forEach((cage, index) => assertValidCage(cage, index, size, covered));
  if (covered.size !== size * size) {
    throw new Error(
      `켄켄 잘못된 퍼즐: 케이지가 모든 칸을 덮어야 함(필요 ${size * size}칸, 덮은 ${covered.size}칸)`,
    );
  }
  const grid: KenKenGrid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as KenKenValue),
  );
  const copiedCages: KenKenCage[] = puzzle.cages.map((cage) => ({
    op: cage.op,
    target: cage.target,
    cells: cage.cells.map((pos) => ({ row: pos.row, col: pos.col })),
  }));
  return { size, grid, cages: copiedCages };
}

/** pos가 격자 경계 안의 정수 좌표면 true(0..N-1). */
export function inKenKenBounds(state: KenKenState, pos: KenKenPos): boolean {
  return inGridBounds(pos, state.size);
}

/**
 * (row,col)의 값을 value(1..N 또는 null=비우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 1..N·null 외 값은 throw(조용한 무시 금지). 같은 칸 재입력·지우기 허용.
 */
export function setKenKenValue(
  state: KenKenState,
  pos: KenKenPos,
  value: KenKenValue,
): KenKenState {
  if (!inKenKenBounds(state, pos)) {
    throw new Error(
      `켄켄 경계 밖 좌표: (row=${String(pos?.row)}, col=${String(pos?.col)})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidKenKenValue(value, state.size)) {
    throw new Error(
      `켄켄 잘못된 값: '${String(value)}'는 null 또는 정수 1..${state.size}만 허용`,
    );
  }
  const nextGrid: KenKenGrid = state.grid.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return { size: state.size, grid: nextGrid, cages: state.cages };
}

/** 같은 줄(행 또는 열) 안에서 값이 중복되는 칸 좌표를 out에 모은다. 빈 칸은 무시. */
function collectLineDuplicates(
  positions: KenKenPos[],
  grid: KenKenGrid,
  out: Set<string>,
): void {
  const seen = new Map<number, KenKenPos[]>();
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
 * 모든 칸이 채워진 케이지가 op·target을 만족하면 true. 빈 칸이 하나라도 있으면(평가 불가) true로 본다
 * (위반으로 보지 않음). 단일 칸 케이지는 그 값 === target.
 */
function isCageSatisfied(cage: KenKenCage, grid: KenKenGrid): boolean {
  const values: number[] = [];
  for (const pos of cage.cells) {
    const value = grid[pos.row]![pos.col];
    if (value === null || value === undefined) {
      return true; // 부분 채움 케이지는 아직 평가하지 않음.
    }
    values.push(value);
  }
  if (values.length === 1) {
    return values[0] === cage.target;
  }
  switch (cage.op) {
    case "add":
      return values.reduce((sum, v) => sum + v, 0) === cage.target;
    case "mul":
      return values.reduce((product, v) => product * v, 1) === cage.target;
    case "sub": {
      const [a, b] = values as [number, number];
      return Math.abs(a - b) === cage.target;
    }
    case "div": {
      const [a, b] = values as [number, number];
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      return lo !== 0 && hi % lo === 0 && hi / lo === cage.target;
    }
    default:
      return false;
  }
}

/**
 * 현재 제약을 어기는(색 비의존 강조용) 칸 좌표 목록을 반환한다.
 * 다음을 모두 검사한다:
 *  - 같은 행에 같은 값 중복 → 그 칸들,
 *  - 같은 열에 같은 값 중복 → 그 칸들,
 *  - 모든 칸이 채워진 케이지의 산술 불일치 → 그 케이지의 모든 칸(부분 채움 케이지는 위반 아님).
 * 반환 좌표는 중복 없이 (row, col) 오름차순으로 정렬한다.
 */
export function kenKenViolations(state: KenKenState): KenKenPos[] {
  const { grid, size, cages } = state;
  const out = new Set<string>();

  // 행/열 중복.
  for (let i = 0; i < size; i += 1) {
    const rowPositions: KenKenPos[] = [];
    const colPositions: KenKenPos[] = [];
    for (let j = 0; j < size; j += 1) {
      rowPositions.push({ row: i, col: j });
      colPositions.push({ row: j, col: i });
    }
    collectLineDuplicates(rowPositions, grid, out);
    collectLineDuplicates(colPositions, grid, out);
  }

  // 케이지 산술 위반(모든 칸이 채워진 경우에만 판정).
  for (const cage of cages) {
    if (!isCageSatisfied(cage, grid)) {
      for (const pos of cage.cells) {
        out.add(`${pos.row},${pos.col}`);
      }
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
export function isKenKenComplete(state: KenKenState): boolean {
  return state.grid.every((rowCells) =>
    rowCells.every((value) => value !== null),
  );
}

/**
 * 전부 채워졌고(isKenKenComplete) 위반이 전혀 없으면(kenKenViolations 빈 배열) 클리어.
 * (행/열 라틴방진 + 모든 케이지 산술 충족.)
 */
export function isKenKenSolved(state: KenKenState): boolean {
  return isKenKenComplete(state) && kenKenViolations(state).length === 0;
}
