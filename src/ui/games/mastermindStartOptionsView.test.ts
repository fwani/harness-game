import { describe, expect, it } from "vitest";
import {
  DEFAULT_MASTERMIND_DIFFICULTY_ID,
  describeMastermindDifficulty,
  mastermindDifficultyOptions,
  normalizeMastermindDifficulty,
} from "./mastermindStartOptionsView";
import { MAX_MASTERMIND_COLORS } from "./mastermindView";

describe("mastermindDifficultyOptions", () => {
  it("쉬움·보통·어려움 프리셋을 순서대로 제공한다", () => {
    expect(mastermindDifficultyOptions().map((d) => d.id)).toEqual([
      "easy",
      "normal",
      "hard",
    ]);
  });

  it("표준/통용 파라미터를 노출한다", () => {
    expect(mastermindDifficultyOptions()).toEqual([
      { id: "easy", label: "쉬움", codeLength: 4, colorCount: 6, maxGuesses: 12 },
      { id: "normal", label: "보통", codeLength: 4, colorCount: 6, maxGuesses: 10 },
      { id: "hard", label: "어려움", codeLength: 5, colorCount: 8, maxGuesses: 10 },
    ]);
  });

  it("모든 프리셋의 색 가짓수가 팔레트 한도(A~H) 이내다", () => {
    for (const d of mastermindDifficultyOptions()) {
      expect(d.colorCount).toBeGreaterThanOrEqual(1);
      expect(d.colorCount).toBeLessThanOrEqual(MAX_MASTERMIND_COLORS);
    }
  });
});

describe("normalizeMastermindDifficulty", () => {
  it("알려진 id는 해당 프리셋을 그대로 반환한다", () => {
    for (const d of mastermindDifficultyOptions()) {
      expect(normalizeMastermindDifficulty(d.id)).toEqual(d);
    }
  });

  it("알 수 없는 id는 기본(보통)으로 폴백한다", () => {
    const fallback = normalizeMastermindDifficulty("nope");
    expect(fallback.id).toBe(DEFAULT_MASTERMIND_DIFFICULTY_ID);
    expect(fallback.id).toBe("normal");
  });

  it("빈 문자열도 기본으로 폴백한다", () => {
    expect(normalizeMastermindDifficulty("").id).toBe(
      DEFAULT_MASTERMIND_DIFFICULTY_ID,
    );
  });

  it("기본 난이도는 4칸·6색·10시도(현행 기본 동작 보존)다", () => {
    const def = normalizeMastermindDifficulty(DEFAULT_MASTERMIND_DIFFICULTY_ID);
    expect(def).toEqual({
      id: "normal",
      label: "보통",
      codeLength: 4,
      colorCount: 6,
      maxGuesses: 10,
    });
  });
});

describe("describeMastermindDifficulty", () => {
  it("색 비의존 파라미터 요약 문구를 만든다", () => {
    expect(
      describeMastermindDifficulty({
        id: "normal",
        label: "보통",
        codeLength: 4,
        colorCount: 6,
        maxGuesses: 10,
      }),
    ).toBe("코드 4칸 · 색 6가지 · 10시도");
  });
});
