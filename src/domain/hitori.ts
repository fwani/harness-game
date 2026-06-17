// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 히토리(Hitori): 숫자가 미리 채워진 N×N(N≥2) 격자에서 일부 칸을 칠해(black) 남은 칸(white)이
// (1) 같은 행·열에 같은 숫자가 두 번 나오지 않고, (2) 칠한 칸끼리 상하좌우로 인접하지 않으며,
// (3) 칠하지 않은 칸 전체가 하나로 연결되면 클리어하는 결정적 1인 퍼즐. 기존 결정적 퍼즐 패밀리
// (sudoku/nonogram/binairo 등)와 같은 결의 불변 순수 함수로, 입력 상태를 변형하지 않고 새 상태를
// 반환한다(불변). 무작위성이 없어 내장 고정 퍼즐(HITORI_PUZZLES)만 쓰며, 플레이 화면(UI)·전적
// 저장·무작위 시작 헬퍼는 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 상태: 미칠(white) 또는 칠(black). */
export type HitoriMark = "white" | "black";

/** 진행 중 퍼즐 상태(고정 숫자판 + 현재 칠 상태). 불변으로 다룬다. */
export interface HitoriState {
  /** 고정 숫자판(N×N, 행 우선 row-major). 모든 칸은 양의 정수. */
  readonly numbers: number[][];
  /** 현재 칠 상태(numbers와 동일 크기). 초기에는 전부 "white". */
  readonly marks: HitoriMark[][];
}

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface HitoriPos {
  row: number;
  col: number;
}

/** 위반 종류: 같은 줄 white 중복 / 인접한 black 쌍 / white 미연결. */
export type HitoriViolationType = "duplicate" | "adjacent" | "disconnected";

/**
 * 현재 상태의 규칙 위반 한 건(UI 강조용).
 *  - "duplicate": 같은 행/열에서 같은 숫자로 남은 white 칸들(cells: 해당 white 칸들).
 *  - "adjacent": 상하좌우로 인접한 black 칸 쌍(cells: 두 칸).
 *  - "disconnected": 주(主) white 영역과 끊긴 white 칸들(cells: 끊긴 white 칸들).
 */
export interface HitoriViolation {
  type: HitoriViolationType;
  cells: HitoriPos[];
}

/** 값이 양의 정수면 true. */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * 입력 숫자판이 정사각 N×N(N≥2)이고 모든 칸이 양의 정수인지 검증한다.
 * 비정상 입력이면 throw(한국어 사유). 변의 길이 N을 반환한다.
 */
function assertValidNumbers(numbers: number[][]): number {
  if (!Array.isArray(numbers)) {
    throw new Error("히토리 잘못된 숫자판: 배열이 아님");
  }
  const size = numbers.length;
  if (size < 2) {
    throw new Error(
      `히토리 잘못된 숫자판: 변은 2 이상이어야 함(받은 행 수 ${size})`,
    );
  }
  for (let row = 0; row < size; row += 1) {
    const cells = numbers[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `히토리 잘못된 숫자판: 각 행은 ${size}칸이 필요함(행 ${row}: ${
          Array.isArray(cells) ? cells.length : "비배열"
        }칸)`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      if (!isPositiveInteger(cells[col]!)) {
        throw new Error(
          `히토리 잘못된 값: (row=${row}, col=${col})는 양의 정수만 허용(받은 값 ${String(
            cells[col],
          )})`,
        );
      }
    }
  }
  return size;
}

/**
 * 숫자판으로 시작 상태를 만든다.
 * - 정사각 N×N(N≥2)·모든 칸 양의 정수 검증. 비정상 입력은 throw(한국어 사유).
 * - 숫자판은 깊은 복사(불변), 모든 칸을 "white"로 시작.
 */
export function createHitori(numbers: number[][]): HitoriState {
  const size = assertValidNumbers(numbers);
  const copiedNumbers = numbers.map((rowCells) => rowCells.slice());
  const marks: HitoriMark[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "white" as HitoriMark),
  );
  return { numbers: copiedNumbers, marks };
}

