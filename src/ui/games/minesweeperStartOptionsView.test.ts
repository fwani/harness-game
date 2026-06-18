import { describe, expect, it } from "vitest";
import {
  DEFAULT_MINESWEEPER_DIFFICULTY,
  MINESWEEPER_DIFFICULTIES,
  normalizeMinesweeperDifficulty,
} from "./minesweeperStartOptionsView";

describe("MINESWEEPER_DIFFICULTIES", () => {
  it("표준 3단계(초급/중급/고급)를 순서대로 제공한다", () => {
    expect(MINESWEEPER_DIFFICULTIES.map((d) => d.id)).toEqual([
      "beginner",
      "intermediate",
      "expert",
    ]);
  });

  it("각 프리셋의 보드 크기·지뢰 수는 표준 값과 일치한다", () => {
    expect(MINESWEEPER_DIFFICULTIES).toEqual([
      { id: "beginner", label: "초급 9×9·💣10", rows: 9, cols: 9, mines: 10 },
      { id: "intermediate", label: "중급 16×16·💣40", rows: 16, cols: 16, mines: 40 },
      { id: "expert", label: "고급 30×16·💣99", rows: 16, cols: 30, mines: 99 },
    ]);
  });

  it("지뢰 수는 칸 수보다 적다(배치 가능)", () => {
    for (const d of MINESWEEPER_DIFFICULTIES) {
      expect(d.mines).toBeLessThan(d.rows * d.cols);
    }
  });
});

describe("normalizeMinesweeperDifficulty", () => {
  it("지원하는 id는 해당 프리셋을 반환한다", () => {
    for (const d of MINESWEEPER_DIFFICULTIES) {
      expect(normalizeMinesweeperDifficulty(d.id)).toEqual(d);
    }
  });

  it("미지정 시 기본 난이도(초급)로 폴백한다", () => {
    expect(normalizeMinesweeperDifficulty()).toEqual(DEFAULT_MINESWEEPER_DIFFICULTY);
    expect(DEFAULT_MINESWEEPER_DIFFICULTY.id).toBe("beginner");
  });

  it("미지원 id는 기본 난이도(초급)로 폴백한다", () => {
    expect(normalizeMinesweeperDifficulty("custom")).toEqual(
      DEFAULT_MINESWEEPER_DIFFICULTY,
    );
    expect(normalizeMinesweeperDifficulty("")).toEqual(
      DEFAULT_MINESWEEPER_DIFFICULTY,
    );
    expect(
      normalizeMinesweeperDifficulty("BEGINNER"),
    ).toEqual(DEFAULT_MINESWEEPER_DIFFICULTY);
  });
});
