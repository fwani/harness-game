import { describe, it, expect } from "vitest";
import {
  FUTOSHIKI_PUZZLES,
  createFutoshiki,
  futoshikiViolations,
  inFutoshikiBounds,
  isFutoshikiComplete,
  isFutoshikiGiven,
  isFutoshikiSolved,
  setFutoshikiValue,
  type FutoshikiGrid,
  type FutoshikiPuzzle,
  type FutoshikiState,
} from "./futoshiki";

// 내장 퍼즐(FUTOSHIKI_PUZZLES)에 대응하는 정답(빈 칸을 채운 완성 격자). 풀이 가능성 검증에 사용.
const SOLUTIONS: number[][][] = [
  [
    [1, 2, 3, 4],
    [2, 1, 4, 3],
    [3, 4, 1, 2],
    [4, 3, 2, 1],
  ],
  [
    [2, 3, 4, 1],
    [1, 4, 3, 2],
    [4, 1, 2, 3],
    [3, 2, 1, 4],
  ],
];

/** 정답으로 모든 빈 칸을 채운 상태를 만든다. */
function fillToSolution(puzzle: FutoshikiPuzzle, solution: number[][]): FutoshikiState {
  let state = createFutoshiki(puzzle);
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution.length; col += 1) {
      if (!isFutoshikiGiven(state, { row, col })) {
        state = setFutoshikiValue(state, { row, col }, solution[row]![col]!);
      }
    }
  }
  return state;
}

/** 제약 없는 단순 4×4 퍼즐(테스트 편의). */
function emptyPuzzle(size = 4): FutoshikiPuzzle {
  const givens: FutoshikiGrid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  return { givens, constraints: [] };
}

describe("createFutoshiki", () => {
  it("givens 마스크·size·constraints를 정확히 만든다", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: [
        [1, null, null, 4],
        [null, 1, null, null],
        [null, null, 1, null],
        [4, null, null, 1],
      ],
      constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }],
    };
    const state = createFutoshiki(puzzle);
    expect(state.size).toBe(4);
    expect(state.givens).toEqual([
      [true, false, false, true],
      [false, true, false, false],
      [false, false, true, false],
      [true, false, false, true],
    ]);
    expect(state.grid[0]).toEqual([1, null, null, 4]);
    expect(state.constraints).toEqual([
      { lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } },
    ]);
  });

  it("입력 퍼즐을 변형하지 않는다(불변, 깊은 복사)", () => {
    const puzzle = emptyPuzzle();
    const before = JSON.stringify(puzzle.givens);
    const state = createFutoshiki(puzzle);
    state.grid[0]![0] = 3;
    expect(JSON.stringify(puzzle.givens)).toBe(before);
  });

  it("비정사각 격자는 throw", () => {
    expect(() =>
      createFutoshiki({
        givens: [
          [1, 2, 3],
          [null, null, null],
        ],
        constraints: [],
      }),
    ).toThrow(/후토시키/);
  });

  it("들쭉날쭉한(행 길이 불일치) 격자는 throw", () => {
    expect(() =>
      createFutoshiki({
        givens: [
          [1, null, null, null],
          [null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ] as FutoshikiGrid,
        constraints: [],
      }),
    ).toThrow(/후토시키/);
  });

  it("값 범위(1..N) 밖이면 throw", () => {
    expect(() =>
      createFutoshiki({
        givens: [
          [5, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        constraints: [],
      }),
    ).toThrow(/후토시키/);
  });

  it("제약 좌표가 격자 밖이면 throw", () => {
    expect(() =>
      createFutoshiki({
        givens: emptyPuzzle().givens,
        constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 4 } }],
      }),
    ).toThrow(/제약/);
  });

  it("제약 칸이 인접하지 않으면 throw", () => {
    expect(() =>
      createFutoshiki({
        givens: emptyPuzzle().givens,
        constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 2 } }],
      }),
    ).toThrow(/인접/);
  });
});

describe("setFutoshikiValue", () => {
  it("빈 칸을 채우고 null로 되돌린다(불변)", () => {
    const state = createFutoshiki(emptyPuzzle());
    const filled = setFutoshikiValue(state, { row: 1, col: 2 }, 3);
    expect(filled.grid[1]![2]).toBe(3);
    // 원본 불변.
    expect(state.grid[1]![2]).toBe(null);

    const cleared = setFutoshikiValue(filled, { row: 1, col: 2 }, null);
    expect(cleared.grid[1]![2]).toBe(null);
    expect(filled.grid[1]![2]).toBe(3);
  });

  it("고정 단서 칸 수정은 throw", () => {
    const state = createFutoshiki(FUTOSHIKI_PUZZLES[0]!);
    expect(isFutoshikiGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() => setFutoshikiValue(state, { row: 0, col: 0 }, 2)).toThrow(
      /고정 단서/,
    );
  });

  it("경계 밖 좌표는 throw", () => {
    const state = createFutoshiki(emptyPuzzle());
    expect(() => setFutoshikiValue(state, { row: 4, col: 0 }, 1)).toThrow(
      /경계 밖/,
    );
    expect(() => setFutoshikiValue(state, { row: 0, col: -1 }, 1)).toThrow(
      /경계 밖/,
    );
  });

  it("값 범위(1..N) 밖은 throw", () => {
    const state = createFutoshiki(emptyPuzzle());
    expect(() => setFutoshikiValue(state, { row: 0, col: 0 }, 0)).toThrow(
      /잘못된 값/,
    );
    expect(() => setFutoshikiValue(state, { row: 0, col: 0 }, 5)).toThrow(
      /잘못된 값/,
    );
    expect(() => setFutoshikiValue(state, { row: 0, col: 0 }, 1.5)).toThrow(
      /잘못된 값/,
    );
  });
});

