import { describe, expect, it } from "vitest";
import {
  WORDLE_VALID_GUESSES,
  WORDLE_WORDS,
  isWordleGuessWord,
  pickRandomWordleAnswer,
  playWordleGuess,
  startWordleGame,
} from "./playWordle";
import {
  createWordleGame,
  scoreWordleGuess,
  type WordleState,
} from "../domain/wordle";
import type { RandomSource } from "./dealCards";

/** 미리 정한 인덱스 값을 순서대로 반환하는 결정적 rng. */
class FixedRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const raw = this.values[this.i % this.values.length]!;
    this.i += 1;
    return raw % maxExclusive;
  }
}

/** 항상 0을 반환하는 스텁(첫 단어 선택). */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

/** 범위를 벗어난 인덱스를 반환하는 스텁(검증용). */
class OutOfRangeRandom implements RandomSource {
  constructor(private readonly value: number) {}
  nextInt(): number {
    return this.value;
  }
}

describe("WORDLE_WORDS", () => {
  it("모든 단어가 createWordleGame을 통과한다(영문자만, 동일 길이)", () => {
    expect(WORDLE_WORDS.length).toBeGreaterThan(0);
    const len = WORDLE_WORDS[0]!.length;
    for (const word of WORDLE_WORDS) {
      expect(() => createWordleGame(word)).not.toThrow();
      expect(word).toMatch(/^[a-z]+$/);
      expect(word.length).toBe(len);
    }
  });
});

describe("WORDLE_VALID_GUESSES / isWordleGuessWord", () => {
  it("사전의 모든 단어가 createWordleGame을 통과한다(영문자만, 5글자)", () => {
    expect(WORDLE_VALID_GUESSES.size).toBeGreaterThan(0);
    for (const word of WORDLE_VALID_GUESSES) {
      expect(word).toMatch(/^[a-z]+$/);
      expect(word.length).toBe(5);
      expect(() => createWordleGame(word)).not.toThrow();
    }
  });

  it("정답 후보(WORDLE_WORDS)는 모두 사전에 포함된다(정답은 항상 유효 추측)", () => {
    for (const word of WORDLE_WORDS) {
      expect(WORDLE_VALID_GUESSES.has(word)).toBe(true);
      expect(isWordleGuessWord(word)).toBe(true);
    }
  });

  it("실제 영단어는 등재로 본다(대소문자·앞뒤 공백 무관)", () => {
    expect(isWordleGuessWord("apple")).toBe(true);
    expect(isWordleGuessWord("APPLE")).toBe(true);
    expect(isWordleGuessWord("  Crane ")).toBe(true);
  });

  it("사전에 없는 임의 자음 나열은 비단어로 거른다", () => {
    for (const nonWord of ["zxqvw", "fghjk", "bcdfg", "pqrst", "vwxyz", "jklmn"]) {
      expect(isWordleGuessWord(nonWord)).toBe(false);
    }
  });
});

describe("pickRandomWordleAnswer", () => {
  it("결정적: 같은 random 시퀀스면 같은 단어를 고른다", () => {
    const a = pickRandomWordleAnswer(WORDLE_WORDS, new FixedRandom([4]));
    const b = pickRandomWordleAnswer(WORDLE_WORDS, new FixedRandom([4]));
    expect(a).toBe(b);
    expect(a).toBe(WORDLE_WORDS[4]);
  });

  it("nextInt가 고른 인덱스의 단어를 반환한다", () => {
    expect(pickRandomWordleAnswer(WORDLE_WORDS, new ZeroRandom())).toBe(
      WORDLE_WORDS[0],
    );
  });

  it("후보 목록이 비면 한국어 사유로 throw", () => {
    expect(() => pickRandomWordleAnswer([], new ZeroRandom())).toThrow(
      /후보 단어 목록이 비어/,
    );
  });

  it("범위 밖 인덱스면 throw", () => {
    expect(() =>
      pickRandomWordleAnswer(WORDLE_WORDS, new OutOfRangeRandom(999)),
    ).toThrow(/out-of-range/);
    expect(() =>
      pickRandomWordleAnswer(WORDLE_WORDS, new OutOfRangeRandom(-1)),
    ).toThrow(/out-of-range/);
  });
});

describe("startWordleGame", () => {
  it("후보 길이의 정답으로 시작한다(기본 maxAttempts=6)", () => {
    const state = startWordleGame(new ZeroRandom());
    expect(state.answer).toBe(WORDLE_WORDS[0]);
    expect(state.wordLength).toBe(WORDLE_WORDS[0]!.length);
    expect(state.maxAttempts).toBe(6);
    expect(state.guesses).toEqual([]);
  });

  it("maxAttempts를 지정하면 도메인에 그대로 전달한다", () => {
    const state = startWordleGame(new ZeroRandom(), 4);
    expect(state.maxAttempts).toBe(4);
  });
});

describe("playWordleGuess", () => {
  it("feedback이 도메인 scoreWordleGuess와 일치한다", () => {
    const state = createWordleGame("stone");
    const { feedback } = playWordleGuess(state, "tones");
    expect(feedback).toEqual(scoreWordleGuess("stone", "tones"));
  });

  it("정답을 맞히면 won, 입력 state는 불변", () => {
    const state = createWordleGame("apple");
    const frozenBefore = JSON.stringify(state);
    const { state: next, status, feedback } = playWordleGuess(state, "apple");
    expect(status).toBe("won");
    expect(feedback).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
    expect(next.guesses).toEqual(["apple"]);
    // 입력 state 불변
    expect(JSON.stringify(state)).toBe(frozenBefore);
    expect(state.guesses).toEqual([]);
  });

  it("틀린 추측이 이어지면 playing 상태를 유지한다", () => {
    const state: WordleState = createWordleGame("apple", 6);
    const { status } = playWordleGuess(state, "stone");
    expect(status).toBe("playing");
  });

  it("승리 없이 시도를 소진하면 lost", () => {
    let state: WordleState = createWordleGame("apple", 3);
    let lastStatus = "playing";
    for (let i = 0; i < 3; i++) {
      const r = playWordleGuess(state, "stone");
      state = r.state;
      lastStatus = r.status;
    }
    expect(lastStatus).toBe("lost");
  });

  it("대소문자 무관 입력을 허용한다(소문자 정규화)", () => {
    const state = createWordleGame("apple");
    const { state: next, status } = playWordleGuess(state, "APPLE");
    expect(status).toBe("won");
    expect(next.guesses).toEqual(["apple"]);
  });

  it("불법 추측(길이 불일치)은 도메인 throw를 그대로 전파한다", () => {
    const state = createWordleGame("apple");
    expect(() => playWordleGuess(state, "cat")).toThrow(/워들 불법 추측/);
  });

  it("불법 추측(비영문)은 도메인 throw를 그대로 전파한다", () => {
    const state = createWordleGame("apple");
    expect(() => playWordleGuess(state, "ap1le")).toThrow(/워들 불법 추측/);
  });

  it("종료(승리) 후 추측은 도메인 throw를 그대로 전파한다", () => {
    const state = createWordleGame("apple");
    const { state: won } = playWordleGuess(state, "apple");
    expect(() => playWordleGuess(won, "stone")).toThrow(/워들 불법 추측/);
  });
});
