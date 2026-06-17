import { describe, expect, it } from "vitest";
import { createShuffledSlidePuzzle } from "./createShuffledSlidePuzzle";
import {
  createSlidePuzzle,
  isSlidePuzzleSolvable,
  isSlidePuzzleSolved,
  type SlidePuzzleState,
} from "../domain/slidePuzzle";
import type { RandomSource } from "./dealCards";

/** 미리 정한 값 목록을 순서대로 반환하고, 소진되면 처음으로 되감는 결정적 rng. */
class CyclicRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const raw = this.values[this.i % this.values.length]!;
    this.i += 1;
    // 합법 수 개수 범위로 안전하게 매핑(항상 유효 인덱스).
    return raw % maxExclusive;
  }
}

/** 항상 0(첫 합법 수)을 반환하는 스텁. */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

describe("createShuffledSlidePuzzle", () => {
  it("반환 상태는 항상 풀이 가능(solvable)하다", () => {
    for (const size of [2, 3, 4, 5]) {
      const state = createShuffledSlidePuzzle(
        size,
        new CyclicRandom([2, 0, 3, 1, 2, 1, 0, 3]),
      );
      expect(isSlidePuzzleSolvable(state)).toBe(true);
      // 타일 구성은 보존된다(0..N-1 한 번씩).
      const sorted = [...state.tiles].sort((a, b) => a - b);
      expect(sorted).toEqual(
        Array.from({ length: size * size }, (_, i) => i),
      );
    }
  });

  it("시작 상태는 완성(solved)되어 있지 않다", () => {
    for (const size of [2, 3, 4]) {
      const state = createShuffledSlidePuzzle(
        size,
        new CyclicRandom([1, 3, 0, 2, 3, 1, 2, 0]),
      );
      expect(isSlidePuzzleSolved(state)).toBe(false);
    }
  });

  it("완성으로 되돌아가는 시퀀스라도 한 수 더 섞어 solved가 아니게 만든다", () => {
    // 2x2에서 ZeroRandom(항상 첫 합법 수)로 짝수번 셔플하면 완성으로 돌아올 수 있다.
    // shuffleMoves를 0으로 주면 완성 상태에서 보정 한 수가 적용되어야 한다.
    const state = createShuffledSlidePuzzle(2, new ZeroRandom(), 0);
    expect(isSlidePuzzleSolved(state)).toBe(false);
    expect(isSlidePuzzleSolvable(state)).toBe(true);
  });

  it("같은 시드/입력이면 결정적으로 동일한 결과를 반환한다", () => {
    const seed = [4, 2, 7, 1, 5, 3, 6, 0, 2, 9];
    const a = createShuffledSlidePuzzle(4, new CyclicRandom(seed));
    const b = createShuffledSlidePuzzle(4, new CyclicRandom(seed));
    expect(a).toEqual(b);
  });

  it("shuffleMoves를 명시하면 그 횟수만큼만 섞는다", () => {
    // ZeroRandom으로 1수만 섞으면 완성 상태에서 첫 합법 수 한 번 적용한 상태와 같다.
    const state = createShuffledSlidePuzzle(4, new ZeroRandom(), 1);
    expect(isSlidePuzzleSolved(state)).toBe(false);
    expect(isSlidePuzzleSolvable(state)).toBe(true);
  });

  it("잘못된 size는 domain의 검증 에러를 그대로 전파한다", () => {
    expect(() => createShuffledSlidePuzzle(1, new ZeroRandom())).toThrow(
      /size는 2 이상의 정수/,
    );
    expect(() => createShuffledSlidePuzzle(2.5, new ZeroRandom())).toThrow(
      /size는 2 이상의 정수/,
    );
  });

  it("입력 size로 만든 완성 상태와 동일한 타일 집합·크기를 유지한다", () => {
    const solved: SlidePuzzleState = createSlidePuzzle(3);
    const shuffled = createShuffledSlidePuzzle(
      3,
      new CyclicRandom([1, 0, 2, 3]),
    );
    expect(shuffled.size).toBe(solved.size);
    expect(shuffled.tiles).toHaveLength(solved.tiles.length);
  });
});
