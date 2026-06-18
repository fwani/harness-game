// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 가쿠로(Kakuro·크로스섬): 십자말풀이형 숫자 퍼즐. 격자의 일부 칸은 채울 수 없는 막힌 칸이며, 그중
// 일부는 가로(right)·세로(down)로 이어지는 빈 칸들의 합계 단서를 가진다. 플레이어는 입력 칸을 1~9로
// 채워, (1) 각 런(연속한 가로 또는 세로 입력 칸들)의 합이 단서와 같고, (2) 한 런 안에서 숫자가
// 중복되지 않게 만들면 클리어한다. 기존 결정적 퍼즐 패밀리(sudoku/kenken/futoshiki/hitori 등)와 같은
// 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를 반환한다(불변). 무작위성·플레이 화면(UI)·
// 전적 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 값: 1..9 또는 빈 칸(null). */
export type KakuroValue = number | null;

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface KakuroPos {
  row: number;
  col: number;
}

/**
 * 막힌(채울 수 없는) 칸. 단서를 담을 수 있다.
 * - down: 아래 방향으로 이어지는 입력 칸 런의 합계 단서(없으면 null).
 * - right: 오른쪽 방향으로 이어지는 입력 칸 런의 합계 단서(없으면 null).
 * - down·right가 모두 null이면 단서 없는 빈 막힌 칸.
 */
export interface KakuroClueCell {
  kind: "clue";
  down: number | null;
  right: number | null;
}

/** 플레이어가 1~9로 채우는 입력 칸. */
export interface KakuroEntryCell {
  kind: "entry";
}

/** 격자의 한 칸 정의(입력 칸 또는 막힌/단서 칸). */
export type KakuroLayoutCell = KakuroClueCell | KakuroEntryCell;

/** 내장 퍼즐 정의(변 길이 + 칸 배치). 난수 없이 결정적. */
export interface KakuroPuzzle {
  /** N(한 변, 2 이상). 정사각 격자. */
  size: number;
  /** layout[row][col]. 각 칸의 종류·단서. */
  layout: KakuroLayoutCell[][];
}

/** 진행 중 퍼즐 상태(배치 + 현재 값). 불변으로 다룬다. */
export interface KakuroState {
  readonly puzzle: KakuroPuzzle;
  /** 현재 채움 상태, N×N. 막힌/단서 칸은 항상 null. grid[row][col]. */
  readonly grid: KakuroValue[][];
}

/** 한 런(연속한 가로/세로 입력 칸들)과 그 합계 단서. */
export interface KakuroRun {
  /** 합계 단서값(이 런의 입력 칸 값들의 합이 같아야 함). */
  clue: number;
  /** 런을 이루는 입력 칸 좌표들(2개 이상). */
  cells: KakuroPos[];
}

/** value가 빈 칸(null) 또는 정수 1..9인지 검증한다. */
function isValidKakuroValue(value: KakuroValue): boolean {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 9)
  );
}

