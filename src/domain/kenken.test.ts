import { describe, it, expect } from "vitest";
import {
  createKenKen,
  inKenKenBounds,
  isKenKenComplete,
  isKenKenSolved,
  kenKenViolations,
  setKenKenValue,
  type KenKenPuzzle,
  type KenKenState,
} from "./kenken";

// 손으로 만든 작은 3×3 퍼즐. 정답:
//   1 2 3
//   2 3 1
//   3 1 2
// 케이지: div(2) / sub(1) / add(4) / mul(6) 각 연산을 한 번씩 포함하고 모든 칸을 정확히 한 번 덮는다.
const PUZZLE_3: KenKenPuzzle = {
  size: 3,
  cages: [
    { op: "div", target: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // 2÷1
    { op: "sub", target: 1, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] }, // |2-3|
    { op: "add", target: 4, cells: [{ row: 2, col: 0 }, { row: 2, col: 1 }] }, // 3+1
    {
      op: "mul",
      target: 6,
      cells: [
        { row: 0, col: 2 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
    }, // 3·1·2
  ],
};
const SOLUTION_3: number[][] = [
  [1, 2, 3],
  [2, 3, 1],
  [3, 1, 2],
];

// 손으로 만든 4×4 퍼즐. 정답:
//   1 2 3 4
//   2 3 4 1
//   3 4 1 2
//   4 1 2 3
const PUZZLE_4: KenKenPuzzle = {
  size: 4,
  cages: [
    {
      op: "add",
      target: 6,
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    }, // 1+2+3
    {
      op: "mul",
      target: 48,
      cells: [{ row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 2 }],
    }, // 3·4·4
    {
      op: "add",
      target: 9,
      cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
    }, // 2+3+4
    {
      op: "mul",
      target: 6,
      cells: [{ row: 1, col: 3 }, { row: 2, col: 3 }, { row: 3, col: 3 }],
    }, // 1·2·3
    { op: "div", target: 2, cells: [{ row: 2, col: 2 }, { row: 3, col: 2 }] }, // 2÷1
    { op: "sub", target: 3, cells: [{ row: 3, col: 0 }, { row: 3, col: 1 }] }, // |4-1|
  ],
};
const SOLUTION_4: number[][] = [
  [1, 2, 3, 4],
  [2, 3, 4, 1],
  [3, 4, 1, 2],
  [4, 1, 2, 3],
];

/** 정답으로 모든 칸을 채운 상태를 만든다. */
function fillToSolution(puzzle: KenKenPuzzle, solution: number[][]): KenKenState {
  let state = createKenKen(puzzle);
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution.length; col += 1) {
      state = setKenKenValue(state, { row, col }, solution[row]![col]!);
    }
  }
  return state;
}

