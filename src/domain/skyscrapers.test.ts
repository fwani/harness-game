import { describe, it, expect } from "vitest";
import {
  SKYSCRAPER_PUZZLES,
  createSkyscrapers,
  inSkyscraperBounds,
  isSkyscraperComplete,
  isSkyscraperGiven,
  isSkyscraperSolved,
  setSkyscraperValue,
  skyscraperViolations,
  type SkyscraperGrid,
  type SkyscraperPuzzle,
  type SkyscraperState,
} from "./skyscrapers";

// 내장 퍼즐(SKYSCRAPER_PUZZLES[0])의 정답(완성 격자). 풀이 가능성 검증에 사용.
const SOLUTIONS: number[][][] = [
  [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 3],
  ],
];

/** 정답으로 모든 빈 칸을 채운 상태를 만든다(고정 단서 칸은 건드리지 않음). */
function fillToSolution(
  puzzle: SkyscraperPuzzle,
  solution: number[][],
): SkyscraperState {
  let state = createSkyscrapers(puzzle);
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution.length; col += 1) {
      if (!isSkyscraperGiven(state, { row, col })) {
        state = setSkyscraperValue(state, { row, col }, solution[row]![col]!);
      }
    }
  }
  return state;
}

/** 단서 없는 단순 4×4 퍼즐(테스트 편의, 고정 단서 없음). */
function emptyPuzzle(size = 4): SkyscraperPuzzle {
  const line = Array.from({ length: size }, () => null);
  return {
    size,
    clues: { top: line, bottom: line, left: line, right: line },
  };
}

