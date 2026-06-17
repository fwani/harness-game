import { describe, expect, it } from "vitest";

import {
  createNonogram,
  inNonogramBounds,
  isNonogramSolved,
  markNonogramCell,
  nonogramColumnClues,
  nonogramRowClues,
  type NonogramSolution,
  type NonogramState,
} from "./nonogram";

const T = true;
const F = false;

// 해답대로 모든 채운 칸을 filled로 표시한 상태(클리어 상태).
function fillAll(state: NonogramState): NonogramState {
  let next = state;
  state.solution.forEach((rowCells, row) =>
    rowCells.forEach((cell, col) => {
      if (cell) {
        next = markNonogramCell(next, { row, col }, "filled");
      }
    }),
  );
  return next;
}

describe("createNonogram", () => {
  it("marks를 전부 empty로 초기화한다", () => {
    const solution: NonogramSolution = [
      [T, F],
      [F, T],
    ];
    const state = createNonogram(solution);
    expect(state.marks).toEqual([
      ["empty", "empty"],
      ["empty", "empty"],
    ]);
    expect(state.solution).toEqual(solution);
  });

  it("입력 해답을 깊은 복사해 외부 변형에 영향받지 않는다", () => {
    const solution: NonogramSolution = [[T, F]];
    const state = createNonogram(solution);
    solution[0]![0] = F; // 외부에서 원본 변형
    expect(state.solution[0]![0]).toBe(true);
  });

  it("비직사각(행 길이 불일치) 해답은 throw", () => {
    expect(() => createNonogram([[T, F], [T]])).toThrow();
  });

  it("0크기(행 없음/0폭) 해답은 throw", () => {
    expect(() => createNonogram([])).toThrow();
    expect(() => createNonogram([[]])).toThrow();
  });

  it("채운 칸이 하나도 없는 해답은 throw(빈 퍼즐 금지)", () => {
    expect(() =>
      createNonogram([
        [F, F],
        [F, F],
      ]),
    ).toThrow();
  });
});

describe("nonogramRowClues / nonogramColumnClues", () => {
  it("빈 행/열은 [] 단서", () => {
    const solution: NonogramSolution = [
      [F, T],
      [F, F],
    ];
    // 행0: _■ → [1], 행1: __ → []
    expect(nonogramRowClues(solution)).toEqual([[1], []]);
    // 열0: __ → [], 열1: ■_ → [1]
    expect(nonogramColumnClues(solution)).toEqual([[], [1]]);
  });

  it("한 묶음 / 여러 묶음을 좌→우, 상→하 순서로 유도", () => {
    // ■ ■ _ ■ → [2, 1]
    expect(nonogramRowClues([[T, T, F, T]])).toEqual([[2, 1]]);
    // ■ _ ■ ■ ■ → [1, 3]
    expect(nonogramRowClues([[T, F, T, T, T]])).toEqual([[1, 3]]);
  });

  it("가득 찬 행/열은 길이 하나짜리 단서", () => {
    const solution: NonogramSolution = [
      [T, T, T],
      [T, T, T],
    ];
    expect(nonogramRowClues(solution)).toEqual([[3], [3]]);
    expect(nonogramColumnClues(solution)).toEqual([[2], [2], [2]]);
  });

  it("열 단서를 상→하 순서로 유도", () => {
    const solution: NonogramSolution = [
      [T, F],
      [F, F],
      [T, T],
    ];
    // 열0: ■ _ ■ → [1, 1], 열1: _ _ ■ → [1]
    expect(nonogramColumnClues(solution)).toEqual([[1, 1], [1]]);
  });
});

describe("inNonogramBounds", () => {
  const state = createNonogram([
    [T, F],
    [F, T],
  ]);

  it("경계 안 정수 좌표는 true", () => {
    expect(inNonogramBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inNonogramBounds(state, { row: 1, col: 1 })).toBe(true);
  });

  it("경계 밖/음수/비정수 좌표는 false", () => {
    expect(inNonogramBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inNonogramBounds(state, { row: 2, col: 0 })).toBe(false);
    expect(inNonogramBounds(state, { row: 0, col: 2 })).toBe(false);
    expect(inNonogramBounds(state, { row: 0.5, col: 0 })).toBe(false);
  });
});

describe("markNonogramCell", () => {
  const base = createNonogram([
    [T, F],
    [F, T],
  ]);

  it("표시를 바꾼 새 상태를 반환하고 원본은 불변", () => {
    const next = markNonogramCell(base, { row: 0, col: 0 }, "filled");
    expect(next.marks[0]![0]).toBe("filled");
    // 원본 미변형
    expect(base.marks[0]![0]).toBe("empty");
    // 다른 칸은 그대로
    expect(next.marks[1]![1]).toBe("empty");
    expect(next).not.toBe(base);
  });

  it("filled/crossed/empty 표시를 모두 적용할 수 있다", () => {
    let s = markNonogramCell(base, { row: 0, col: 1 }, "crossed");
    expect(s.marks[0]![1]).toBe("crossed");
    s = markNonogramCell(s, { row: 0, col: 1 }, "empty");
    expect(s.marks[0]![1]).toBe("empty");
  });

  it("경계 밖/비정수 좌표는 throw(조용한 무시 금지)", () => {
    expect(() => markNonogramCell(base, { row: 2, col: 0 }, "filled")).toThrow();
    expect(() => markNonogramCell(base, { row: -1, col: 0 }, "filled")).toThrow();
    expect(() => markNonogramCell(base, { row: 0.5, col: 0 }, "filled")).toThrow();
  });

  it("알 수 없는 표시는 throw", () => {
    expect(() =>
      markNonogramCell(base, { row: 0, col: 0 }, "unknown" as never),
    ).toThrow();
  });
});

describe("isNonogramSolved", () => {
  const solution: NonogramSolution = [
    [T, F],
    [T, T],
  ];

  it("해답대로 모두 filled면 true", () => {
    const solved = fillAll(createNonogram(solution));
    expect(isNonogramSolved(solved)).toBe(true);
  });

  it("일부 누락(filled 부족)이면 false", () => {
    const state = markNonogramCell(createNonogram(solution), { row: 0, col: 0 }, "filled");
    expect(isNonogramSolved(state)).toBe(false);
  });

  it("해답이 아닌 칸을 초과 칠하면 false", () => {
    const over = markNonogramCell(fillAll(createNonogram(solution)), { row: 0, col: 1 }, "filled");
    expect(isNonogramSolved(over)).toBe(false);
  });

  it("해답이 아닌 칸을 X/빈으로 둬도 판정 무관(칠한 칸만으로 판정)", () => {
    // 정답대로 filled 한 뒤, 비어야 할 칸(0,1)에 crossed 표시 → 여전히 클리어.
    const solved = markNonogramCell(fillAll(createNonogram(solution)), { row: 0, col: 1 }, "crossed");
    expect(isNonogramSolved(solved)).toBe(true);
  });

  it("시작 상태(전부 empty)는 클리어 아님", () => {
    expect(isNonogramSolved(createNonogram(solution))).toBe(false);
  });
});