describe("createKenKen", () => {
  it("유효한 3×3 퍼즐로 빈 격자(전부 null) 상태를 만든다", () => {
    const state = createKenKen(PUZZLE_3);
    expect(state.size).toBe(3);
    expect(state.grid).toHaveLength(3);
    expect(state.grid.every((row) => row.length === 3)).toBe(true);
    expect(state.grid.flat().every((v) => v === null)).toBe(true);
    expect(state.cages).toHaveLength(4);
  });

  it("유효한 4×4 퍼즐도 만든다", () => {
    const state = createKenKen(PUZZLE_4);
    expect(state.size).toBe(4);
    expect(state.grid.flat()).toHaveLength(16);
    expect(state.grid.flat().every((v) => v === null)).toBe(true);
  });

  it("cages는 깊은 복사라 원본 퍼즐 변형이 상태에 영향을 주지 않는다", () => {
    const puzzle: KenKenPuzzle = {
      size: 2,
      cages: [
        { op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { op: "add", target: 3, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
      ],
    };
    const state = createKenKen(puzzle);
    // 원본 cells 배열을 변형해도 상태의 cells는 그대로.
    (puzzle.cages[0]!.cells as Array<{ row: number; col: number }>)[0]!.row = 9;
    expect(state.cages[0]!.cells[0]).toEqual({ row: 0, col: 0 });
  });

  it("size<2이면 throw", () => {
    expect(() =>
      createKenKen({ size: 1, cages: [{ op: "add", target: 1, cells: [{ row: 0, col: 0 }] }] }),
    ).toThrow(/2 이상/);
  });

  it("size가 정수가 아니면 throw", () => {
    expect(() => createKenKen({ size: 2.5, cages: PUZZLE_3.cages })).toThrow(/정수/);
  });

  it("케이지가 모든 칸을 덮지 못하면(미피복) throw", () => {
    const puzzle: KenKenPuzzle = {
      size: 3,
      cages: [{ op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }],
    };
    expect(() => createKenKen(puzzle)).toThrow(/모든 칸을 덮어야/);
  });

  it("같은 칸을 둘 이상의 케이지가 중복으로 덮으면 throw", () => {
    const puzzle: KenKenPuzzle = {
      size: 2,
      cages: [
        { op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 1, col: 1 }] }, // (0,0) 중복
      ],
    };
    expect(() => createKenKen(puzzle)).toThrow(/중복/);
  });

  it("잘못된 연산이면 throw", () => {
    const puzzle = {
      size: 2,
      cages: [
        { op: "mod", target: 1, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { op: "add", target: 3, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
      ],
    } as unknown as KenKenPuzzle;
    expect(() => createKenKen(puzzle)).toThrow(/연산/);
  });

  it("목표값이 0이거나 정수가 아니면 throw", () => {
    expect(() =>
      createKenKen({
        size: 2,
        cages: [
          { op: "add", target: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
          { op: "add", target: 3, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
        ],
      }),
    ).toThrow(/목표값/);
  });

  it("sub/div 케이지가 2칸을 초과하면 throw", () => {
    const puzzle: KenKenPuzzle = {
      size: 2,
      cages: [
        {
          op: "sub",
          target: 1,
          cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
        },
        { op: "add", target: 1, cells: [{ row: 1, col: 1 }] },
      ],
    };
    expect(() => createKenKen(puzzle)).toThrow(/2칸까지만/);
  });

  it("케이지 좌표가 격자 밖이면 throw", () => {
    const puzzle: KenKenPuzzle = {
      size: 2,
      cages: [
        { op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
        { op: "add", target: 3, cells: [{ row: 1, col: 0 }, { row: 9, col: 9 }] },
      ],
    };
    expect(() => createKenKen(puzzle)).toThrow(/격자/);
  });
});

describe("inKenKenBounds", () => {
  const state = createKenKen(PUZZLE_3);
  it("경계 안/밖/비정수 좌표를 구분한다", () => {
    expect(inKenKenBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inKenKenBounds(state, { row: 2, col: 2 })).toBe(true);
    expect(inKenKenBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inKenKenBounds(state, { row: 0, col: 3 })).toBe(false);
    expect(inKenKenBounds(state, { row: 0.5, col: 0 })).toBe(false);
  });
});

describe("setKenKenValue", () => {
  it("새 상태를 반환하고 원본 state를 변형하지 않는다(불변)", () => {
    const state = createKenKen(PUZZLE_3);
    const next = setKenKenValue(state, { row: 0, col: 0 }, 1);
    expect(next.grid[0]![0]).toBe(1);
    expect(state.grid[0]![0]).toBeNull(); // 원본 불변
    expect(next).not.toBe(state);
  });

  it("같은 칸 재입력·지우기(null)를 허용한다", () => {
    let state = createKenKen(PUZZLE_3);
    state = setKenKenValue(state, { row: 1, col: 1 }, 3);
    expect(state.grid[1]![1]).toBe(3);
    state = setKenKenValue(state, { row: 1, col: 1 }, 2); // 재입력
    expect(state.grid[1]![1]).toBe(2);
    state = setKenKenValue(state, { row: 1, col: 1 }, null); // 지우기
    expect(state.grid[1]![1]).toBeNull();
  });

  it("경계 밖 좌표면 throw", () => {
    const state = createKenKen(PUZZLE_3);
    expect(() => setKenKenValue(state, { row: 5, col: 0 }, 1)).toThrow(/경계 밖/);
  });

  it("1..N·null 외 값이면 throw", () => {
    const state = createKenKen(PUZZLE_3);
    expect(() => setKenKenValue(state, { row: 0, col: 0 }, 4)).toThrow(/잘못된 값/);
    expect(() => setKenKenValue(state, { row: 0, col: 0 }, 0)).toThrow(/잘못된 값/);
    expect(() =>
      setKenKenValue(state, { row: 0, col: 0 }, 1.5 as unknown as number),
    ).toThrow(/잘못된 값/);
  });
});

describe("kenKenViolations", () => {
  it("빈 격자/부분 채움은 위반이 없다(케이지 부분 채움은 평가 안 함)", () => {
    let state = createKenKen(PUZZLE_3);
    expect(kenKenViolations(state)).toEqual([]);
    // div 케이지의 한 칸만 채움(2÷? 평가 불가) → 위반 아님.
    state = setKenKenValue(state, { row: 0, col: 0 }, 3);
    expect(kenKenViolations(state)).toEqual([]);
  });

  it("같은 행 값 중복을 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    state = setKenKenValue(state, { row: 0, col: 0 }, 2);
    state = setKenKenValue(state, { row: 0, col: 1 }, 2);
    const v = kenKenViolations(state);
    expect(v).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    );
  });

  it("같은 열 값 중복을 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    state = setKenKenValue(state, { row: 0, col: 2 }, 1);
    state = setKenKenValue(state, { row: 1, col: 2 }, 1);
    const v = kenKenViolations(state);
    expect(v).toEqual(
      expect.arrayContaining([
        { row: 0, col: 2 },
        { row: 1, col: 2 },
      ]),
    );
  });

  it("덧셈(add) 케이지 산술 불일치를 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    // add 케이지 (2,0)+(2,1) target 4. 1+1=2 ≠ 4 → 위반.
    state = setKenKenValue(state, { row: 2, col: 0 }, 1);
    state = setKenKenValue(state, { row: 2, col: 1 }, 1);
    const keys = kenKenViolations(state).map((p) => `${p.row},${p.col}`);
    expect(keys).toEqual(expect.arrayContaining(["2,0", "2,1"]));
  });

  it("뺄셈(sub) 케이지 산술 불일치를 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    // sub 케이지 (1,0),(1,1) target 1. |1-3|=2 ≠ 1 → 위반.
    state = setKenKenValue(state, { row: 1, col: 0 }, 1);
    state = setKenKenValue(state, { row: 1, col: 1 }, 3);
    const keys = kenKenViolations(state).map((p) => `${p.row},${p.col}`);
    expect(keys).toEqual(expect.arrayContaining(["1,0", "1,1"]));
  });

  it("곱셈(mul) 케이지 산술 불일치를 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    // mul 케이지 (0,2),(1,2),(2,2) target 6. 1·1·1=1 ≠ 6 → 위반(단, 열 중복 위반도 함께 발생).
    state = setKenKenValue(state, { row: 0, col: 2 }, 1);
    state = setKenKenValue(state, { row: 1, col: 2 }, 2);
    state = setKenKenValue(state, { row: 2, col: 2 }, 2);
    // 1·2·2=4 ≠ 6 → 케이지 위반. (열 중복: col2에 2가 둘 → 그것도 위반)
    const keys = kenKenViolations(state).map((p) => `${p.row},${p.col}`);
    expect(keys).toEqual(expect.arrayContaining(["0,2", "1,2", "2,2"]));
  });

  it("나눗셈(div) 케이지 산술 불일치(나누어떨어지지 않음 포함)를 위반으로 모은다", () => {
    let state = createKenKen(PUZZLE_3);
    // div 케이지 (0,0),(0,1) target 2. 3,2 → 3÷2 정수 아님 → 위반.
    state = setKenKenValue(state, { row: 0, col: 0 }, 3);
    state = setKenKenValue(state, { row: 0, col: 1 }, 2);
    const keys = kenKenViolations(state).map((p) => `${p.row},${p.col}`);
    expect(keys).toEqual(expect.arrayContaining(["0,0", "0,1"]));
  });

  it("케이지 산술이 충족되면 위반이 아니다(순서 무관 sub/div)", () => {
    let state = createKenKen(PUZZLE_3);
    // sub 케이지 (1,0),(1,1) target 1: 3,2 → |3-2|=1 OK. div와 무관히 채워 다른 위반 없게.
    state = setKenKenValue(state, { row: 1, col: 0 }, 3);
    state = setKenKenValue(state, { row: 1, col: 1 }, 2);
    expect(kenKenViolations(state)).toEqual([]);
  });

  it("단일 칸 케이지는 값 === target일 때만 충족", () => {
    const puzzle: KenKenPuzzle = {
      size: 2,
      cages: [
        { op: "add", target: 1, cells: [{ row: 0, col: 0 }] }, // 고정값 1
        {
          op: "add",
          target: 5,
          cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
        },
      ],
    };
    let state = createKenKen(puzzle);
    state = setKenKenValue(state, { row: 0, col: 0 }, 2); // target 1 ≠ 2 → 위반
    const keys = kenKenViolations(state).map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    state = setKenKenValue(state, { row: 0, col: 0 }, 1); // target 1 충족 → 단독 위반 해제
    expect(kenKenViolations(state).map((p) => `${p.row},${p.col}`)).not.toContain("0,0");
  });

  it("위반 좌표는 중복 없이 (row,col) 오름차순 정렬", () => {
    let state = createKenKen(PUZZLE_3);
    state = setKenKenValue(state, { row: 1, col: 1 }, 2);
    state = setKenKenValue(state, { row: 1, col: 0 }, 2); // 행 중복
    const v = kenKenViolations(state);
    const sorted = [...v].sort((a, b) => a.row - b.row || a.col - b.col);
    expect(v).toEqual(sorted);
    const keys = v.map((p) => `${p.row},${p.col}`);
    expect(new Set(keys).size).toBe(keys.length); // 중복 없음
  });
});

