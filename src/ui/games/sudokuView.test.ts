import { describe, expect, it } from "vitest";
import {
  createSudoku,
  placeSudokuValue,
  type SudokuGrid,
} from "../../domain/sudoku";
import {
  cellKey,
  conflictKeySet,
  sudokuCellLabel,
  sudokuProgressLabel,
  sudokuStatusMessage,
} from "./sudokuView";

const _ = null;

// 좌상단에 고정 단서 5가 있고 나머지는 빈 칸인 단순 보드.
const PUZZLE: SudokuGrid = [
  [5, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
];

describe("sudokuView.sudokuStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(sudokuStatusMessage("playing")).toBe("진행 중");
    expect(sudokuStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 충돌 없이 채웠습니다",
    );
  });
});

describe("sudokuView.cellKey / conflictKeySet", () => {
  it("좌표를 `row,col` 키로 변환한다", () => {
    expect(cellKey({ row: 3, col: 5 })).toBe("3,5");
  });

  it("충돌 좌표 목록을 키 집합으로 모은다", () => {
    const set = conflictKeySet([
      { row: 0, col: 1 },
      { row: 2, col: 8 },
    ]);
    expect(set.has("0,1")).toBe(true);
    expect(set.has("2,8")).toBe(true);
    expect(set.has("0,0")).toBe(false);
    expect(set.size).toBe(2);
  });

  it("빈 충돌 목록은 빈 집합", () => {
    expect(conflictKeySet([]).size).toBe(0);
  });
});

describe("sudokuView.sudokuCellLabel", () => {
  const state = createSudoku(PUZZLE);

  it("고정 단서 칸은 좌표와 값을 노출한다", () => {
    expect(sudokuCellLabel(state, { row: 0, col: 0 })).toBe(
      "1행 1열, 고정 단서 5",
    );
  });

  it("빈 칸은 '빈 칸'으로 표시한다", () => {
    expect(sudokuCellLabel(state, { row: 2, col: 4 })).toBe("3행 5열, 빈 칸");
  });

  it("입력 칸은 '입력 N', 충돌이면 '충돌'을 텍스트로 덧붙인다(색 비의존)", () => {
    const filled = placeSudokuValue(state, { row: 1, col: 1 }, 4);
    expect(sudokuCellLabel(filled, { row: 1, col: 1 })).toBe("2행 2열, 입력 4");
    expect(sudokuCellLabel(filled, { row: 1, col: 1 }, true)).toBe(
      "2행 2열, 입력 4, 충돌",
    );
  });
});

describe("sudokuView.sudokuProgressLabel", () => {
  it("채운 칸/남은 칸/충돌 수를 요약한다", () => {
    const state = createSudoku(PUZZLE); // 고정 단서 1칸만 채워짐.
    expect(sudokuProgressLabel(state, 0)).toBe(
      "채운 칸 1 · 남은 칸 80 · 충돌 0",
    );
    const filled = placeSudokuValue(state, { row: 0, col: 1 }, 5); // 같은 행 충돌.
    expect(sudokuProgressLabel(filled, 2)).toBe(
      "채운 칸 2 · 남은 칸 79 · 충돌 2",
    );
  });
});
