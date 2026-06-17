import { describe, expect, it } from "vitest";

import {
  createSudoku,
  inSudokuBounds,
  isSudokuComplete,
  isSudokuGiven,
  isSudokuSolved,
  placeSudokuValue,
  sudokuConflicts,
  type SudokuGrid,
} from "./sudoku";

const _ = null;

// 잘 알려진 유효 해답(모든 행·열·3×3 박스에 1~9가 중복 없이).
const SOLVED: SudokuGrid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

/** SOLVED에서 (row,col) 칸 하나만 비운 퍼즐 격자를 만든다. */
function solvedWithHole(row: number, col: number): SudokuGrid {
  return SOLVED.map((rowCells, r) =>
    rowCells.map((value, c) => (r === row && c === col ? null : value)),
  );
}

/** 전부 비어 있는(편집 자유) 9×9 격자. */
function emptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => _));
}

describe("createSudoku", () => {
  it("채워진 칸을 given=true, 빈 칸을 given=false로 표시한다", () => {
    const puzzle = emptyGrid();
    puzzle[0]![0] = 5;
    puzzle[4]![4] = 9;
    const state = createSudoku(puzzle);
    expect(state.given[0]![0]).toBe(true);
    expect(state.given[4]![4]).toBe(true);
    expect(state.given[0]![1]).toBe(false);
    expect(state.cells[0]![0]).toBe(5);
    expect(state.cells[0]![1]).toBe(null);
  });

  it("입력 격자를 깊은 복사해 외부 변형에 영향받지 않는다(불변)", () => {
    const puzzle = emptyGrid();
    puzzle[0]![0] = 5;
    const state = createSudoku(puzzle);
    puzzle[0]![0] = 9;
    expect(state.cells[0]![0]).toBe(5);
  });

  it("행 수가 9가 아니면 throw", () => {
    expect(() => createSudoku(SOLVED.slice(0, 8))).toThrow();
  });

  it("어떤 행의 칸 수가 9가 아니면 throw", () => {
    const bad = SOLVED.map((row) => row.slice());
    bad[0] = bad[0]!.slice(0, 8);
    expect(() => createSudoku(bad)).toThrow();
  });

  it("값이 1~9·null 외(0·10·소수)면 throw", () => {
    const withZero = emptyGrid();
    withZero[0]![0] = 0;
    expect(() => createSudoku(withZero)).toThrow();
    const withTen = emptyGrid();
    withTen[0]![0] = 10;
    expect(() => createSudoku(withTen)).toThrow();
    const withFloat = emptyGrid();
    withFloat[0]![0] = 1.5;
    expect(() => createSudoku(withFloat)).toThrow();
  });
});

describe("inSudokuBounds", () => {
  it("0..8 정수 좌표만 true", () => {
    expect(inSudokuBounds({ row: 0, col: 0 })).toBe(true);
    expect(inSudokuBounds({ row: 8, col: 8 })).toBe(true);
    expect(inSudokuBounds({ row: -1, col: 0 })).toBe(false);
    expect(inSudokuBounds({ row: 0, col: 9 })).toBe(false);
    expect(inSudokuBounds({ row: 1.5, col: 0 })).toBe(false);
  });
});

describe("isSudokuGiven", () => {
  it("고정 단서 칸과 입력 칸을 구분한다", () => {
    const puzzle = emptyGrid();
    puzzle[2]![3] = 4;
    const state = createSudoku(puzzle);
    expect(isSudokuGiven(state, { row: 2, col: 3 })).toBe(true);
    expect(isSudokuGiven(state, { row: 2, col: 4 })).toBe(false);
    expect(isSudokuGiven(state, { row: -1, col: 0 })).toBe(false);
  });
});

