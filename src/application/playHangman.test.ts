import { describe, expect, it } from "vitest";
import {
  HANGMAN_WORDS,
  pickRandomWord,
  playHangmanGuess,
  startHangmanGame,
} from "./playHangman";
import { createHangman, type HangmanState } from "../domain/hangman";
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

/** 정답 단어의 고유 글자를 모두 추측해 승리 상태로 만든다. */
function guessAll(state: HangmanState): HangmanState {
  let current = state;
  for (const ch of new Set(state.answer)) {
    current = playHangmanGuess(current, ch).state;
  }
  return current;
}

describe("HANGMAN_WORDS", () => {
  it("모든 단어가 createHangman을 통과한다(영문자만, 1글자 이상)", () => {
    expect(HANGMAN_WORDS.length).toBeGreaterThan(0);
    for (const word of HANGMAN_WORDS) {
      expect(() => createHangman(word)).not.toThrow();
      expect(word).toMatch(/^[a-z]+$/);
    }
  });
});

describe("pickRandomWord", () => {
  it("결정적: 같은 random 시퀀스면 같은 단어를 고른다", () => {
    const a = pickRandomWord(HANGMAN_WORDS, new FixedRandom([3]));
    const b = pickRandomWord(HANGMAN_WORDS, new FixedRandom([3]));
    expect(a).toBe(b);
    expect(a).toBe(HANGMAN_WORDS[3]);
  });

  it("nextInt가 고른 인덱스의 단어를 반환한다", () => {
    expect(pickRandomWord(HANGMAN_WORDS, new ZeroRandom())).toBe(
      HANGMAN_WORDS[0],
    );
  });

  it("빈 배열이면 throw한다", () => {
    expect(() => pickRandomWord([], new ZeroRandom())).toThrow();
  });
});

describe("startHangmanGame", () => {
  it("미추측·misses=0 초기 상태를 반환한다", () => {
    const state = startHangmanGame(new ZeroRandom());
    expect(state.answer).toBe(HANGMAN_WORDS[0]);
    expect(state.guessed).toEqual([]);
    expect(state.misses).toBe(0);
    expect(state.maxMisses).toBe(6);
  });

  it("maxMisses를 도메인에 전달한다", () => {
    const state = startHangmanGame(new ZeroRandom(), 3);
    expect(state.maxMisses).toBe(3);
  });
});

describe("playHangmanGuess", () => {
  it("적중 글자는 result:'hit'이고 misses가 늘지 않는다", () => {
    const state = createHangman("cat");
    const { state: next, result, status } = playHangmanGuess(state, "c");
    expect(result).toBe("hit");
    expect(next.misses).toBe(0);
    expect(status).toBe("playing");
  });

  it("오답 글자는 result:'miss'이고 misses가 1 증가한다", () => {
    const state = createHangman("cat");
    const { state: next, result, status } = playHangmanGuess(state, "z");
    expect(result).toBe("miss");
    expect(next.misses).toBe(1);
    expect(status).toBe("playing");
  });

  it("모든 글자를 맞히면 status:'won'", () => {
    const won = guessAll(createHangman("cat"));
    // 마지막 추측의 status 확인
    const state = createHangman("cat");
    let cur = state;
    const letters = [...new Set("cat")];
    let lastStatus = "playing";
    for (const ch of letters) {
      const r = playHangmanGuess(cur, ch);
      cur = r.state;
      lastStatus = r.status;
    }
    expect(lastStatus).toBe("won");
    expect(won.misses).toBe(0);
  });

  it("오답이 한도에 도달하면 status:'lost'", () => {
    let state = createHangman("cat", 2);
    let last = playHangmanGuess(state, "z");
    state = last.state;
    expect(last.status).toBe("playing");
    last = playHangmanGuess(state, "y");
    expect(last.state.misses).toBe(2);
    expect(last.status).toBe("lost");
  });

  it("승리가 패배보다 우선한다", () => {
    // 마지막 글자에서 동시에 한도 도달하지 않도록 승리 시 won 반환 확인
    const state = createHangman("ab", 1);
    const first = playHangmanGuess(state, "a");
    expect(first.status).toBe("playing");
    const second = playHangmanGuess(first.state, "b");
    expect(second.status).toBe("won");
  });

  it("입력 state를 변형하지 않는다", () => {
    const state = createHangman("cat");
    const snapshot = JSON.parse(JSON.stringify(state));
    playHangmanGuess(state, "z");
    expect(state).toEqual(snapshot);
  });

  it("종료 후 추측은 도메인 throw를 전파한다", () => {
    const state = createHangman("a", 1);
    const won = playHangmanGuess(state, "a");
    expect(won.status).toBe("won");
    expect(() => playHangmanGuess(won.state, "b")).toThrow();
  });

  it("중복/비영문자 추측은 throw를 전파한다", () => {
    const state = createHangman("cat");
    const after = playHangmanGuess(state, "c").state;
    expect(() => playHangmanGuess(after, "c")).toThrow();
    expect(() => playHangmanGuess(state, "1")).toThrow();
  });
});
