import { describe, expect, it } from "vitest";
import { createWordleGame, applyWordleGuess, type WordleState } from "../../domain/wordle";
import {
  attemptsLabel,
  describeWordleStatus,
  guessGridRows,
  guessRowCells,
  letterResultDisplay,
  letterResultLegend,
  parseWordleGuess,
  remainingAttempts,
} from "./wordleView";

/** 테스트용 상태 빌더: 정답 + 제출 추측 시퀀스(도메인 규칙으로 적용). */
function makeState(answer: string, guesses: string[] = [], maxAttempts = 6): WordleState {
  let state = createWordleGame(answer, maxAttempts);
  for (const g of guesses) {
    state = applyWordleGuess(state, g);
  }
  return state;
}

describe("wordleView.letterResultDisplay", () => {
  it("글자 결과를 색이 아니라 기호+라벨로 구분한다", () => {
    expect(letterResultDisplay("correct")).toEqual({ symbol: "■", label: "적중" });
    expect(letterResultDisplay("present")).toEqual({ symbol: "◧", label: "존재" });
    expect(letterResultDisplay("absent")).toEqual({ symbol: "·", label: "없음" });
  });

  it("세 결과의 기호가 서로 달라 색 없이도 구분된다", () => {
    const symbols = letterResultLegend().map((l) => l.symbol);
    expect(new Set(symbols).size).toBe(3);
  });

  it("범례는 적중/존재/없음 순서로 결과·기호·라벨을 제공한다", () => {
    expect(letterResultLegend()).toEqual([
      { result: "correct", symbol: "■", label: "적중" },
      { result: "present", symbol: "◧", label: "존재" },
      { result: "absent", symbol: "·", label: "없음" },
    ]);
  });
});

describe("wordleView.guessRowCells", () => {
  it("도메인 채점을 글자별 셀로 변환하고 대문자·aria-label을 붙인다", () => {
    // 정답 apple, 추측 alley: a=correct, l(자리불일치이나 존재)=present, ...
    const cells = guessRowCells("apple", "alley");
    expect(cells).toHaveLength(5);
    expect(cells[0]).toMatchObject({ letter: "A", result: "correct", symbol: "■", ariaLabel: "A: 적중" });
    expect(cells.map((c) => c.letter).join("")).toBe("ALLEY");
    // 각 셀의 라벨은 결과와 일치한다(기호/라벨/aria 일관성).
    for (const c of cells) {
      expect(c.ariaLabel).toBe(`${c.letter}: ${c.label}`);
    }
  });

  it("정답에 없는 글자는 없음(·)으로 표시한다", () => {
    const cells = guessRowCells("apple", "zzzzz");
    expect(cells.every((c) => c.result === "absent" && c.symbol === "·")).toBe(true);
  });
});

describe("wordleView.guessGridRows", () => {
  it("제출 순서대로 추측 히스토리를 행 그리드로 누적한다", () => {
    const state = makeState("apple", ["brave", "apple"]);
    const rows = guessGridRows(state);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.map((c) => c.letter).join("")).toBe("BRAVE");
    // 정답 추측 행은 전부 적중.
    expect(rows[1]!.every((c) => c.result === "correct")).toBe(true);
  });

  it("추측이 없으면 빈 그리드", () => {
    expect(guessGridRows(makeState("apple"))).toEqual([]);
  });
});

describe("wordleView.remainingAttempts / attemptsLabel", () => {
  it("남은 시도는 maxAttempts - 제출 수", () => {
    expect(remainingAttempts(makeState("apple", [], 6))).toBe(6);
    expect(remainingAttempts(makeState("apple", ["brave"], 6))).toBe(5);
  });

  it("남은 시도/총 한도 라벨을 만든다", () => {
    expect(attemptsLabel(makeState("apple", ["brave"], 6))).toBe("남은 시도 5 / 6");
  });
});

describe("wordleView.describeWordleStatus", () => {
  it("진행 중에는 정답을 노출하지 않는다", () => {
    const text = describeWordleStatus("playing", "apple");
    expect(text).not.toContain("APPLE");
  });

  it("승리 문구는 정답을 노출하지 않는다", () => {
    const text = describeWordleStatus("won", "apple");
    expect(text).toContain("정답");
    expect(text).not.toContain("APPLE");
  });

  it("패배 시에만 정답을 대문자로 공개한다", () => {
    const text = describeWordleStatus("lost", "apple");
    expect(text).toContain("APPLE");
  });
});

describe("wordleView.parseWordleGuess", () => {
  it("유효한 길이의 영단어를 소문자로 파싱한다(앞뒤 공백 무시)", () => {
    expect(parseWordleGuess("  Apple ", 5)).toEqual({ guess: "apple" });
  });

  it("빈 입력이면 길이 안내 사유", () => {
    expect(parseWordleGuess("   ", 5)).toEqual({ error: "5글자 영단어를 입력하세요." });
  });

  it("비영문 문자가 있으면 영문자만 입력 안내", () => {
    expect(parseWordleGuess("appl3", 5)).toEqual({
      error: "영문자만 입력하세요(공백/숫자/기호 불가).",
    });
    expect(parseWordleGuess("ap ple", 5)).toEqual({
      error: "영문자만 입력하세요(공백/숫자/기호 불가).",
    });
  });

  it("길이가 다르면 입력 길이를 포함한 사유", () => {
    expect(parseWordleGuess("app", 5)).toEqual({
      error: "5글자 영단어를 입력하세요. (입력: 3글자)",
    });
  });
});
