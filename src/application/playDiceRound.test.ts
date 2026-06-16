import { describe, expect, it } from "vitest";
import type { RandomSource } from "./dealCards";
import { playDiceRound } from "./playDiceRound";

/**
 * 미리 정한 정수 시퀀스를 순서대로 돌려주는 결정적 가짜 RandomSource.
 * playDiceRound는 nextInt(6)을 호출하므로 0..5 값을 넣으면 눈은 그 값 + 1 이 된다.
 * 시퀀스가 소진되거나 maxExclusive !== 6 이면 throw 하여 호출 규약을 검증한다.
 */
const seqRng = (values: number[]): RandomSource => {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive !== 6) {
        throw new Error(`expected nextInt(6), got nextInt(${maxExclusive})`);
      }
      if (i >= values.length) {
        throw new Error("seqRng exhausted");
      }
      return values[i++]!;
    },
  };
};

describe("playDiceRound", () => {
  it("A의 주사위를 먼저, 그다음 B의 주사위를 굴린다", () => {
    // A: [1,2,3], B: [4,5,6] (nextInt 결과 + 1)
    const rng = seqRng([0, 1, 2, 3, 4, 5]);
    const result = playDiceRound(3, rng);
    expect(result.a).toEqual([1, 2, 3]);
    expect(result.b).toEqual([4, 5, 6]);
  });

  it("A의 합이 크면 result는 \"a\"", () => {
    // A: [6,6] = 12, B: [1,1] = 2
    const rng = seqRng([5, 5, 0, 0]);
    const result = playDiceRound(2, rng);
    expect(result.a).toEqual([6, 6]);
    expect(result.b).toEqual([1, 1]);
    expect(result.result).toBe("a");
  });

  it("B의 합이 크면 result는 \"b\"", () => {
    // A: [1,2] = 3, B: [6,5] = 11
    const rng = seqRng([0, 1, 5, 4]);
    const result = playDiceRound(2, rng);
    expect(result.result).toBe("b");
  });

  it("합이 같으면 result는 \"draw\"", () => {
    // A: [2,5] = 7, B: [4,3] = 7
    const rng = seqRng([1, 4, 3, 2]);
    const result = playDiceRound(2, rng);
    expect(result.result).toBe("draw");
  });

  it("diceCount=1도 동작한다", () => {
    // A: [3], B: [3] -> draw
    const rng = seqRng([2, 2]);
    const result = playDiceRound(1, rng);
    expect(result.a).toEqual([3]);
    expect(result.b).toEqual([3]);
    expect(result.result).toBe("draw");
  });

  it("각 눈은 1..6 범위이고 길이는 diceCount이다", () => {
    const rng = seqRng([0, 1, 2, 3, 5, 4, 0, 5]);
    const diceCount = 4;
    const result = playDiceRound(diceCount, rng);
    expect(result.a).toHaveLength(diceCount);
    expect(result.b).toHaveLength(diceCount);
    for (const die of [...result.a, ...result.b]) {
      expect(Number.isInteger(die)).toBe(true);
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    }
  });

  it("같은 nextInt 시퀀스는 같은 결과를 낸다(결정적)", () => {
    const seq = [4, 0, 2, 1, 3, 5];
    const r1 = playDiceRound(3, seqRng(seq));
    const r2 = playDiceRound(3, seqRng(seq));
    expect(r1).toEqual(r2);
  });

  it("diceCount < 1 이면 throw", () => {
    expect(() => playDiceRound(0, seqRng([]))).toThrow();
    expect(() => playDiceRound(-1, seqRng([]))).toThrow();
  });

  it("diceCount가 정수가 아니면 throw", () => {
    expect(() => playDiceRound(1.5, seqRng([]))).toThrow();
    expect(() => playDiceRound(Number.NaN, seqRng([]))).toThrow();
  });
});