/** pos가 격자 경계 안의 정수 좌표면 true. */
export function inHitoriBounds(state: HitoriState, pos: HitoriPos): boolean {
  const size = state.numbers.length;
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

/**
 * (row,col)의 칠 상태를 white↔black으로 토글한 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표는 throw(조용한 무시 금지).
 */
export function toggleHitoriCell(
  state: HitoriState,
  pos: HitoriPos,
): HitoriState {
  if (!inHitoriBounds(state, pos)) {
    throw new Error(
      `히토리 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  const nextMarks: HitoriMark[][] = state.marks.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((mark, c) =>
          c === pos.col ? (mark === "white" ? "black" : "white") : mark,
        )
      : rowCells.slice(),
  );
  return { numbers: state.numbers, marks: nextMarks };
}

/** 한 줄(좌표 목록)에서 white로 남은 칸끼리 같은 숫자가 중복되는 위반을 모은다. */
function lineDuplicateViolations(
  state: HitoriState,
  line: HitoriPos[],
): HitoriViolation[] {
  const groups = new Map<number, HitoriPos[]>();
  for (const pos of line) {
    if (state.marks[pos.row]![pos.col] !== "white") continue;
    const value = state.numbers[pos.row]![pos.col]!;
    const bucket = groups.get(value);
    if (bucket) {
      bucket.push(pos);
    } else {
      groups.set(value, [pos]);
    }
  }
  const out: HitoriViolation[] = [];
  for (const cells of groups.values()) {
    if (cells.length >= 2) {
      out.push({ type: "duplicate", cells });
    }
  }
  return out;
}

/**
 * 현재 상태의 규칙 위반을 열거한다(UI 강조용). 다음 세 종류를 구분해 반환한다:
 *  - "duplicate": 같은 행/열에서 같은 숫자로 남은 white 칸들,
 *  - "adjacent": 상하좌우로 인접한 black 칸 쌍(우/하 방향만 검사해 쌍별 1회),
 *  - "disconnected": 주 white 영역(좌상단 우선)과 끊긴 white 칸들(있다면 1건).
 * 빈 배열이면 모든 제약을 만족(클리어)과 동치다.
 */
export function hitoriViolations(state: HitoriState): HitoriViolation[] {
  const size = state.numbers.length;
  const violations: HitoriViolation[] = [];

  // 1) 같은 행/열에서 white 중복.
  for (let i = 0; i < size; i += 1) {
    const rowLine: HitoriPos[] = [];
    const colLine: HitoriPos[] = [];
    for (let j = 0; j < size; j += 1) {
      rowLine.push({ row: i, col: j });
      colLine.push({ row: j, col: i });
    }
    violations.push(...lineDuplicateViolations(state, rowLine));
    violations.push(...lineDuplicateViolations(state, colLine));
  }

  // 2) 상하좌우로 인접한 black 쌍(오른쪽/아래만 검사).
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (state.marks[row]![col] !== "black") continue;
      if (col + 1 < size && state.marks[row]![col + 1] === "black") {
        violations.push({
          type: "adjacent",
          cells: [
            { row, col },
            { row, col: col + 1 },
          ],
        });
      }
      if (row + 1 < size && state.marks[row + 1]![col] === "black") {
        violations.push({
          type: "adjacent",
          cells: [
            { row, col },
            { row: row + 1, col },
          ],
        });
      }
    }
  }

  // 3) white 칸이 하나로 연결되지 않음(좌상단 우선 영역과 끊긴 white 칸 모음).
  const whites: HitoriPos[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (state.marks[row]![col] === "white") whites.push({ row, col });
    }
  }
  if (whites.length > 1) {
    const start = whites[0]!; // 좌상단(행 우선) 첫 white 칸.
    const seen = new Set<string>([`${start.row},${start.col}`]);
    const stack: HitoriPos[] = [start];
    while (stack.length > 0) {
      const { row, col } = stack.pop()!;
      const neighbors: HitoriPos[] = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];
      for (const n of neighbors) {
        if (n.row < 0 || n.row >= size || n.col < 0 || n.col >= size) continue;
        if (state.marks[n.row]![n.col] !== "white") continue;
        const key = `${n.row},${n.col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        stack.push(n);
      }
    }
    const disconnected = whites.filter(
      (pos) => !seen.has(`${pos.row},${pos.col}`),
    );
    if (disconnected.length > 0) {
      violations.push({ type: "disconnected", cells: disconnected });
    }
  }

  return violations;
}

/**
 * 세 제약(행/열 white 중복 없음·black 비인접·white 연결)을 모두 만족하면 클리어.
 * hitoriViolations가 빈 배열인 것과 동치다.
 */
export function isHitoriSolved(state: HitoriState): boolean {
  return hitoriViolations(state).length === 0;
}

/**
 * 내장 고정 퍼즐 뱅크(숫자판). 알려진 풀이가 있는 5×5 1개.
 * (무작위 시작 헬퍼는 후속 application 이슈에서 RandomSource 주입으로 처리.)
 */
export const HITORI_PUZZLES: ReadonlyArray<number[][]> = [
  [
    [3, 1, 1, 2, 4],
    [2, 2, 1, 3, 4],
    [1, 3, 1, 4, 2],
    [4, 4, 2, 5, 2],
    [2, 5, 5, 1, 3],
  ],
];
