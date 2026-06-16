import { describe, expect, it } from "vitest";
import type { RandomSource } from "./dealCards";
import { evaluateDiceRoll } from "../domain/diceCategory";
import { playDiceCategoryRound } from "./playDiceCategoryRound";

/**
 * 미리 정한 정수 시퀀스를 순서대로 돌려주는 결정적 가짜 RandomSource.
 * playDiceCategoryRound는 nextInt(6)을 호출하므로 0..5 값을 넣으면 눈은 그 값 + 1 이 된다.
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

describe("playDiceCategoryRound", () => {
  it("A의 5개를 먼저, 그다음 B의 5개를 굴린다(기본 diceCount=5)", () => {
    // A: [1,2,3,4,5] (largeStraight), B: [6,6,6,6,6] (yacht)
    const rng = seqRng([0, 1, 2, 3, 4, 5, 5, 5, 5, 5]);
    const result = playDiceCategoryRound(rng);
    expect(result.a).toEqual([1, 2, 3, 4, 5]);
    expect(result.b).toEqual([6, 6, 6, 6, 6]);
  });

  it("더 높은 족보를 굴린 쪽이 이긴다", () => {
    // A: largeStraight, B: yacht -> B 승
    const rng = seqRng([0, 1, 2, 3, 4, 5, 5, 5, 5, 5]);
    const result = playDiceCategoryRound(rng);
    expect(result.result).toBe("b");

    // A: yacht, B: highDice -> A 승
    const rng2 = seqRng([5, 5, 5, 5, 5, 0, 1, 2, 4, 5]);
    const result2 = playDiceCategoryRound(rng2);
    expect(result2.aRank.category).toBe("yacht");
    expect(result2.result).toBe("a");
  });

  it("같은 족보면 합으로 가린다(보조 비교)", () => {
    // A: onePair [6,6,1,2,3]=18, B: onePair [2,2,1,4,5]=14 -> A 승(합 큼)
    const rng = seqRng([5, 5, 0, 1, 2, 1, 1, 0, 3, 4]);
    const result = playDiceCategoryRound(rng);
    expect(result.aRank.category).toBe("onePair");
    expect(result.bRank.category).toBe("onePair");
    expect(result.result).toBe("a");
  });

  it("족보·합 모두 같으면 draw", () => {
    // A: [6,6,1,2,3], B: [6,6,1,2,3] -> 동일 -> draw
    const seq = [5, 5, 0, 1, 2];
    const rng = seqRng([...seq, ...seq]);
    const result = playDiceCategoryRound(rng);
    expect(result.result).toBe("draw");
  });

  it("aRank/bRank가 evaluateDiceRoll 결과와 일치한다", () => {
    const rng = seqRng([0, 1, 2, 3, 4, 5, 5, 5, 5, 5]);
    const result = playDiceCategoryRound(rng);
    expect(result.aRank).toEqual(evaluateDiceRoll(result.a));
    expect(result.bRank).toEqual(evaluateDiceRoll(result.b));
  });

  it("diceCount=5를 명시해도 기본값과 동일하게 동작한다", () => {
    const seq = [0, 1, 2, 3, 4, 5, 5, 5, 5, 5];
    const withDefault = playDiceCategoryRound(seqRng(seq));
    const withExplicit = playDiceCategoryRound(seqRng(seq), 5);
    expect(withExplicit).toEqual(withDefault);
    expect(withExplicit.a).toHaveLength(5);
    expect(withExplicit.b).toHaveLength(5);
  });

  it("각 눈은 1..6 범위이고 길이는 diceCount이다", () => {
    const rng = seqRng([0, 1, 2, 3, 5, 4, 0, 5, 1, 2]);
    const result = playDiceCategoryRound(rng, 5);
    expect(result.a).toHaveLength(5);
    expect(result.b).toHaveLength(5);
    for (const die of [...result.a, ...result.b]) {
      expect(Number.isInteger(die)).toBe(true);
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    }
  });

  it("같은 nextInt 시퀀스는 같은 결과를 낸다(결정적)", () => {
    const seq = [4, 0, 2, 1, 3, 5, 5, 4, 2, 1];
    const r1 = playDiceCategoryRound(seqRng(seq));
    const r2 = playDiceCategoryRound(seqRng(seq));
    expect(r1).toEqual(r2);
  });

  it("diceCount < 5 이면 throw", () => {
    expect(() => playDiceCategoryRound(seqRng([]), 4)).toThrow();
    expect(() => playDiceCategoryRound(seqRng([]), 0)).toThrow();
    expect(() => playDiceCategoryRound(seqRng([]), -1)).toThrow();
  });

  it("diceCount가 정수가 아니면 throw", () => {
    expect(() => playDiceCategoryRound(seqRng([]), 5.5)).toThrow();
    expect(() => playDiceCategoryRound(seqRng([]), Number.NaN)).toThrow();
  });

  it("범위 밖 눈을 만들면 throw", () => {
    // nextInt가 6을 돌려주면 눈은 7 -> throw
    const badRng: RandomSource = { nextInt: () => 6 };
    expect(() => playDiceCategoryRound(badRng)).toThrow();
  });
});
