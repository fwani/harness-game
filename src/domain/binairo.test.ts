import { describe, it, expect } from "vitest";
import {
  BINAIRO_PUZZLES,
  binairoViolations,
  createBinairo,
  inBinairoBounds,
  isBinairoComplete,
  isBinairoGiven,
  isBinairoSolved,
  setBinairoValue,
  type BinairoGrid,
  type BinairoState,
} from "./binairo";

// 내장 퍼즐(BINAIRO_PUZZLES)에 대응하는 정답(빈 칸을 채운 완성 격자). 테스트에서 풀이 가능성 검증에 사용.
const SOLUTIONS: BinairoGrid[] = [
  [
    [0, 0, 1, 0, 1, 1],
    [0, 0, 1, 1, 0, 1],
    [1, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 1],
    [1, 0, 1, 1, 0, 0],
    [1, 1, 0, 1, 0, 0],
  ],
  [
    [0, 0, 1, 0, 1, 1],
    [0, 0, 1, 1, 0, 1],
    [1, 1, 0, 0, 1, 0],
    [0, 1, 1, 0, 1, 0],
    [1, 0, 0, 1, 0, 1],
    [1, 1, 0, 1, 0, 0],
  ],
];

/** 정답으로 모든 빈 칸을 채운 상태를 만든다. */
function fillToSolution(puzzle: BinairoGrid, solution: BinairoGrid): BinairoState {
  let state = createBinairo(puzzle);
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution.length; col += 1) {
      if (!isBinairoGiven(state, { row, col })) {
        state = setBinairoValue(state, { row, col }, solution[row]![col]!);
      }
    }
  }
  return state;
}

