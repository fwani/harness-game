// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 히토리(Hitori): 숫자가 미리 채워진 N×N(N≥2) 격자에서 일부 칸을 칠해(black) 다음 세 제약을
// 모두 만족하면 클리어하는 결정적 1인 퍼즐.
//   (1) 칠하지 않은(white) 칸 기준 각 행·열에 같은 숫자가 두 번 나오지 않는다.
//   (2) 칠한(black) 칸끼리 상하좌우(4방)로 인접하지 않는다.
//   (3) 칠하지 않은(white) 칸 전체가 4방 인접으로 하나로 연결된다.
// 기존 결정적 퍼즐 패밀리(sudoku/nonogram/binairo/futoshiki 등)와 같은 결의 불변 순수 함수로,
// 입력 상태를 변형하지 않고 새 상태를 반환한다(불변). 무작위성이 없어 고정 숫자판만 다루며,
// 무작위 시작 헬퍼(application)·플레이 화면(UI)·전적 저장은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 한 칸 상태: white(미칠) 또는 black(칠). */
export type HitoriMark = "white" | "black";

/** 진행 중 퍼즐 상태(고정 숫자판 + 현재 칠 상태). 불변으로 다룬다. N×N, 행 우선(row-major). */
export interface HitoriState {
  /** 고정 숫자판(편집 불가), numbers[row][col]는 양의 정수. */
  readonly numbers: number[][];
  /** 현재 칠 상태, numbers와 동일 크기. marks[row][col] = "white" | "black". */
  readonly marks: HitoriMark[][];
}

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface HitoriPos {
  row: number;
  col: number;
}

/**
 * 현재 상태의 규칙 위반(UI 강조용). 세 종류를 `type`으로 구분한다.
 *  - "duplicate-white": 같은 행/열에서 white로 남은 칸 중 같은 숫자가 둘 이상.
 *  - "adjacent-black": 상하좌우로 인접한 black 칸 쌍.
 *  - "disconnected-white": white 칸이 하나로 연결되지 않음(주 영역에서 떨어진 칸들).
 */
export type HitoriViolation =
  | {
      readonly type: "duplicate-white";
      /** 위반이 발생한 줄의 종류. */
      readonly line: "row" | "col";
      /** 그 줄의 인덱스(행 번호 또는 열 번호). */
      readonly index: number;
      /** 중복된 숫자 값. */
      readonly value: number;
      /** 중복된 white 칸들(2개 이상). */
      readonly cells: readonly HitoriPos[];
    }
  | {
      readonly type: "adjacent-black";
      /** 상하좌우로 맞닿은 black 칸 쌍. */
      readonly cells: readonly [HitoriPos, HitoriPos];
    }
  | {
      readonly type: "disconnected-white";
      /** 주(가장 큰) white 영역에서 떨어져 고립된 white 칸들. */
      readonly cells: readonly HitoriPos[];
    };