describe("createSkyscrapers", () => {
  it("size·givens 마스크·정규화된 clues를 만든다", () => {
    const state = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(state.size).toBe(4);
    expect(state.givens).toEqual([
      [true, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, true],
    ]);
    expect(state.grid[0]).toEqual([1, null, null, null]);
    expect(state.grid[3]).toEqual([null, null, null, 3]);
    expect(state.clues.top).toEqual([4, 3, 2, 1]);
    expect(state.clues.right).toEqual([1, 2, 2, 2]);
  });

  it("givens 생략 시 빈 격자·고정 단서 없음", () => {
    const state = createSkyscrapers(emptyPuzzle());
    expect(state.grid.flat().every((v) => v === null)).toBe(true);
    expect(state.givens.flat().every((g) => g === false)).toBe(true);
  });

  it("0/null 단서를 모두 null(없음)로 정규화한다", () => {
    const state = createSkyscrapers({
      size: 4,
      clues: {
        top: [0, null, 2, 0],
        bottom: [null, null, null, null],
        left: [4, 0, 0, null],
        right: [null, null, null, null],
      },
    });
    expect(state.clues.top).toEqual([null, null, 2, null]);
    expect(state.clues.left).toEqual([4, null, null, null]);
  });

  it("입력 퍼즐을 변형하지 않는다(불변, 깊은 복사)", () => {
    const puzzle = SKYSCRAPER_PUZZLES[0]!;
    const before = JSON.stringify(puzzle.givens);
    const state = createSkyscrapers(puzzle);
    state.grid[1]![1] = 3;
    expect(JSON.stringify(puzzle.givens)).toBe(before);
  });

  it("size가 2 미만이면 throw", () => {
    expect(() => createSkyscrapers({ ...emptyPuzzle(), size: 1 })).toThrow(
      /마천루/,
    );
  });

  it("단서 길이가 size와 다르면 throw", () => {
    expect(() =>
      createSkyscrapers({
        size: 4,
        clues: {
          top: [1, 2, 3],
          bottom: [null, null, null, null],
          left: [null, null, null, null],
          right: [null, null, null, null],
        },
      }),
    ).toThrow(/단서/);
  });

  it("단서 값이 1..N 밖이면 throw", () => {
    expect(() =>
      createSkyscrapers({
        size: 4,
        clues: {
          top: [5, null, null, null],
          bottom: [null, null, null, null],
          left: [null, null, null, null],
          right: [null, null, null, null],
        },
      }),
    ).toThrow(/단서/);
  });

  it("givens가 비정사각이면 throw", () => {
    expect(() =>
      createSkyscrapers({
        ...emptyPuzzle(),
        givens: [
          [1, 2, 3],
          [null, null, null],
        ] as SkyscraperGrid,
      }),
    ).toThrow(/고정 단서/);
  });

  it("givens 값이 1..N 밖이면 throw", () => {
    expect(() =>
      createSkyscrapers({
        ...emptyPuzzle(),
        givens: [
          [9, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
      }),
    ).toThrow(/고정 단서/);
  });
});

describe("setSkyscraperValue", () => {
  it("빈 칸을 채우고 null로 되돌린다(불변)", () => {
    const state = createSkyscrapers(emptyPuzzle());
    const filled = setSkyscraperValue(state, { row: 1, col: 2 }, 3);
    expect(filled.grid[1]![2]).toBe(3);
    expect(state.grid[1]![2]).toBe(null); // 원본 불변.

    const cleared = setSkyscraperValue(filled, { row: 1, col: 2 }, null);
    expect(cleared.grid[1]![2]).toBe(null);
    expect(filled.grid[1]![2]).toBe(3);
  });

  it("고정 단서 칸 수정은 throw", () => {
    const state = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(isSkyscraperGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() => setSkyscraperValue(state, { row: 0, col: 0 }, 2)).toThrow(
      /고정 단서/,
    );
  });

  it("경계 밖 좌표는 throw", () => {
    const state = createSkyscrapers(emptyPuzzle());
    expect(() => setSkyscraperValue(state, { row: 4, col: 0 }, 1)).toThrow(
      /경계 밖/,
    );
    expect(() => setSkyscraperValue(state, { row: 0, col: -1 }, 1)).toThrow(
      /경계 밖/,
    );
  });

  it("값 범위(1..N) 밖은 throw", () => {
    const state = createSkyscrapers(emptyPuzzle());
    expect(() => setSkyscraperValue(state, { row: 0, col: 0 }, 0)).toThrow(
      /잘못된 값/,
    );
    expect(() => setSkyscraperValue(state, { row: 0, col: 0 }, 5)).toThrow(
      /잘못된 값/,
    );
    expect(() => setSkyscraperValue(state, { row: 0, col: 0 }, 1.5)).toThrow(
      /잘못된 값/,
    );
  });
});

describe("inSkyscraperBounds / isSkyscraperGiven", () => {
  it("경계와 고정 단서를 판정한다", () => {
    const state = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(inSkyscraperBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inSkyscraperBounds(state, { row: 3, col: 3 })).toBe(true);
    expect(inSkyscraperBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inSkyscraperBounds(state, { row: 0, col: 4 })).toBe(false);
    expect(isSkyscraperGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(isSkyscraperGiven(state, { row: 0, col: 1 })).toBe(false);
    expect(isSkyscraperGiven(state, { row: 9, col: 9 })).toBe(false);
  });
});

describe("skyscraperViolations", () => {
  it("행 중복을 검출한다", () => {
    let state = createSkyscrapers(emptyPuzzle());
    state = setSkyscraperValue(state, { row: 0, col: 0 }, 2);
    state = setSkyscraperValue(state, { row: 0, col: 2 }, 2);
    expect(skyscraperViolations(state)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    ]);
  });

  it("열 중복을 검출한다", () => {
    let state = createSkyscrapers(emptyPuzzle());
    state = setSkyscraperValue(state, { row: 0, col: 1 }, 3);
    state = setSkyscraperValue(state, { row: 2, col: 1 }, 3);
    expect(skyscraperViolations(state)).toEqual([
      { row: 0, col: 1 },
      { row: 2, col: 1 },
    ]);
  });

  it("가득 찬 행의 left 단서 불일치를 검출한다", () => {
    // left=1 은 첫 칸이 가장 높아야(=4) 1개만 보임. 1 2 3 4 는 4개 보임 → 위반.
    const state0 = createSkyscrapers({
      size: 4,
      clues: {
        top: [null, null, null, null],
        bottom: [null, null, null, null],
        left: [1, null, null, null],
        right: [null, null, null, null],
      },
    });
    let state = state0;
    const rowVals = [1, 2, 3, 4];
    rowVals.forEach((v, col) => {
      state = setSkyscraperValue(state, { row: 0, col }, v);
    });
    expect(skyscraperViolations(state)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it("가득 찬 행의 right 단서가 맞으면 위반 아님", () => {
    // right=1: 오른쪽에서 첫 칸(맨 오른쪽)이 가장 높음 → 1개만 보임. 1 2 3 4 → 오른쪽 4가 최고 → OK.
    const state0 = createSkyscrapers({
      size: 4,
      clues: {
        top: [null, null, null, null],
        bottom: [null, null, null, null],
        left: [null, null, null, null],
        right: [1, null, null, null],
      },
    });
    let state = state0;
    [1, 2, 3, 4].forEach((v, col) => {
      state = setSkyscraperValue(state, { row: 0, col }, v);
    });
    expect(skyscraperViolations(state)).toEqual([]);
  });

  it("빈 칸이 있는 줄은 단서 위반으로 보지 않는다", () => {
    const state0 = createSkyscrapers({
      size: 4,
      clues: {
        top: [null, null, null, null],
        bottom: [null, null, null, null],
        left: [1, null, null, null], // 충족 불가능한 값이지만 줄이 미완성
        right: [null, null, null, null],
      },
    });
    let state = state0;
    state = setSkyscraperValue(state, { row: 0, col: 0 }, 1);
    state = setSkyscraperValue(state, { row: 0, col: 1 }, 2);
    // (0,2),(0,3)는 빈 칸 → 단서 미판정, 중복도 없음.
    expect(skyscraperViolations(state)).toEqual([]);
  });

  it("가득 찬 열의 top 단서 불일치를 검출한다", () => {
    const state0 = createSkyscrapers({
      size: 4,
      clues: {
        top: [1, null, null, null], // 위에서 1개만 보여야 함 → 맨 위 4
        bottom: [null, null, null, null],
        left: [null, null, null, null],
        right: [null, null, null, null],
      },
    });
    let state = state0;
    [1, 2, 3, 4].forEach((v, row) => {
      state = setSkyscraperValue(state, { row, col: 0 }, v); // 1 2 3 4 → 4개 보임 → 위반
    });
    expect(skyscraperViolations(state)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ]);
  });
});

describe("isSkyscraperComplete / isSkyscraperSolved", () => {
  it("미완성이면 complete=false, solved=false", () => {
    const state = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(isSkyscraperComplete(state)).toBe(false);
    expect(isSkyscraperSolved(state)).toBe(false);
  });

  it("전부 채웠지만 위반이 있으면 complete=true, solved=false", () => {
    let state = createSkyscrapers(emptyPuzzle());
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        state = setSkyscraperValue(state, { row, col }, 1);
      }
    }
    expect(isSkyscraperComplete(state)).toBe(true);
    expect(isSkyscraperSolved(state)).toBe(false);
  });

  it("내장 퍼즐을 정답으로 채우면 위반 0·solved=true", () => {
    SKYSCRAPER_PUZZLES.forEach((puzzle, index) => {
      const state = fillToSolution(puzzle, SOLUTIONS[index]!);
      expect(isSkyscraperComplete(state)).toBe(true);
      expect(skyscraperViolations(state)).toEqual([]);
      expect(isSkyscraperSolved(state)).toBe(true);
    });
  });

  it("내장 퍼즐의 고정 단서가 정답과 일치한다", () => {
    SKYSCRAPER_PUZZLES.forEach((puzzle, index) => {
      const solution = SOLUTIONS[index]!;
      (puzzle.givens ?? []).forEach((rowCells, row) => {
        rowCells.forEach((value, col) => {
          if (value !== null) {
            expect(value).toBe(solution[row]![col]);
          }
        });
      });
    });
  });
});
