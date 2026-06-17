import { describe, expect, it } from "vitest";
import {
  MASTERMIND_DEFAULTS,
  generateMastermindSecret,
  playMastermindGuess,
  startMastermindGame,
} from "./playMastermind";
import { createMastermind, type Peg } from "../domain/mastermind";
import type { RandomSource } from "./dealCards";

/**
 * 미리 정한 값 목록을 순서대로 그대로 반환하는 결정적 rng(소진되면 되감음).
 * 값이 maxExclusive 범위 안에 있다고 가정하는 테스트 전용 스텁이다.
 */
class SequenceRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const v = this.values[this.i % this.values.length]!;
    this.i += 1;
    return v;
  }
}

/** 항상 maxExclusive(경계 밖)를 반환하는 비정상 스텁(방어적 throw 검증용). */
class OutOfRangeRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    return maxExclusive;
  }
}

describe("generateMastermindSecret", () => {
  it("결정적 시퀀스를 주면 기대 코드를 생성한다", () => {
    const random = new SequenceRandom([2, 5, 0, 3]);
    const secret = generateMastermindSecret(random, { codeLength: 4, colorCount: 6 });
    expect(secret).toEqual([2, 5, 0, 3]);
  });

  it("같은 random 시퀀스면 결정적으로 같은 코드", () => {
    const a = generateMastermindSecret(new SequenceRandom([1, 4, 4, 0]), {
      codeLength: 4,
      colorCount: 6,
    });
    const b = generateMastermindSecret(new SequenceRandom([1, 4, 4, 0]), {
      codeLength: 4,
      colorCount: 6,
    });
    expect(a).toEqual(b);
  });

  it("모든 칸이 0..colorCount-1 범위이고 codeLength 길이다", () => {
    const random = new SequenceRandom([0, 1, 2, 3, 4, 5, 0, 1]);
    const codeLength = 8;
    const colorCount = 6;
    const secret = generateMastermindSecret(random, { codeLength, colorCount });
    expect(secret).toHaveLength(codeLength);
    for (const peg of secret) {
      expect(Number.isInteger(peg)).toBe(true);
      expect(peg).toBeGreaterThanOrEqual(0);
      expect(peg).toBeLessThan(colorCount);
    }
  });

  it("잘못된 codeLength는 throw", () => {
    const random = new SequenceRandom([0]);
    expect(() => generateMastermindSecret(random, { codeLength: 0, colorCount: 6 })).toThrow();
    expect(() =>
      generateMastermindSecret(random, { codeLength: 1.5, colorCount: 6 }),
    ).toThrow();
  });

  it("잘못된 colorCount는 throw", () => {
    const random = new SequenceRandom([0]);
    expect(() => generateMastermindSecret(random, { codeLength: 4, colorCount: 0 })).toThrow();
    expect(() =>
      generateMastermindSecret(random, { codeLength: 4, colorCount: 2.5 }),
    ).toThrow();
  });

  it("nextInt가 범위를 벗어난 값을 주면 throw", () => {
    expect(() =>
      generateMastermindSecret(new OutOfRangeRandom(), { codeLength: 4, colorCount: 6 }),
    ).toThrow();
  });
});

describe("startMastermindGame", () => {
  it("옵션 미지정 시 MASTERMIND_DEFAULTS를 반영한다", () => {
    const state = startMastermindGame(new SequenceRandom([0, 1, 2, 3]));
    expect(state.codeLength).toBe(MASTERMIND_DEFAULTS.codeLength);
    expect(state.colorCount).toBe(MASTERMIND_DEFAULTS.colorCount);
    expect(state.maxGuesses).toBe(MASTERMIND_DEFAULTS.maxGuesses);
    expect(state.secret).toHaveLength(MASTERMIND_DEFAULTS.codeLength);
    expect(state.guesses).toEqual([]);
  });

  it("옵션 지정 시 반영한다", () => {
    const state = startMastermindGame(new SequenceRandom([0, 1, 2]), {
      codeLength: 3,
      colorCount: 4,
      maxGuesses: 8,
    });
    expect(state.codeLength).toBe(3);
    expect(state.colorCount).toBe(4);
    expect(state.maxGuesses).toBe(8);
    expect(state.secret).toEqual([0, 1, 2]);
  });

  it("일부 옵션만 지정하면 나머지는 기본값에 위임한다", () => {
    const state = startMastermindGame(new SequenceRandom([0, 0, 0, 0]), { maxGuesses: 5 });
    expect(state.codeLength).toBe(MASTERMIND_DEFAULTS.codeLength);
    expect(state.colorCount).toBe(MASTERMIND_DEFAULTS.colorCount);
    expect(state.maxGuesses).toBe(5);
  });
});

describe("playMastermindGuess", () => {
  const secret: Peg[] = [0, 1, 2, 3];
  const colorCount = 6;
  const maxGuesses = 10;

  it("정답 추측 시 status=won·feedback.exact===codeLength", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    const result = playMastermindGuess(state, [0, 1, 2, 3]);
    expect(result.status).toBe("won");
    expect(result.feedback.exact).toBe(state.codeLength);
    expect(result.feedback.present).toBe(0);
  });

  it("진행 중이면 status=playing이고 피드백을 반환한다", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    const result = playMastermindGuess(state, [0, 1, 3, 2]);
    expect(result.status).toBe("playing");
    expect(result.feedback.exact).toBe(2);
    expect(result.feedback.present).toBe(2);
    expect(result.state.guesses).toHaveLength(1);
  });

  it("오답을 maxGuesses까지 누적하면 status=lost", () => {
    let state = createMastermind(secret, { colorCount, maxGuesses: 3 });
    const wrong: Peg[] = [4, 4, 4, 4];
    let last = playMastermindGuess(state, wrong);
    expect(last.status).toBe("playing");
    state = last.state;
    last = playMastermindGuess(state, wrong);
    expect(last.status).toBe("playing");
    state = last.state;
    last = playMastermindGuess(state, wrong);
    expect(last.status).toBe("lost");
  });

  it("입력 state는 불변(원본 guesses 길이 유지)", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    const before = state.guesses.length;
    const result = playMastermindGuess(state, [5, 5, 5, 5]);
    expect(state.guesses.length).toBe(before);
    expect(result.state.guesses.length).toBe(before + 1);
    expect(result.state).not.toBe(state);
  });

  it("불법 추측(길이 불일치)은 throw를 전파한다", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    expect(() => playMastermindGuess(state, [0, 1, 2])).toThrow();
  });

  it("불법 추측(색 범위 밖)은 throw를 전파한다", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    expect(() => playMastermindGuess(state, [0, 1, 2, colorCount])).toThrow();
  });

  it("종료 후 추측은 throw를 전파한다", () => {
    const state = createMastermind(secret, { colorCount, maxGuesses });
    const won = playMastermindGuess(state, [0, 1, 2, 3]);
    expect(won.status).toBe("won");
    expect(() => playMastermindGuess(won.state, [0, 1, 2, 3])).toThrow();
  });
});
