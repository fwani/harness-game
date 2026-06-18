// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 마천루(Skyscrapers·빌딩 퍼즐): N×N 격자를 1..N(빌딩 높이)으로 채워 (1) 각 행에 1..N이 한 번씩,
// (2) 각 열에 1..N이 한 번씩, (3) 격자 네 변에 주어진 "보이는 빌딩 수" 단서(해당 방향에서 더 낮은
// 빌딩에 가려지지 않고 보이는 빌딩 개수 — 줄을 훑으며 지금까지의 최댓값을 갱신할 때마다 +1)를 모두
// 만족하면 클리어하는 결정적 1인 퍼즐. 후토시키(futoshiki)·켄켄(kenken)과 같은 라틴방진 토대를
// 공유하되, 부등호·산술 케이지 대신 네 변의 가시성(visibility) 단서를 쓴다. 기존 결정적 퍼즐 패밀리
// (sudoku/binairo/futoshiki/kenken/hitori/nonogram)와 같은 결의 불변 순수 함수로, 입력 상태를
// 변형하지 않고 새 상태를 반환한다(불변). 무작위성이 없어 내장 고정 퍼즐(SKYSCRAPER_PUZZLES)만 쓰며,
// 플레이 화면(UI)·전적 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 1..N(빌딩 높이) 또는 빈 칸(null). */
export type SkyscraperValue = number | null;

/** 행 우선(row-major) N×N 격자. grid[row][col]. */
export type SkyscraperGrid = SkyscraperValue[][];

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface SkyscraperPos {
  row: number;
  col: number;
}

/**
 * 네 변의 "보이는 빌딩 수" 단서. 각 배열 길이 = N. null/0/누락은 "단서 없음".
 * - top: 각 열을 위에서 내려다봄(행 0→N-1 방향).
 * - bottom: 각 열을 아래에서 올려다봄(행 N-1→0 방향).
 * - left: 각 행을 왼쪽에서 봄(열 0→N-1 방향).
 * - right: 각 행을 오른쪽에서 봄(열 N-1→0 방향).
 */
export interface SkyscraperClues {
  top: ReadonlyArray<number | null>;
  bottom: ReadonlyArray<number | null>;
  left: ReadonlyArray<number | null>;
  right: ReadonlyArray<number | null>;
}

/** 내장 퍼즐 정의(변 단서 + 선택적 고정 단서 격자). */
export interface SkyscraperPuzzle {
  /** N(한 변, 2 이상). */
  size: number;
  clues: SkyscraperClues;
  /** 값이 있는 칸 = 고정 단서, null = 빈 칸. 생략 시 빈 격자(고정 단서 없음). 정사각 N×N. */
  givens?: SkyscraperGrid;
}

/** 진행 중 퍼즐 상태(고정 단서 + 현재 값 + 변 단서). 불변으로 다룬다. */
export interface SkyscraperState {
  /** N(한 변 길이). */
  readonly size: number;
  /** true = 고정 단서(편집 불가), N×N. */
  readonly givens: boolean[][];
  /** 현재 채움 상태(고정 단서 포함), N×N. grid[row][col]. */
  readonly grid: SkyscraperGrid;
  /** 정규화된 변 단서(없음은 모두 null로 통일). */
  readonly clues: SkyscraperClues;
}

/** value가 빈 칸(null) 또는 정수 1..size인지 검증한다. */
function isValidSkyscraperValue(value: SkyscraperValue, size: number): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= size)
  );
}