describe("createBinairo", () => {
  it("givens 마스크를 채워진 칸 기준으로 정확히 만든다", () => {
    const puzzle: BinairoGrid = [
      [0, null, 1, null],
      [null, 1, null, 0],
      [1, null, 0, null],
      [null, 0, null, 1],
    ];
    const state = createBinairo(puzzle);
    expect(state.givens).toEqual([
      [true, false, true, false],
      [false, true, false, true],
      [true, false, true, false],
      [false, true, false, true],
    ]);
    expect(state.grid).toEqual(puzzle);
  });

  it("입력 격자를 깊은 복사해 원본과 분리한다(불변)", () => {
    const puzzle: BinairoGrid = [
      [0, 1],
      [1, 0],
    ];
    const state = createBinairo(puzzle);
    puzzle[0]![0] = 1;
    expect(state.grid[0]![0]).toBe(0);
  });

  it("비정사각/홀수 변/잘못된 값/들쭉날쭉 입력을 거부한다(throw)", () => {
    // 홀수 변
    expect(() =>
      createBinairo([
        [0, 1, null],
        [1, 0, 1],
        [null, 1, 0],
      ]),
    ).toThrow();
    // 비정사각(행 수 != 열 수)
    expect(() =>
      createBinairo([
        [0, 1],
        [1, 0],
        [0, 1],
        [1, 0],
      ] as BinairoGrid),
    ).toThrow();
    // 들쭉날쭉(행 길이 불일치)
    expect(() =>
      createBinairo([
        [0, 1, 0, 1],
        [1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
      ] as BinairoGrid),
    ).toThrow();
    // 잘못된 값(2)
    expect(() =>
      createBinairo([
        [0, 1],
        [1, 2],
      ] as unknown as BinairoGrid),
    ).toThrow();
    // 빈 격자
    expect(() => createBinairo([])).toThrow();
  });
});

describe("inBinairoBounds / isBinairoGiven", () => {
  const state = createBinairo([
    [0, null],
    [null, 1],
  ]);
  it("경계 판정", () => {
    expect(inBinairoBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inBinairoBounds(state, { row: 1, col: 1 })).toBe(true);
    expect(inBinairoBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inBinairoBounds(state, { row: 0, col: 2 })).toBe(false);
    expect(inBinairoBounds(state, { row: 0.5, col: 0 })).toBe(false);
  });
  it("고정 단서 판정", () => {
    expect(isBinairoGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(isBinairoGiven(state, { row: 0, col: 1 })).toBe(false);
    expect(isBinairoGiven(state, { row: 5, col: 5 })).toBe(false);
  });
});

describe("setBinairoValue", () => {
  const base = createBinairo([
    [0, null],
    [null, 1],
  ]);

  it("빈 칸에 0/1을 채우고 null로 되돌린다", () => {
    const filled = setBinairoValue(base, { row: 0, col: 1 }, 1);
    expect(filled.grid[0]![1]).toBe(1);
    const cleared = setBinairoValue(filled, { row: 0, col: 1 }, null);
    expect(cleared.grid[0]![1]).toBeNull();
  });

  it("원본 상태를 변형하지 않는다(불변)", () => {
    setBinairoValue(base, { row: 1, col: 0 }, 0);
    expect(base.grid[1]![0]).toBeNull();
  });

  it("고정 단서 칸 편집을 거부한다(throw)", () => {
    expect(() => setBinairoValue(base, { row: 0, col: 0 }, 1)).toThrow();
    expect(() => setBinairoValue(base, { row: 1, col: 1 }, 0)).toThrow();
  });

  it("범위 밖 좌표를 거부한다(throw)", () => {
    expect(() => setBinairoValue(base, { row: 2, col: 0 }, 1)).toThrow();
    expect(() => setBinairoValue(base, { row: 0, col: -1 }, 1)).toThrow();
  });

  it("잘못된 값을 거부한다(throw)", () => {
    expect(() =>
      setBinairoValue(base, { row: 0, col: 1 }, 2 as unknown as 0),
    ).toThrow();
  });
});

describe("binairoViolations", () => {
  it("완전한 정답(위반 없음)이면 빈 배열을 반환한다", () => {
    const state = createBinairo([
      [0, 0, 1, 1],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [1, 0, 0, 1],
    ]);
    expect(binairoViolations(state)).toEqual([]);
  });

  it("빈 칸은 위반이 아니다", () => {
    const state = createBinairo([
      [null, null],
      [null, null],
    ]);
    expect(binairoViolations(state)).toEqual([]);
  });

  it("같은 값 3연속(가로)을 검출한다", () => {
    const state = createBinairo([
      [1, 1, 1, 0],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const v = binairoViolations(state);
    expect(v).toContainEqual({ row: 0, col: 0 });
    expect(v).toContainEqual({ row: 0, col: 1 });
    expect(v).toContainEqual({ row: 0, col: 2 });
    expect(v).not.toContainEqual({ row: 0, col: 3 });
  });

  it("같은 값 3연속(세로)을 검출한다", () => {
    const state = createBinairo([
      [0, null, null, null],
      [0, null, null, null],
      [0, null, null, null],
      [null, null, null, null],
    ]);
    const v = binairoViolations(state);
    expect(v).toContainEqual({ row: 0, col: 0 });
    expect(v).toContainEqual({ row: 1, col: 0 });
    expect(v).toContainEqual({ row: 2, col: 0 });
  });

  it("한 행에서 같은 값이 절반을 초과하면 검출한다", () => {
    // 4칸 변, 절반=2. 0이 3개(절반 초과)지만 3연속은 아니도록 0,1,0,0 배치.
    const state = createBinairo([
      [0, 1, 0, 0],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const v = binairoViolations(state);
    // 행0의 0인 칸들(col 0,2,3) 표시, 1인 칸(col1) 제외.
    expect(v).toContainEqual({ row: 0, col: 0 });
    expect(v).toContainEqual({ row: 0, col: 2 });
    expect(v).toContainEqual({ row: 0, col: 3 });
    expect(v).not.toContainEqual({ row: 0, col: 1 });
  });

  it("한 열에서 같은 값이 절반을 초과하면 검출한다", () => {
    const state = createBinairo([
      [1, null, null, null],
      [0, null, null, null],
      [1, null, null, null],
      [1, null, null, null],
    ]);
    const v = binairoViolations(state);
    expect(v).toContainEqual({ row: 0, col: 0 });
    expect(v).toContainEqual({ row: 2, col: 0 });
    expect(v).toContainEqual({ row: 3, col: 0 });
    expect(v).not.toContainEqual({ row: 1, col: 0 });
  });

  it("완전히 채워진 동일한 두 행을 검출한다", () => {
    const state = createBinairo([
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ]);
    const v = binairoViolations(state);
    // 행1과 행2가 동일(1010) → 두 행 모두 표시.
    expect(v).toContainEqual({ row: 1, col: 0 });
    expect(v).toContainEqual({ row: 2, col: 0 });
    // 행0과 행3도 동일(0101).
    expect(v).toContainEqual({ row: 0, col: 0 });
    expect(v).toContainEqual({ row: 3, col: 0 });
  });

  it("부분적으로 같은(미완성) 두 행은 중복 위반이 아니다", () => {
    const state = createBinairo([
      [0, 1, null, null],
      [0, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    // 두 행이 미완성이므로 '동일 행' 위반으로 표시되지 않는다(개수/3연속 위반도 없음).
    expect(binairoViolations(state)).toEqual([]);
  });

  it("반환 좌표는 (row,col) 오름차순으로 정렬되고 중복이 없다", () => {
    const state = createBinairo([
      [1, 1, 1, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const v = binairoViolations(state);
    const keys = v.map((p) => `${p.row},${p.col}`);
    expect(new Set(keys).size).toBe(keys.length);
    const sorted = [...v].sort((a, b) => a.row - b.row || a.col - b.col);
    expect(v).toEqual(sorted);
  });
});

describe("isBinairoComplete / isBinairoSolved", () => {
  it("빈 칸이 있으면 complete=false, solved=false", () => {
    const state = createBinairo(BINAIRO_PUZZLES[0]!);
    expect(isBinairoComplete(state)).toBe(false);
    expect(isBinairoSolved(state)).toBe(false);
  });

  it("전부 채워졌지만 위반이 있으면 solved=false", () => {
    const state = createBinairo([
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ]);
    expect(isBinairoComplete(state)).toBe(true);
    expect(isBinairoSolved(state)).toBe(false); // 동일 행 위반
  });

  it("정답 격자는 complete=true, solved=true", () => {
    for (const solution of SOLUTIONS) {
      const state = createBinairo(solution);
      expect(isBinairoComplete(state)).toBe(true);
      expect(binairoViolations(state)).toEqual([]);
      expect(isBinairoSolved(state)).toBe(true);
    }
  });
});

describe("BINAIRO_PUZZLES", () => {
  it("6×6 짝수 변 퍼즐을 2개 이상 제공하고, 각 퍼즐은 빈 칸을 포함한다", () => {
    expect(BINAIRO_PUZZLES.length).toBeGreaterThanOrEqual(2);
    for (const puzzle of BINAIRO_PUZZLES) {
      expect(puzzle.length).toBe(6);
      for (const row of puzzle) {
        expect(row.length).toBe(6);
      }
      const hasEmpty = puzzle.some((row) => row.some((v) => v === null));
      expect(hasEmpty).toBe(true);
      // createBinairo로 생성 가능(유효 격자).
      expect(() => createBinairo(puzzle)).not.toThrow();
    }
  });

  it("내장 퍼즐의 고정 단서는 대응 정답과 일치하며, 정답으로 채우면 solved=true(풀이 가능)", () => {
    expect(SOLUTIONS.length).toBe(BINAIRO_PUZZLES.length);
    BINAIRO_PUZZLES.forEach((puzzle, idx) => {
      const solution = SOLUTIONS[idx]!;
      // 고정 단서는 정답과 모순되지 않아야 한다.
      puzzle.forEach((row, r) => {
        row.forEach((value, c) => {
          if (value !== null) {
            expect(value).toBe(solution[r]![c]);
          }
        });
      });
      const solved = fillToSolution(puzzle, solution);
      expect(isBinairoSolved(solved)).toBe(true);
    });
  });
});