describe("placeSudokuValue", () => {
  it("빈 칸에 1~9를 넣고 null로 지운다", () => {
    const state = createSudoku(emptyGrid());
    const placed = placeSudokuValue(state, { row: 0, col: 0 }, 7);
    expect(placed.cells[0]![0]).toBe(7);
    const cleared = placeSudokuValue(placed, { row: 0, col: 0 }, null);
    expect(cleared.cells[0]![0]).toBe(null);
  });

  it("원본 state를 변형하지 않는다(불변)", () => {
    const state = createSudoku(emptyGrid());
    placeSudokuValue(state, { row: 0, col: 0 }, 7);
    expect(state.cells[0]![0]).toBe(null);
  });

  it("경계 밖/비정수 좌표면 throw", () => {
    const state = createSudoku(emptyGrid());
    expect(() => placeSudokuValue(state, { row: 9, col: 0 }, 1)).toThrow();
    expect(() => placeSudokuValue(state, { row: -1, col: 0 }, 1)).toThrow();
    expect(() => placeSudokuValue(state, { row: 0.5, col: 0 }, 1)).toThrow();
  });

  it("1~9·null 외 값이면 throw", () => {
    const state = createSudoku(emptyGrid());
    expect(() => placeSudokuValue(state, { row: 0, col: 0 }, 0)).toThrow();
    expect(() => placeSudokuValue(state, { row: 0, col: 0 }, 10)).toThrow();
    expect(() => placeSudokuValue(state, { row: 0, col: 0 }, 2.5)).toThrow();
  });

  it("고정 단서 칸 편집은 throw", () => {
    const puzzle = emptyGrid();
    puzzle[0]![0] = 5;
    const state = createSudoku(puzzle);
    expect(() => placeSudokuValue(state, { row: 0, col: 0 }, 6)).toThrow();
    expect(() => placeSudokuValue(state, { row: 0, col: 0 }, null)).toThrow();
  });
});

describe("sudokuConflicts", () => {
  it("충돌 없는 완성 보드는 빈 배열", () => {
    const state = createSudoku(SOLVED);
    expect(sudokuConflicts(state)).toEqual([]);
  });

  it("빈 칸은 충돌이 아니다", () => {
    const state = createSudoku(emptyGrid());
    expect(sudokuConflicts(state)).toEqual([]);
  });

  it("행 중복을 탐지한다", () => {
    // 빈 보드의 같은 행 두 칸에 같은 값.
    let state = createSudoku(emptyGrid());
    state = placeSudokuValue(state, { row: 0, col: 0 }, 5);
    state = placeSudokuValue(state, { row: 0, col: 8 }, 5);
    expect(sudokuConflicts(state)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 8 },
    ]);
  });

  it("열 중복을 탐지한다", () => {
    let state = createSudoku(emptyGrid());
    state = placeSudokuValue(state, { row: 0, col: 2 }, 3);
    state = placeSudokuValue(state, { row: 5, col: 2 }, 3);
    expect(sudokuConflicts(state)).toEqual([
      { row: 0, col: 2 },
      { row: 5, col: 2 },
    ]);
  });

  it("3×3 박스 중복을 탐지한다(다른 행·열)", () => {
    let state = createSudoku(emptyGrid());
    state = placeSudokuValue(state, { row: 0, col: 0 }, 4);
    state = placeSudokuValue(state, { row: 1, col: 1 }, 4);
    expect(sudokuConflicts(state)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it("반환 좌표는 (row,col) 오름차순으로 정렬되고 중복이 없다", () => {
    // (0,0)·(0,1)·(1,0)에 같은 값 → 행·열·박스가 동시에 충돌하지만 좌표는 한 번씩만.
    let state = createSudoku(emptyGrid());
    state = placeSudokuValue(state, { row: 0, col: 0 }, 7);
    state = placeSudokuValue(state, { row: 0, col: 1 }, 7);
    state = placeSudokuValue(state, { row: 1, col: 0 }, 7);
    expect(sudokuConflicts(state)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ]);
  });
});

describe("isSudokuComplete", () => {
  it("모든 칸이 채워지면 true, 한 칸이라도 비면 false", () => {
    expect(isSudokuComplete(createSudoku(SOLVED))).toBe(true);
    expect(isSudokuComplete(createSudoku(solvedWithHole(4, 4)))).toBe(false);
  });
});

describe("isSudokuSolved", () => {
  it("올바르게 완성된 보드는 true", () => {
    expect(isSudokuSolved(createSudoku(SOLVED))).toBe(true);
  });

  it("한 칸이라도 비면(미완성) false", () => {
    expect(isSudokuSolved(createSudoku(solvedWithHole(0, 0)))).toBe(false);
  });

  it("전부 채워졌어도 중복이 있으면 false", () => {
    // 빈 칸 하나에 같은 행의 기존 값과 충돌하는 값을 넣어 완성+중복 상태를 만든다.
    const hole = solvedWithHole(0, 0); // (0,0) 원래 5
    let state = createSudoku(hole);
    state = placeSudokuValue(state, { row: 0, col: 0 }, 3); // (0,1)이 3 → 행 중복
    expect(isSudokuComplete(state)).toBe(true);
    expect(isSudokuSolved(state)).toBe(false);
  });
});
