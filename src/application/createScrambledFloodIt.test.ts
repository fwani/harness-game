import { describe, expect, it } from "vitest";
import { createScrambledFloodIt } from "./createScrambledFloodIt";
import { isFloodItSolved } from "../domain/floodIt";
import type { RandomSource } from "./dealCards";

/**
 * 미리 정한 값 목록을 순서대로 반환하고(소진되면 되감음) maxExclusive 범위로 매핑하는 결정적 rng.
 * 항상 유효 인덱스(0..maxExclusive-1)를 보장한다.
 */
class RecordingRandom implements RandomSource {
  private i = 0;
  readonly returned: number[] = [];
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const raw = this.values[this.i % this.values.length]!;
    this.i += 1;
    const v = ((raw % maxExclusive) + maxExclusive) % maxExclusive;
    this.returned.push(v);
    return v;
  }
}

/** 항상 0(색 0)을 반환하는 스텁 → 보드가 전부 단색이 된다. */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

/** 항상 maxExclusive(경계 밖)를 반환하는 비정상 스텁(방어적 throw 검증용). */
class OutOfRangeRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    return maxExclusive;
  }
}

describe("createScrambledFloodIt", () => {
  it("반환 상태의 size/colorCount가 입력과 일치하고 모든 칸이 0..colorCount-1 범위다", () => {
    const colorCount = 4;
    for (const size of [2, 3, 5]) {
      const state = createScrambledFloodIt(
        size,
        colorCount,
        new RecordingRandom([0, 1, 2, 3, 2, 1, 0, 3]),
      );
      expect(state.size).toBe(size);
      expect(state.colorCount).toBe(colorCount);
      expect(state.board).toHaveLength(size);
      for (const row of state.board) {
        expect(row).toHaveLength(size);
        for (const color of row) {
          expect(Number.isInteger(color)).toBe(true);
          expect(color).toBeGreaterThanOrEqual(0);
          expect(color).toBeLessThan(colorCount);
        }
      }
    }
  });

  it("같은 stub 시퀀스·같은 입력이면 결정적으로 동일한 보드를 반환한다", () => {
    const seed = [3, 1, 0, 2, 2, 3, 1, 0, 2, 1, 3, 0];
    const a = createScrambledFloodIt(4, 3, new RecordingRandom(seed));
    const b = createScrambledFloodIt(4, 3, new RecordingRandom(seed));
    expect(a).toEqual(b);
  });

  it("colorCount >= 2일 때 시작 상태는 단색(클리어)이 아니다", () => {
    for (const size of [2, 3, 4]) {
      // 무작위 보드.
      const state = createScrambledFloodIt(
        size,
        3,
        new RecordingRandom([0, 1, 2, 1, 0, 2, 2, 0, 1]),
      );
      expect(isFloodItSolved(state)).toBe(false);
    }
  });

  it("우연히 전부 단색이 나와도(ZeroRandom) colorCount>=2·size>=2면 한 칸을 바꿔 단색을 깬다", () => {
    const state = createScrambledFloodIt(3, 2, new ZeroRandom());
    expect(isFloodItSolved(state)).toBe(false);
    // 우하단 칸만 다른 색(1), 나머지는 0.
    expect(state.board[state.size - 1]![state.size - 1]).toBe(1);
    expect(state.board[0]![0]).toBe(0);
  });

  it("colorCount === 1이면 단색을 피할 수 없으므로 단색(클리어) 보드를 그대로 허용한다", () => {
    const state = createScrambledFloodIt(3, 1, new ZeroRandom());
    expect(state.colorCount).toBe(1);
    expect(isFloodItSolved(state)).toBe(true);
    for (const row of state.board) {
      for (const color of row) {
        expect(color).toBe(0);
      }
    }
  });

  it("size === 1이면 칸이 하나뿐이라 단색을 허용한다(colorCount>=2여도)", () => {
    const state = createScrambledFloodIt(1, 3, new RecordingRandom([2]));
    expect(state.size).toBe(1);
    expect(isFloodItSolved(state)).toBe(true);
    expect(state.board[0]![0]).toBe(2);
  });

  it("RandomSource가 범위 밖 인덱스를 주면 방어적으로 throw 한다", () => {
    expect(() =>
      createScrambledFloodIt(3, 3, new OutOfRangeRandom()),
    ).toThrow(/out-of-range/);
  });

  it("colorCount가 1 미만/비정수면 throw 한다", () => {
    expect(() => createScrambledFloodIt(3, 0, new ZeroRandom())).toThrow(
      /colorCount는 1 이상의 정수/,
    );
    expect(() => createScrambledFloodIt(3, 2.5, new ZeroRandom())).toThrow(
      /colorCount는 1 이상의 정수/,
    );
  });

  it("잘못된 size(<1·비정수)는 빈 보드가 되어 domain createFloodIt가 throw 한다", () => {
    expect(() => createScrambledFloodIt(0, 3, new ZeroRandom())).toThrow(
      /최소 1×1/,
    );
    expect(() => createScrambledFloodIt(2.5, 3, new ZeroRandom())).toThrow(
      /최소 1×1/,
    );
  });

  it("입력 random만 소비하며 색 추첨은 칸당 1회(size*size회)다", () => {
    const rng = new RecordingRandom([0, 1, 2, 1, 0, 2, 2, 0, 1]);
    createScrambledFloodIt(3, 3, rng);
    // 3×3=9칸 → nextInt 9회. 단색 보정은 rng를 소비하지 않는다.
    expect(rng.returned).toHaveLength(9);
  });
});