/** value가 양의 정수면 true. */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * 입력 숫자판이 정사각 N×N(N≥2)이고 모든 칸이 양의 정수인지 검증한다.
 * 비정상 입력이면 throw(한국어 사유). 검증 후 변 길이 N을 반환한다.
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
      if (!isPositiveInteger(cells[col])) {
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
 * - 숫자판을 깊은 복사(불변)하고, 모든 칸을 white로 시작한다.
 */
export function createHitori(numbers: number[][]): HitoriState {
  const size = assertValidNumbers(numbers);
  const copiedNumbers: number[][] = numbers.map((rowCells) => rowCells.slice());
  const marks: HitoriMark[][] = [];
  for (let row = 0; row < size; row += 1) {
    marks.push(new Array<HitoriMark>(size).fill("white"));
  }
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

/** (row,col)의 현재 칠 상태를 반환한다. 경계 밖이면 throw. */
export function hitoriMarkAt(state: HitoriState, pos: HitoriPos): HitoriMark {
  if (!inHitoriBounds(state, pos)) {
    throw new Error(
      `히토리 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 격자 범위를 벗어남`,
    );
  }
  return state.marks[pos.row]![pos.col]!;
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
  const nextMarks: HitoriMark[][] = state.marks.map((rowMarks, r) =>
    r === pos.row
      ? rowMarks.map((mark, c) =>
          c === pos.col ? (mark === "white" ? "black" : "white") : mark,
        )
      : rowMarks.slice(),
  );
  return { numbers: state.numbers, marks: nextMarks };
}

/** (row,col)이 white면 true. */
function isWhite(state: HitoriState, row: number, col: number): boolean {
  return state.marks[row]![col] === "white";
}

/** (row,col)이 black이면 true. */
function isBlack(state: HitoriState, row: number, col: number): boolean {
  return state.marks[row]![col] === "black";
}

/** 한 줄(행 또는 열)의 white 칸에서 같은 숫자 중복을 위반으로 모은다. */
function duplicateWhiteInLine(
  state: HitoriState,
  line: "row" | "col",
  index: number,
): HitoriViolation[] {
  const size = state.numbers.length;
  // value -> 그 값을 가진 white 칸 좌표들
  const byValue = new Map<number, HitoriPos[]>();
  for (let k = 0; k < size; k += 1) {
    const row = line === "row" ? index : k;
    const col = line === "row" ? k : index;
    if (!isWhite(state, row, col)) continue;
    const value = state.numbers[row]![col]!;
    const group = byValue.get(value);
    if (group) {
      group.push({ row, col });
    } else {
      byValue.set(value, [{ row, col }]);
    }
  }
  const out: HitoriViolation[] = [];
  for (const [value, cells] of byValue) {
    if (cells.length >= 2) {
      out.push({ type: "duplicate-white", line, index, value, cells });
    }
  }
  return out;
}

/** white 칸들을 4방 인접 기준 연결 요소로 나눈다(row-major 스캔). */
function whiteComponents(state: HitoriState): HitoriPos[][] {
  const size = state.numbers.length;
  const visited: boolean[][] = state.marks.map((rowMarks) =>
    rowMarks.map(() => false),
  );
  const components: HitoriPos[][] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!isWhite(state, row, col) || visited[row]![col]) continue;
      // 너비 우선 탐색으로 한 연결 요소를 모은다.
      const component: HitoriPos[] = [];
      const stack: HitoriPos[] = [{ row, col }];
      visited[row]![col] = true;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        component.push(cur);
        const neighbors: HitoriPos[] = [
          { row: cur.row - 1, col: cur.col },
          { row: cur.row + 1, col: cur.col },
          { row: cur.row, col: cur.col - 1 },
          { row: cur.row, col: cur.col + 1 },
        ];
        for (const n of neighbors) {
          if (
            n.row >= 0 &&
            n.row < size &&
            n.col >= 0 &&
            n.col < size &&
            isWhite(state, n.row, n.col) &&
            !visited[n.row]![n.col]
          ) {
            visited[n.row]![n.col] = true;
            stack.push(n);
          }
        }
      }
      components.push(component);
    }
  }
  return components;
}

/**
 * 현재 상태의 모든 규칙 위반을 열거한다(UI 강조용). 세 종류(`type`)를 구분한다:
 *  ① duplicate-white: 같은 행/열에서 white로 남은 같은 숫자 칸들,
 *  ② adjacent-black: 상하좌우로 맞닿은 black 칸 쌍(우/하 방향만 검사해 쌍 중복 없음),
 *  ③ disconnected-white: white 칸이 둘 이상으로 끊어지면 주(가장 큰) 영역 밖 칸들.
 * 위반이 하나도 없으면 빈 배열을 반환하며, 이는 `isHitoriSolved`와 일관된다.
 */
export function hitoriViolations(state: HitoriState): HitoriViolation[] {
  const size = state.numbers.length;
  const out: HitoriViolation[] = [];

  // ① 행/열별 white 중복 숫자.
  for (let index = 0; index < size; index += 1) {
    out.push(...duplicateWhiteInLine(state, "row", index));
    out.push(...duplicateWhiteInLine(state, "col", index));
  }

  // ② 인접한 black 쌍(오른쪽·아래만 검사해 같은 쌍을 두 번 세지 않는다).
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!isBlack(state, row, col)) continue;
      if (col + 1 < size && isBlack(state, row, col + 1)) {
        out.push({
          type: "adjacent-black",
          cells: [
            { row, col },
            { row, col: col + 1 },
          ],
        });
      }
      if (row + 1 < size && isBlack(state, row + 1, col)) {
        out.push({
          type: "adjacent-black",
          cells: [
            { row, col },
            { row: row + 1, col },
          ],
        });
      }
    }
  }

  // ③ white 연결성: 연결 요소가 둘 이상이면 가장 큰 영역(=주 영역) 밖 칸들을 위반으로 본다.
  // white 칸이 0개면(전부 black) 연결성 위반은 없다(②에서 인접 black으로 걸린다).
  const components = whiteComponents(state);
  if (components.length > 1) {
    let mainIndex = 0;
    for (let i = 1; i < components.length; i += 1) {
      if (components[i]!.length > components[mainIndex]!.length) {
        mainIndex = i;
      }
    }
    const stranded: HitoriPos[] = [];
    for (let i = 0; i < components.length; i += 1) {
      if (i !== mainIndex) stranded.push(...components[i]!);
    }
    stranded.sort((a, b) => a.row - b.row || a.col - b.col);
    out.push({ type: "disconnected-white", cells: stranded });
  }

  return out;
}

/**
 * 세 제약(white 중복 없음·인접 black 없음·white 연결)을 모두 만족하면 클리어.
 * `hitoriViolations(state)`가 빈 배열인 것과 동치다.
 */
export function isHitoriSolved(state: HitoriState): boolean {
  return hitoriViolations(state).length === 0;
}
