// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 네모로직(Nonogram·Picross, 일러스트 로직): 직사각 해답(solution) 격자에서 각 행/열의 연속 채움
// 묶음을 단서(clue)로 유도하고, 플레이어가 칸을 채우거나(filled) X로 표시(crossed)하며 진행하다
// 채운 칸 집합이 해답과 정확히 일치하면 클리어하는 결정적 1인 퍼즐. 기존 퍼즐 패밀리
// (lightsOut/sokoban/pegSolitaire/slidePuzzle)와 같은 결의 불변 순수 함수로, 입력 상태를
// 변형하지 않고 새 상태를 반환한다(불변). 무작위/프리셋 퍼즐 라이브러리(application,
// RandomSource 주입)·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 행 우선(row-major) 직사각 해답 격자. solution[row][col]. true = 채움(칠해진 칸). */
export type NonogramSolution = boolean[][];

/** 한 칸의 플레이어 표시 상태. */
export type NonogramMark = "empty" | "filled" | "crossed";

/** 진행 중 퍼즐 상태(해답 + 플레이어 표시 격자). 불변으로 다룬다. */
export interface NonogramState {
  /** 정답(불변, 표시용 단서의 근거). */
  readonly solution: NonogramSolution;
  /** 플레이어 표시(solution과 같은 크기). */
  readonly marks: NonogramMark[][];
}

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface NonogramPos {
  row: number;
  col: number;
}

const VALID_MARKS: ReadonlySet<NonogramMark> = new Set<NonogramMark>([
  "empty",
  "filled",
  "crossed",
]);

/**
 * 해답 격자가 직사각(모든 행 길이 동일)·1칸 이상인지 검증한다.
 * - 비정상 입력(행 없음·0폭·들쭉날쭉)이면 throw(한국어 사유).
 */
function assertRectangularSolution(solution: NonogramSolution): void {
  if (!Array.isArray(solution) || solution.length === 0) {
    throw new Error("네모로직 잘못된 해답: 최소 1개 행이 필요함");
  }
  const width = solution[0]!.length;
  if (width === 0) {
    throw new Error("네모로직 잘못된 해답: 각 행은 최소 1개 칸이 필요함");
  }
  for (const rowCells of solution) {
    if (rowCells.length !== width) {
      throw new Error(
        `네모로직 잘못된 해답: 모든 행 길이가 같아야 함(기대 ${width}, 받은 값 ${rowCells.length})`,
      );
    }
  }
}

/** 한 줄(행 또는 열)의 연속 채움 묶음 길이를 순서대로 반환한다. 묶음이 없으면 []. */
function lineClues(line: ReadonlyArray<boolean>): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) {
      run += 1;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) {
    clues.push(run);
  }
  return clues;
}

/**
 * 해답 격자로 시작 상태를 만든다. marks는 전부 "empty".
 * - 직사각(모든 행 길이 동일)·1칸 이상이 아니면 throw(한국어 사유).
 * - 해답에 채운 칸이 하나도 없으면 throw(빈 퍼즐 금지).
 */
export function createNonogram(solution: NonogramSolution): NonogramState {
  assertRectangularSolution(solution);
  const hasFilled = solution.some((rowCells) => rowCells.some((cell) => cell));
  if (!hasFilled) {
    throw new Error("네모로직 잘못된 해답: 채운 칸이 하나도 없는 빈 퍼즐은 만들 수 없음");
  }
  // 해답을 깊은 복사해 외부 변형으로부터 격리한다(불변 보장).
  const frozenSolution: NonogramSolution = solution.map((rowCells) => rowCells.slice());
  const marks: NonogramMark[][] = frozenSolution.map((rowCells) =>
    rowCells.map<NonogramMark>(() => "empty"),
  );
  return { solution: frozenSolution, marks };
}

/** 각 행의 연속 채움 묶음 길이를 좌→우 순서로. 묶음이 없는 행은 []. */
export function nonogramRowClues(solution: NonogramSolution): number[][] {
  assertRectangularSolution(solution);
  return solution.map((rowCells) => lineClues(rowCells));
}

/** 각 열의 연속 채움 묶음 길이를 상→하 순서로. 묶음이 없는 열은 []. */
export function nonogramColumnClues(solution: NonogramSolution): number[][] {
  assertRectangularSolution(solution);
  const width = solution[0]!.length;
  const columns: number[][] = [];
  for (let col = 0; col < width; col += 1) {
    const line = solution.map((rowCells) => rowCells[col] ?? false);
    columns.push(lineClues(line));
  }
  return columns;
}

/** pos가 격자 경계 안의 정수 좌표면 true. */
export function inNonogramBounds(state: NonogramState, pos: NonogramPos): boolean {
  const { row, col } = pos;
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < state.marks.length &&
    col >= 0 &&
    col < (state.marks[row]?.length ?? 0)
  );
}

/**
 * (row,col)의 표시를 mark로 바꾼 새 상태를 반환한다(입력 불변).
 * - 경계 밖/비정수 좌표면 throw(조용한 무시 금지 — 도메인 에러).
 * - 알 수 없는 mark면 throw.
 */
export function markNonogramCell(
  state: NonogramState,
  pos: NonogramPos,
  mark: NonogramMark,
): NonogramState {
  if (!VALID_MARKS.has(mark)) {
    throw new Error(`네모로직 잘못된 표시: '${mark}'는 알 수 없는 표시(empty/filled/crossed만 허용)`);
  }
  if (!inNonogramBounds(state, pos)) {
    throw new Error(
      `네모로직 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  const nextMarks = state.marks.map((rowCells, r) =>
    r === pos.row
      ? rowCells.map((cell, c) => (c === pos.col ? mark : cell))
      : rowCells.slice(),
  );
  return { solution: state.solution, marks: nextMarks };
}

/**
 * 채운 칸("filled") 집합이 해답의 채운 칸과 정확히 일치하면 true.
 * X(crossed)/빈(empty) 표시는 클리어 판정에 영향 없음 — 칠해진 칸만으로 판정한다.
 */
export function isNonogramSolved(state: NonogramState): boolean {
  const { solution, marks } = state;
  for (let row = 0; row < solution.length; row += 1) {
    const solutionRow = solution[row]!;
    const marksRow = marks[row]!;
    for (let col = 0; col < solutionRow.length; col += 1) {
      const shouldFill = solutionRow[col] === true;
      const isFilled = marksRow[col] === "filled";
      if (shouldFill !== isFilled) {
        return false;
      }
    }
  }
  return true;
}