describe("inFutoshikiBounds / isFutoshikiGiven", () => {
  it("경계와 고정 단서를 판정한다", () => {
    const state = createFutoshiki(FUTOSHIKI_PUZZLES[0]!);
    expect(inFutoshikiBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inFutoshikiBounds(state, { row: 3, col: 3 })).toBe(true);
    expect(inFutoshikiBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inFutoshikiBounds(state, { row: 0, col: 4 })).toBe(false);
    expect(isFutoshikiGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(isFutoshikiGiven(state, { row: 0, col: 1 })).toBe(false);
    expect(isFutoshikiGiven(state, { row: 9, col: 9 })).toBe(false);
  });
});

describe("futoshikiViolations", () => {
  it("행 중복을 검출한다", () => {
    let state = createFutoshiki(emptyPuzzle());
    state = setFutoshikiValue(state, { row: 0, col: 0 }, 2);
    state = setFutoshikiValue(state, { row: 0, col: 2 }, 2);
    const v = futoshikiViolations(state);
    expect(v).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    ]);
  });

  it("열 중복을 검출한다", () => {
    let state = createFutoshiki(emptyPuzzle());
    state = setFutoshikiValue(state, { row: 0, col: 1 }, 3);
    state = setFutoshikiValue(state, { row: 2, col: 1 }, 3);
    const v = futoshikiViolations(state);
    expect(v).toEqual([
      { row: 0, col: 1 },
      { row: 2, col: 1 },
    ]);
  });

  it("부등호 제약 위반(lt >= gt)을 검출한다", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: emptyPuzzle().givens,
      constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }],
    };
    let state = createFutoshiki(puzzle);
    state = setFutoshikiValue(state, { row: 0, col: 0 }, 3);
    state = setFutoshikiValue(state, { row: 0, col: 1 }, 2); // 3 >= 2 위반
    expect(futoshikiViolations(state)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it("같은 값도 부등호(lt >= gt) 위반으로 본다", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: emptyPuzzle().givens,
      constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 1, col: 0 } }],
    };
    let state = createFutoshiki(puzzle);
    state = setFutoshikiValue(state, { row: 0, col: 0 }, 2);
    state = setFutoshikiValue(state, { row: 1, col: 0 }, 2);
    expect(futoshikiViolations(state)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it("빈 칸이 낀 제약은 위반이 아니다", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: emptyPuzzle().givens,
      constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }],
    };
    let state = createFutoshiki(puzzle);
    state = setFutoshikiValue(state, { row: 0, col: 0 }, 4); // gt는 빈 칸
    expect(futoshikiViolations(state)).toEqual([]);
  });

  it("부등호가 충족되면 위반 없음", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: emptyPuzzle().givens,
      constraints: [{ lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }],
    };
    let state = createFutoshiki(puzzle);
    state = setFutoshikiValue(state, { row: 0, col: 0 }, 1);
    state = setFutoshikiValue(state, { row: 0, col: 1 }, 2);
    expect(futoshikiViolations(state)).toEqual([]);
  });
});

describe("isFutoshikiComplete / isFutoshikiSolved", () => {
  it("미완성이면 complete=false, solved=false", () => {
    const state = createFutoshiki(FUTOSHIKI_PUZZLES[0]!);
    expect(isFutoshikiComplete(state)).toBe(false);
    expect(isFutoshikiSolved(state)).toBe(false);
  });

  it("전부 채웠지만 위반이 있으면 complete=true, solved=false", () => {
    let state = createFutoshiki(emptyPuzzle());
    // 모든 칸 1 → 행/열 중복 다수.
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        state = setFutoshikiValue(state, { row, col }, 1);
      }
    }
    expect(isFutoshikiComplete(state)).toBe(true);
    expect(isFutoshikiSolved(state)).toBe(false);
  });

  it("내장 퍼즐을 정답으로 채우면 solved=true", () => {
    FUTOSHIKI_PUZZLES.forEach((puzzle, index) => {
      const state = fillToSolution(puzzle, SOLUTIONS[index]!);
      expect(isFutoshikiComplete(state)).toBe(true);
      expect(futoshikiViolations(state)).toEqual([]);
      expect(isFutoshikiSolved(state)).toBe(true);
    });
  });

  it("내장 퍼즐의 고정 단서가 정답과 일치한다", () => {
    FUTOSHIKI_PUZZLES.forEach((puzzle, index) => {
      const solution = SOLUTIONS[index]!;
      puzzle.givens.forEach((rowCells, row) => {
        rowCells.forEach((value, col) => {
          if (value !== null) {
            expect(value).toBe(solution[row]![col]);
          }
        });
      });
    });
  });
});