/** pos가 정수이고 0..size-1 경계 안이면 true. */
function inGridBounds(pos: SkyscraperPos, size: number): boolean {
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
 * 한 변의 단서 배열을 검증·정규화한다. 길이 = size, 각 값은 null/undefined/0(단서 없음) 또는
 * 정수 1..size여야 한다. 비정상 입력은 한국어 사유로 throw. 반환은 number|null 배열(0/누락 → null).
 */
function normalizeClueLine(
  line: ReadonlyArray<number | null> | undefined,
  size: number,
  side: string,
): Array<number | null> {
  if (!Array.isArray(line) || line.length !== size) {
    throw new Error(
      `마천루 잘못된 단서: ${side}는 길이 ${size} 배열이어야 함(받은 ${
        Array.isArray(line) ? `길이 ${line.length}` : "비배열"
      })`,
    );
  }
  return line.map((raw, index) => {
    const value = raw ?? null;
    if (value === null || value === 0) {
      return null;
    }
    if (!Number.isInteger(value) || value < 1 || value > size) {
      throw new Error(
        `마천루 잘못된 단서: ${side}[${index}]는 null/0(없음) 또는 정수 1..${size}만 허용(받은 값 ${String(
          raw,
        )})`,
      );
    }
    return value;
  });
}

/**
 * givens 격자가 정사각(행 N개·각 행 N칸)이고 값이 모두 null 또는 정수 1..N인지 검증한다.
 * 비정상 입력이면 한국어 사유로 throw.
 */
function assertValidGivens(givens: SkyscraperGrid, size: number): void {
  if (!Array.isArray(givens) || givens.length !== size) {
    throw new Error(
      `마천루 잘못된 고정 단서: 행 ${size}개가 필요함(받은 ${
        Array.isArray(givens) ? givens.length : "비배열"
      })`,
    );
  }
  for (let row = 0; row < size; row += 1) {
    const cells = givens[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `마천루 잘못된 고정 단서: 각 행은 ${size}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      if (!isValidSkyscraperValue(cells[col] ?? null, size)) {
        throw new Error(
          `마천루 잘못된 고정 단서 값: (row=${row}, col=${col})는 null 또는 정수 1..${size}만 허용(받은 값 ${String(
            cells[col],
          )})`,
        );
      }
    }
  }
}

/**
 * 한 방향으로 줄(높이 배열)을 훑을 때 "보이는 빌딩 수"를 센다.
 * 지금까지의 최댓값보다 큰 빌딩에서만 +1(단조 증가 갱신 시 보임). 빈 칸이 없는 완성된 줄에만 쓴다.
 */
function countVisible(line: ReadonlyArray<number>): number {
  let max = 0;
  let visible = 0;
  for (const height of line) {
    if (height > max) {
      max = height;
      visible += 1;
    }
  }
  return visible;
}

/**
 * 내장 고정 퍼즐 뱅크. 유일 해를 가지는 4×4 퍼즐 1개(네 변 가시성 단서 + 일부 고정 단서).
 * 정답(빌딩 높이):
 *   1 2 3 4
 *   2 3 4 1
 *   3 4 1 2
 *   4 1 2 3
 */
export const SKYSCRAPER_PUZZLES: ReadonlyArray<SkyscraperPuzzle> = [
  {
    size: 4,
    clues: {
      top: [4, 3, 2, 1],
      bottom: [1, 2, 2, 2],
      left: [4, 3, 2, 1],
      right: [1, 2, 2, 2],
    },
    givens: [
      [1, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, 3],
    ],
  },
];

/**
 * 퍼즐로 시작 상태를 만든다.
 * - size>=2 정수, 네 변 단서가 각각 길이 N·값(null/0/1..N) 검증, givens(있으면) 정사각·값 1..N/null
 *   검증한다(아니면 한국어 사유로 throw).
 * - givens의 채워진 칸(non-null)을 given=true(고정 단서)로 표시, grid는 그 값으로 시작(없으면 전부 null),
 *   clues는 정규화해 깊은 복사(불변).
 */
export function createSkyscrapers(puzzle: SkyscraperPuzzle): SkyscraperState {
  if (puzzle === null || typeof puzzle !== "object") {
    throw new Error("마천루 잘못된 퍼즐: 객체가 아님");
  }
  const { size } = puzzle;
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(
      `마천루 잘못된 크기: 변은 2 이상의 정수여야 함(받은 값 ${String(size)})`,
    );
  }
  if (puzzle.clues === null || typeof puzzle.clues !== "object") {
    throw new Error("마천루 잘못된 퍼즐: 단서(clues) 객체가 없음");
  }
  const clues: SkyscraperClues = {
    top: normalizeClueLine(puzzle.clues.top, size, "top"),
    bottom: normalizeClueLine(puzzle.clues.bottom, size, "bottom"),
    left: normalizeClueLine(puzzle.clues.left, size, "left"),
    right: normalizeClueLine(puzzle.clues.right, size, "right"),
  };

  let grid: SkyscraperGrid;
  let givens: boolean[][];
  if (puzzle.givens === undefined) {
    grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => null as SkyscraperValue),
    );
    givens = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false),
    );
  } else {
    assertValidGivens(puzzle.givens, size);
    grid = puzzle.givens.map((rowCells) =>
      rowCells.map((value) => value ?? null),
    );
    givens = grid.map((rowCells) => rowCells.map((value) => value !== null));
  }

  return { size, givens, grid, clues };
}

/** pos가 격자 경계 안의 정수 좌표면 true(0..N-1). */
export function inSkyscraperBounds(
  state: SkyscraperState,
  pos: SkyscraperPos,
): boolean {
  return inGridBounds(pos, state.size);
}

/** (row,col)이 고정 단서(편집 불가)면 true. */
export function isSkyscraperGiven(
  state: SkyscraperState,
  pos: SkyscraperPos,
): boolean {
  if (!inSkyscraperBounds(state, pos)) {
    return false;
  }
  return state.givens[pos.row]![pos.col] === true;
}

/**
 * (row,col)의 값을 value(1..N 또는 null=비우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 1..N·null 외 값, 고정 단서 칸 편집은 throw(조용한 무시 금지).
 *   후토시키 setFutoshikiValue 동작과 일관.
 */
export function setSkyscraperValue(
  state: SkyscraperState,
  pos: SkyscraperPos,
  value: SkyscraperValue,
): SkyscraperState {
  if (!inSkyscraperBounds(state, pos)) {
    throw new Error(
      `마천루 경계 밖 좌표: (row=${String(pos?.row)}, col=${String(
        pos?.col,
      )})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidSkyscraperValue(value, state.size)) {
    throw new Error(
      `마천루 잘못된 값: '${String(value)}'는 null 또는 정수 1..${state.size}만 허용`,
    );
  }
  if (state.givens[pos.row]![pos.col] === true) {
    throw new Error(
      `마천루 고정 단서 편집 불가: (row=${pos.row}, col=${pos.col})는 편집할 수 없는 고정 칸`,
    );
  }
  const nextGrid: SkyscraperGrid = state.grid.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return {
    size: state.size,
    givens: state.givens,
    grid: nextGrid,
    clues: state.clues,
  };
}

/** 같은 줄(행 또는 열) 안에서 값이 중복되는 칸 좌표를 out에 모은다. 빈 칸은 무시. */
function collectLineDuplicates(
  positions: SkyscraperPos[],
  grid: SkyscraperGrid,
  out: Set<string>,
): void {
  const seen = new Map<number, SkyscraperPos[]>();
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
 * 줄이 가득 찼고(빈 칸 없음) 단서가 있는데 보이는 빌딩 수가 단서와 다르면, 그 줄 전체 좌표를 out에 모은다.
 * - clue가 null이면 검사하지 않는다. 빈 칸이 있는 줄도 검사하지 않는다(부분 줄은 위반으로 보지 않음).
 * - viewOrder: 단서 방향으로 본 높이 배열(예: right/bottom은 역순). positions: 같은 순서의 좌표.
 */
function collectClueViolation(
  clue: number | null,
  positions: SkyscraperPos[],
  grid: SkyscraperGrid,
  out: Set<string>,
): void {
  if (clue === null) {
    return;
  }
  const heights: number[] = [];
  for (const pos of positions) {
    const value = grid[pos.row]![pos.col];
    if (value === null || value === undefined) {
      return; // 빈 칸이 있는 줄은 단서 위반으로 판정하지 않음.
    }
    heights.push(value);
  }
  if (countVisible(heights) !== clue) {
    for (const pos of positions) {
      out.add(`${pos.row},${pos.col}`);
    }
  }
}

/**
 * 현재 제약을 어기는(색 비의존 강조용) 칸 좌표 목록을 반환한다.
 * 다음을 모두 검사한다:
 *  - 같은 행에 같은 값 중복 → 그 칸들,
 *  - 같은 열에 같은 값 중복 → 그 칸들,
 *  - 가득 찬 행의 left/right 단서 불일치 → 그 행 전체,
 *  - 가득 찬 열의 top/bottom 단서 불일치 → 그 열 전체.
 * (빈 칸이 있는 줄의 단서는 위반으로 판정하지 않는다.)
 * 반환 좌표는 중복 없이 (row, col) 오름차순으로 정렬한다.
 */
export function skyscraperViolations(state: SkyscraperState): SkyscraperPos[] {
  const { grid, size, clues } = state;
  const out = new Set<string>();

  for (let i = 0; i < size; i += 1) {
    const rowPositions: SkyscraperPos[] = [];
    const colPositions: SkyscraperPos[] = [];
    for (let j = 0; j < size; j += 1) {
      rowPositions.push({ row: i, col: j });
      colPositions.push({ row: j, col: i });
    }
    // 행/열 중복.
    collectLineDuplicates(rowPositions, grid, out);
    collectLineDuplicates(colPositions, grid, out);

    // 변 단서 불일치(가득 찬 줄만).
    const rowReversed = rowPositions.slice().reverse();
    const colReversed = colPositions.slice().reverse();
    collectClueViolation(clues.left[i] ?? null, rowPositions, grid, out);
    collectClueViolation(clues.right[i] ?? null, rowReversed, grid, out);
    collectClueViolation(clues.top[i] ?? null, colPositions, grid, out);
    collectClueViolation(clues.bottom[i] ?? null, colReversed, grid, out);
  }

  return Array.from(out)
    .map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row: row!, col: col! };
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

/** 빈 칸이 하나도 없으면(non-null) true. */
export function isSkyscraperComplete(state: SkyscraperState): boolean {
  return state.grid.every((rowCells) =>
    rowCells.every((value) => value !== null),
  );
}

/**
 * 전부 채워졌고(isSkyscraperComplete) 위반이 전혀 없으면(skyscraperViolations 빈 배열) 클리어.
 * (행/열 라틴방진 + 네 변 가시성 단서 모두 충족.)
 */
export function isSkyscraperSolved(state: SkyscraperState): boolean {
  return (
    isSkyscraperComplete(state) && skyscraperViolations(state).length === 0
  );
}
