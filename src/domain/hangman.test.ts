import { describe, expect, it } from "vitest";
import {
  createHangman,
  guessHangmanLetter,
  isHangmanLost,
  isHangmanWon,
  isLegalHangmanGuess,
  maskedHangmanWord,
  type HangmanState,
} from "./hangman";

describe("createHangman", () => {
  it("기본 maxMisses=6으로 빈 상태를 만든다", () => {
    expect(createHangman("cat")).toEqual<HangmanState>({
      answer: "cat",
      guessed: [],
      misses: 0,
      maxMisses: 6,
    });
  });

  it("정답을 소문자로 정규화한다", () => {
    expect(createHangman("CaT").answer).toBe("cat");
  });

  it("maxMisses를 지정할 수 있다", () => {
    expect(createHangman("dog", 3).maxMisses).toBe(3);
  });

  it("빈 문자열이면 throw", () => {
    expect(() => createHangman("")).toThrow("1글자 이상");
  });

  it("비영문자가 포함되면 throw", () => {
    expect(() => createHangman("ca7")).toThrow("영문자만");
    expect(() => createHangman("c a")).toThrow("영문자만");
    expect(() => createHangman("cat!")).toThrow("영문자만");
  });

  it("maxMisses<1 이면 throw", () => {
    expect(() => createHangman("cat", 0)).toThrow("1 이상");
  });

  it("maxMisses가 비정수면 throw", () => {
    expect(() => createHangman("cat", 2.5)).toThrow("정수");
  });
});

describe("isLegalHangmanGuess", () => {
  it("처음 추측하는 단일 영문자는 합법", () => {
    expect(isLegalHangmanGuess(createHangman("cat"), "c")).toBe(true);
  });

  it("대문자 입력도 합법(정규화 후 판정)", () => {
    expect(isLegalHangmanGuess(createHangman("cat"), "C")).toBe(true);
  });

  it("이미 추측한 글자는 불법", () => {
    const state = guessHangmanLetter(createHangman("cat"), "c");
    expect(isLegalHangmanGuess(state, "c")).toBe(false);
    expect(isLegalHangmanGuess(state, "C")).toBe(false);
  });

  it("비영문자/다중 글자/빈 문자열은 불법", () => {
    const state = createHangman("cat");
    expect(isLegalHangmanGuess(state, "1")).toBe(false);
    expect(isLegalHangmanGuess(state, "ab")).toBe(false);
    expect(isLegalHangmanGuess(state, "")).toBe(false);
    expect(isLegalHangmanGuess(state, "!")).toBe(false);
  });

  it("승리/패배 종료 후에는 어떤 글자도 불법", () => {
    const won = guessHangmanLetter(
      guessHangmanLetter(guessHangmanLetter(createHangman("cat"), "c"), "a"),
      "t",
    );
    expect(isHangmanWon(won)).toBe(true);
    expect(isLegalHangmanGuess(won, "z")).toBe(false);

    let lost = createHangman("cat", 2);
    lost = guessHangmanLetter(lost, "x");
    lost = guessHangmanLetter(lost, "y");
    expect(isHangmanLost(lost)).toBe(true);
    expect(isLegalHangmanGuess(lost, "z")).toBe(false);
  });
});

describe("guessHangmanLetter", () => {
  it("맞힌 글자는 공개하고 misses는 불변", () => {
    const next = guessHangmanLetter(createHangman("cat"), "c");
    expect(next.guessed).toContain("c");
    expect(next.misses).toBe(0);
  });

  it("틀린 글자는 misses+1", () => {
    const next = guessHangmanLetter(createHangman("cat"), "z");
    expect(next.guessed).toContain("z");
    expect(next.misses).toBe(1);
  });

  it("대문자 입력을 소문자로 저장한다", () => {
    const next = guessHangmanLetter(createHangman("cat"), "C");
    expect(next.guessed).toEqual(["c"]);
  });

  it("입력 상태를 변형하지 않고 새 객체를 반환한다", () => {
    const state = createHangman("cat");
    const next = guessHangmanLetter(state, "c");
    expect(next).not.toBe(state);
    expect(next.guessed).not.toBe(state.guessed);
    expect(state.guessed).toEqual([]);
    expect(state.misses).toBe(0);
  });

  it("중복 추측이면 throw", () => {
    const state = guessHangmanLetter(createHangman("cat"), "c");
    expect(() => guessHangmanLetter(state, "c")).toThrow("불법 추측");
  });

  it("비영문자 추측이면 throw", () => {
    const state = createHangman("cat");
    expect(() => guessHangmanLetter(state, "1")).toThrow("불법 추측");
    expect(() => guessHangmanLetter(state, "ab")).toThrow("불법 추측");
  });

  it("종료 후 추측이면 throw", () => {
    let lost = createHangman("cat", 1);
    lost = guessHangmanLetter(lost, "x");
    expect(isHangmanLost(lost)).toBe(true);
    expect(() => guessHangmanLetter(lost, "c")).toThrow("불법 추측");
  });
});

describe("maskedHangmanWord", () => {
  it("초기에는 전부 '_'", () => {
    expect(maskedHangmanWord(createHangman("cat"))).toBe("___");
  });

  it("일부 글자만 공개한다", () => {
    const state = guessHangmanLetter(createHangman("cat"), "c");
    expect(maskedHangmanWord(state)).toBe("c__");
  });

  it("반복 글자는 모두 동시에 공개된다", () => {
    const state = guessHangmanLetter(createHangman("letter"), "t");
    expect(maskedHangmanWord(state)).toBe("__tt__");
  });

  it("전부 맞히면 정답 전체를 보여준다", () => {
    let state = createHangman("cat");
    for (const ch of ["c", "a", "t"]) {
      state = guessHangmanLetter(state, ch);
    }
    expect(maskedHangmanWord(state)).toBe("cat");
  });
});

describe("isHangmanWon / isHangmanLost", () => {
  it("초기 상태는 승리도 패배도 아니다", () => {
    const state = createHangman("cat");
    expect(isHangmanWon(state)).toBe(false);
    expect(isHangmanLost(state)).toBe(false);
  });

  it("모든 고유 글자를 맞히면 승리(반복 글자 'letter' 경계)", () => {
    let state = createHangman("letter");
    // 고유 글자: l, e, t, r
    state = guessHangmanLetter(state, "l");
    state = guessHangmanLetter(state, "e");
    state = guessHangmanLetter(state, "t");
    expect(isHangmanWon(state)).toBe(false);
    state = guessHangmanLetter(state, "r");
    expect(isHangmanWon(state)).toBe(true);
    expect(isHangmanLost(state)).toBe(false);
  });

  it("오답 한도에 도달하면 패배(경계)", () => {
    let state = createHangman("cat", 2);
    state = guessHangmanLetter(state, "x");
    expect(isHangmanLost(state)).toBe(false);
    state = guessHangmanLetter(state, "y");
    expect(isHangmanLost(state)).toBe(true);
    expect(isHangmanWon(state)).toBe(false);
  });

  it("승리 시 패배는 false(동시 성립 불가)", () => {
    let state = createHangman("ab", 6);
    state = guessHangmanLetter(state, "z"); // 오답 1
    state = guessHangmanLetter(state, "a");
    state = guessHangmanLetter(state, "b");
    expect(isHangmanWon(state)).toBe(true);
    expect(isHangmanLost(state)).toBe(false);
  });
});
