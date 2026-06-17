import { describe, it, expect } from "vitest";
import {
  generateSecretBaseballNumber,
  playBaseballGuess,
} from "./playNumberBaseball";
import { isValidBaseballNumber } from "../domain/numberBaseball";
import type { RandomSource } from "./dealCards";

/** 미리 정한 인덱스 시퀀스를 순서대로 반환하는 결정적 스텁. */
function seqRng(indices: readonly number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      const v = indices[i] ?? 0;
      i += 1;
      return v;
    },
  };
}

/** 항상 같은 인덱스를 반환하는 스텁(범위 밖 검증용). */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(): number {
      return index;
    },
  };
}

describe("generateSecretBaseballNumber", () => {
  it("고정 RNG로 결정적으로 비밀 수를 생성한다", () => {
    // pool [0..9]에서 매번 index 0을 뽑으면 [0,1,2]
    expect(generateSecretBaseballNumber(seqRng([0, 0, 0]), 3)).toEqual([0, 1, 2]);
  });

  it("남은 후보 인덱스를 기준으로 뽑는다(중복 없이 채움)", () => {
    // 9 → 9 / 0 → 0 / 7 → 8  (각 단계 남은 풀 기준)
    expect(generateSecretBaseballNumber(seqRng([9, 0, 7]), 3)).toEqual([9, 0, 8]);
  });

  it("기본 길이는 3이다", () => {
    const secret = generateSecretBaseballNumber(seqRng([0, 0, 0]));
    expect(secret).toHaveLength(3);
  });

  it("결과는 항상 길이 일치·중복 없음(isValidBaseballNumber 통과)", () => {
    for (let len = 1; len <= 10; len++) {
      const secret = generateSecretBaseballNumber(fixedRng(0), len);
      expect(secret).toHaveLength(len);
      expect(isValidBaseballNumber(secret, len)).toBe(true);
    }
  });

  it("length=1 동작", () => {
    expect(generateSecretBaseballNumber(seqRng([5]), 1)).toEqual([5]);
  });

  it("length=4 동작", () => {
    const secret = generateSecretBaseballNumber(seqRng([0, 1, 2, 3]), 4);
    // 0→0 / 1→2 / 2→4 / 3→6
    expect(secret).toEqual([0, 2, 4, 6]);
    expect(isValidBaseballNumber(secret, 4)).toBe(true);
  });

  it("length=10이면 0–9 전부를 서로 다르게 채운다", () => {
    const secret = generateSecretBaseballNumber(fixedRng(0), 10);
    expect([...secret].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("length가 0이면 throw", () => {
    expect(() => generateSecretBaseballNumber(fixedRng(0), 0)).toThrow();
  });

  it("length가 11이면 throw(서로 다른 숫자 불가)", () => {
    expect(() => generateSecretBaseballNumber(fixedRng(0), 11)).toThrow();
  });

  it("length가 정수가 아니면 throw", () => {
    expect(() => generateSecretBaseballNumber(fixedRng(0), 2.5)).toThrow();
  });

  it("rng가 범위 밖 인덱스를 반환하면 throw", () => {
    expect(() => generateSecretBaseballNumber(fixedRng(100), 3)).toThrow(
      /out-of-range/,
    );
    expect(() => generateSecretBaseballNumber(fixedRng(-1), 3)).toThrow(
      /out-of-range/,
    );
  });
});

describe("playBaseballGuess", () => {
  it("전부 스트라이크면 isWin=true", () => {
    const outcome = playBaseballGuess([1, 2, 3], [1, 2, 3]);
    expect(outcome.result).toEqual({ strikes: 3, balls: 0 });
    expect(outcome.isWin).toBe(true);
  });

  it("부분 S+B면 isWin=false", () => {
    const outcome = playBaseballGuess([1, 2, 3], [1, 3, 4]);
    // 1: strike, 3: ball, 4: 없음 → 1S 1B
    expect(outcome.result).toEqual({ strikes: 1, balls: 1 });
    expect(outcome.isWin).toBe(false);
  });

  it("아웃(0S0B)이면 isWin=false", () => {
    const outcome = playBaseballGuess([1, 2, 3], [4, 5, 6]);
    expect(outcome.result).toEqual({ strikes: 0, balls: 0 });
    expect(outcome.isWin).toBe(false);
  });

  it("유효하지 않은 추측은 도메인 throw를 전파한다", () => {
    expect(() => playBaseballGuess([1, 2, 3], [1, 1, 2])).toThrow();
  });

  it("길이 불일치는 throw한다", () => {
    expect(() => playBaseballGuess([1, 2, 3], [1, 2])).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const secret = [1, 2, 3];
    const guess = [3, 2, 1];
    playBaseballGuess(secret, guess);
    expect(secret).toEqual([1, 2, 3]);
    expect(guess).toEqual([3, 2, 1]);
  });
});
