import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUDOKU_DIFFICULTY,
  SUDOKU_DIFFICULTY_OPTIONS,
  normalizeSudokuDifficulty,
  sudokuDifficultyLabel,
} from "./sudokuStartOptionsView";
import type { SudokuDifficulty } from "../../application/playSudoku";

describe("SUDOKU_DIFFICULTY_OPTIONS", () => {
  it("초급/중급/고급 3개 난이도를 쉬움→어려움 순서로 제공한다", () => {
    expect(SUDOKU_DIFFICULTY_OPTIONS.map((o) => o.id)).toEqual([
      "easy",
      "medium",
      "hard",
    ]);
  });

  it("각 선택지는 비어 있지 않은 한국어 라벨을 가진다(색 비의존 텍스트)", () => {
    for (const option of SUDOKU_DIFFICULTY_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("기본 난이도는 중급이며 옵션 목록에 포함된다", () => {
    expect(DEFAULT_SUDOKU_DIFFICULTY).toBe("medium");
    expect(SUDOKU_DIFFICULTY_OPTIONS.map((o) => o.id)).toContain(
      DEFAULT_SUDOKU_DIFFICULTY,
    );
  });
});

describe("sudokuDifficultyLabel", () => {
  it("난이도 값에 해당하는 옵션 라벨을 반환한다", () => {
    const difficulties: SudokuDifficulty[] = ["easy", "medium", "hard"];
    for (const d of difficulties) {
      const expected = SUDOKU_DIFFICULTY_OPTIONS.find((o) => o.id === d)!.label;
      expect(sudokuDifficultyLabel(d)).toBe(expected);
    }
  });
});

describe("normalizeSudokuDifficulty", () => {
  it("지원하는 id는 그대로 반환한다", () => {
    expect(normalizeSudokuDifficulty("easy")).toBe("easy");
    expect(normalizeSudokuDifficulty("medium")).toBe("medium");
    expect(normalizeSudokuDifficulty("hard")).toBe("hard");
  });

  it("미지정·미지원 id는 기본 난이도(중급)로 폴백한다", () => {
    expect(normalizeSudokuDifficulty()).toBe("medium");
    expect(normalizeSudokuDifficulty("unknown")).toBe("medium");
    expect(normalizeSudokuDifficulty("")).toBe("medium");
  });
});