/** pos가 정수이고 0..size-1 경계 안이면 true. */
function inGridBounds(pos: KakuroPos, size: number): boolean {
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

/** 단서 합계가 null 또는 1..45(1+..+9)의 정수인지. */
function isValidClueSum(sum: number | null): boolean {
  return sum === null || (Number.isInteger(sum) && sum >= 1 && sum <= 45);
}

/**
 * 배치가 정사각(행 N개·각 행 N칸, N은 2 이상)이고 각 칸이 유효한지 검증한다.
 * - 입력 칸은 kind="entry", 막힌/단서 칸은 kind="clue"이며 down/right는 null 또는 1..45 정수.
 * - 비정상 입력이면 throw(한국어 사유). 검증된 변 길이 N을 반환한다.
 */
function assertValidLayout(layout: KakuroLayoutCell[][]): number {
  if (!Array.isArray(layout)) {
    throw new Error("가쿠로 잘못된 배치: 배열이 아님");
  }
  const size = layout.length;
  if (size < 2) {
    throw new Error(`가쿠로 잘못된 배치: 변은 2 이상이어야 함(받은 행 수 ${size})`);
  }
  for (let row = 0; row < size; row += 1) {
    const cells = layout[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `가쿠로 잘못된 배치: 각 행은 ${size}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      const cell = cells[col];
      if (cell === null || typeof cell !== "object") {
        throw new Error(`가쿠로 잘못된 칸 (row=${row}, col=${col}): 객체가 아님`);
      }
      if (cell.kind === "entry") {
        continue;
      }
      if (cell.kind === "clue") {
        if (!isValidClueSum(cell.down) || !isValidClueSum(cell.right)) {
          throw new Error(
            `가쿠로 잘못된 단서 (row=${row}, col=${col}): 합계는 null 또는 1..45 정수여야 함(down=${String(
              cell.down,
            )}, right=${String(cell.right)})`,
          );
        }
        continue;
      }
      throw new Error(
        `가쿠로 잘못된 칸 (row=${row}, col=${col}): 종류는 entry/clue만 허용(받은 값 ${String(
          (cell as { kind?: unknown }).kind,
        )})`,
      );
    }
  }
  return size;
}

/**
 * 퍼즐로 시작 상태를 만든다.
 * - 정사각·각 칸 종류/단서 검증(아니면 한국어 사유로 throw).
 * - 배치는 깊은 복사, grid는 전부 null인 빈 격자(불변).
 */
export function createKakuro(puzzle: KakuroPuzzle): KakuroState {
  if (puzzle === null || typeof puzzle !== "object") {
    throw new Error("가쿠로 잘못된 퍼즐: 객체가 아님");
  }
  const size = assertValidLayout(puzzle.layout);
  if (puzzle.size !== undefined && puzzle.size !== size) {
    throw new Error(
      `가쿠로 잘못된 퍼즐: size(${String(puzzle.size)})와 배치 변 길이(${size})가 다름`,
    );
  }
  const layout: KakuroLayoutCell[][] = puzzle.layout.map((rowCells) =>
    rowCells.map((cell) =>
      cell.kind === "entry"
        ? { kind: "entry" }
        : { kind: "clue", down: cell.down, right: cell.right },
    ),
  );
  const grid: KakuroValue[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as KakuroValue),
  );
  return { puzzle: { size, layout }, grid };
}

/** pos가 격자 경계 안의 정수 좌표면 true(0..N-1). */
export function inKakuroBounds(state: KakuroState, pos: KakuroPos): boolean {
  return inGridBounds(pos, state.puzzle.size);
}

/** (row,col)이 채울 수 있는 입력 칸이면 true(막힌/단서 칸·경계 밖이면 false). */
export function isKakuroEntry(state: KakuroState, pos: KakuroPos): boolean {
  if (!inKakuroBounds(state, pos)) {
    return false;
  }
  return state.puzzle.layout[pos.row]![pos.col]!.kind === "entry";
}

/**
 * (row,col)의 값을 value(1..9 또는 null=비우기)로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표, 1..9·null 외 값, 막힌/단서 칸 쓰기는 throw(조용한 무시 금지).
 */
export function setKakuroValue(
  state: KakuroState,
  pos: KakuroPos,
  value: KakuroValue,
): KakuroState {
  if (!inKakuroBounds(state, pos)) {
    throw new Error(
      `가쿠로 경계 밖 좌표: (row=${String(pos?.row)}, col=${String(pos?.col)})는 격자 범위를 벗어남`,
    );
  }
  if (!isValidKakuroValue(value)) {
    throw new Error(
      `가쿠로 잘못된 값: '${String(value)}'는 null 또는 정수 1..9만 허용`,
    );
  }
  if (!isKakuroEntry(state, pos)) {
    throw new Error(
      `가쿠로 막힌 칸 쓰기 불가: (row=${pos.row}, col=${pos.col})는 입력 칸이 아님`,
    );
  }
  const nextGrid: KakuroValue[][] = state.grid.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? value : cell))
      : rowCells.slice(),
  );
  return { puzzle: state.puzzle, grid: nextGrid };
}

/** (row,col)이 격자 내부 입력 칸이면 true(런 열거용 내부 헬퍼). */
function isEntryAt(layout: KakuroLayoutCell[][], row: number, col: number): boolean {
  const cell = layout[row]?.[col];
  return cell !== undefined && cell.kind === "entry";
}

/**
 * 각 가로/세로 런(단서 칸 바로 다음의 연속 입력 칸들)과 그 합계 단서를 열거한다.
 * - right 단서가 있는 막힌 칸: 오른쪽으로 이어지는 연속 입력 칸들이 한 런.
 * - down 단서가 있는 막힌 칸: 아래로 이어지는 연속 입력 칸들이 한 런.
 * - 단서가 있으나 인접 입력 칸이 없는 경우(칸 0개)는 런으로 보지 않는다(무시).
 */
export function kakuroRuns(puzzle: KakuroPuzzle): KakuroRun[] {
  const { size, layout } = puzzle;
  const runs: KakuroRun[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const cell = layout[row]![col]!;
      if (cell.kind !== "clue") {
        continue;
      }
      if (cell.right !== null) {
        const cells: KakuroPos[] = [];
        for (let c = col + 1; c < size && isEntryAt(layout, row, c); c += 1) {
          cells.push({ row, col: c });
        }
        if (cells.length > 0) {
          runs.push({ clue: cell.right, cells });
        }
      }
      if (cell.down !== null) {
        const cells: KakuroPos[] = [];
        for (let r = row + 1; r < size && isEntryAt(layout, r, col); r += 1) {
          cells.push({ row: r, col });
        }
        if (cells.length > 0) {
          runs.push({ clue: cell.down, cells });
        }
      }
    }
  }
  return runs;
}

/**
 * 현재 제약을 어기는(색 비의존 강조용) 칸 좌표 목록을 반환한다.
 * 각 런에 대해 다음을 검사한다:
 *  - 같은 런 안에서 값이 중복되는 칸들(빈 칸 무시) → 그 칸들,
 *  - 런이 모두 채워졌는데 합계가 단서와 다르면 → 그 런의 모든 칸(부분 입력 상태의 합계 미달은 위반 아님).
 * 반환 좌표는 중복 없이 (row, col) 오름차순으로 정렬한다.
 */
export function kakuroViolations(state: KakuroState): KakuroPos[] {
  const { grid } = state;
  const out = new Set<string>();
  for (const run of kakuroRuns(state.puzzle)) {
    // 런 내 숫자 중복.
    const seen = new Map<number, KakuroPos[]>();
    let filled = 0;
    let sum = 0;
    for (const pos of run.cells) {
      const value = grid[pos.row]![pos.col];
      if (value === null || value === undefined) {
        continue;
      }
      filled += 1;
      sum += value;
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
    // 모두 채워진 런의 합계 불일치.
    if (filled === run.cells.length && sum !== run.clue) {
      for (const pos of run.cells) {
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

/** 모든 입력 칸이 채워졌으면(non-null) true(막힌/단서 칸은 무시). */
export function isKakuroComplete(state: KakuroState): boolean {
  const { size, layout } = state.puzzle;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (layout[row]![col]!.kind === "entry" && state.grid[row]![col] === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 전부 채워졌고(isKakuroComplete) 위반이 전혀 없으면(kakuroViolations 빈 배열) 클리어.
 * (각 런 합계 일치 + 런 내 숫자 중복 없음.)
 */
export function isKakuroSolved(state: KakuroState): boolean {
  return isKakuroComplete(state) && kakuroViolations(state).length === 0;
}

/** 막힌/단서 칸을 만드는 간단 헬퍼(내장 퍼즐 정의 가독성용). */
function clue(down: number | null, right: number | null): KakuroClueCell {
  return { kind: "clue", down, right };
}
/** 단서 없는 빈 막힌 칸. */
const X: KakuroClueCell = { kind: "clue", down: null, right: null };
/** 입력 칸. */
const E: KakuroEntryCell = { kind: "entry" };

/**
 * 내장 퍼즐 뱅크. 결정적(난수 없음)이며 각각 풀이 가능한 프리셋.
 * 표기: X=빈 막힌 칸, E=입력 칸, clue(down,right)=합계 단서 칸.
 */
export const KAKURO_PUZZLES: ReadonlyArray<KakuroPuzzle> = [
  // 4×4. 정답(입력 칸):
  //   (1,1)=1 (1,2)=2
  //   (2,1)=3 (2,2)=4 (2,3)=5
  //           (3,2)=6 (3,3)=7
  // 런 합계: 가로 1+2=3, 3+4+5=12, 6+7=13 / 세로 1+3=4, 2+4+6=12, 5+7=12.
  {
    size: 4,
    layout: [
      [X, clue(4, null), clue(12, null), X],
      [clue(null, 3), E, E, clue(12, null)],
      [clue(null, 12), E, E, E],
      [X, clue(null, 13), E, E],
    ],
  },
  // 3×3. 정답(입력 칸):
  //   (1,1)=1 (1,2)=2
  //   (2,1)=3 (2,2)=4
  // 런 합계: 가로 1+2=3, 3+4=7 / 세로 1+3=4, 2+4=6.
  {
    size: 3,
    layout: [
      [X, clue(4, null), clue(6, null)],
      [clue(null, 3), E, E],
      [clue(null, 7), E, E],
    ],
  },
];