describe("isKenKenComplete / isKenKenSolved", () => {
  it("완성된 3×3 정답은 클리어(true)", () => {
    const state = fillToSolution(PUZZLE_3, SOLUTION_3);
    expect(isKenKenComplete(state)).toBe(true);
    expect(kenKenViolations(state)).toEqual([]);
    expect(isKenKenSolved(state)).toBe(true);
  });

  it("완성된 4×4 정답은 클리어(true)", () => {
    const state = fillToSolution(PUZZLE_4, SOLUTION_4);
    expect(isKenKenSolved(state)).toBe(true);
  });

  it("한 칸이라도 비면 클리어 아님(false)", () => {
    let state = fillToSolution(PUZZLE_3, SOLUTION_3);
    state = setKenKenValue(state, { row: 0, col: 0 }, null);
    expect(isKenKenComplete(state)).toBe(false);
    expect(isKenKenSolved(state)).toBe(false);
  });

  it("전부 채워졌어도 위반이 있으면 클리어 아님(false)", () => {
    let state = createKenKen(PUZZLE_3);
    // 모든 칸을 1로 채움 → 행/열 중복·케이지 불일치 → 위반.
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        state = setKenKenValue(state, { row, col }, 1);
      }
    }
    expect(isKenKenComplete(state)).toBe(true);
    expect(isKenKenSolved(state)).toBe(false);
  });
});
