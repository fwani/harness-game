import { describe, expect, it } from "vitest";
import { generateLadderRungs, playLadder } from "./playLadder";
import { resolveLadderAll } from "../domain/ladder";
import type { RandomSource } from "./dealCards";

/** 항상 0번 후보를 고르는 스텁(여러 row에서 결정적으로 동작). */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

/** 선형 합동 생성기 기반의 의사난수(시드별 결정적). 여러 seed로 규칙 위반을 검증한다. */
class LcgRandom implements RandomSource {
  private state: number;
  constructor(seed: number) {
    this.state = (seed >>> 0) || 1;
  }
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    // 32-bit LCG (numerical recipes 상수)
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state % maxExclusive;
  }
}

/** 0..n-1 정렬 배열인지(순열) 검사. */
function isPermutation(arr: number[], n: number): boolean {
  if (arr.length !== n) return false;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.every((v, i) => v === i);
}

describe("generateLadderRungs", () => {
  it("입력 검증: columnCount < 2 또는 비정수면 throw", () => {
    const rng = new ZeroRandom();
    expect(() => generateLadderRungs(1, 3, rng)).toThrow();
    expect(() => generateLadderRungs(0, 3, rng)).toThrow();
    expect(() => generateLadderRungs(2.5, 3, rng)).toThrow();
  });

  it("입력 검증: rowCount < 1 또는 비정수면 throw", () => {
    const rng = new ZeroRandom();
    expect(() => generateLadderRungs(3, 0, rng)).toThrow();
    expect(() => generateLadderRungs(3, -1, rng)).toThrow();
    expect(() => generateLadderRungs(3, 2.5, rng)).toThrow();
  });

  it("생성된 rungs는 resolveLadderAll에서 throw 없이 순열을 만든다(여러 seed)", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      for (const columnCount of [2, 3, 4, 5, 8]) {
        for (const rowCount of [1, 3, 7]) {
          const rng = new LcgRandom(seed * 131 + columnCount * 7 + rowCount);
          const rungs = generateLadderRungs(columnCount, rowCount, rng);
          // 도메인 validateLadder 규칙을 위반하지 않아야 한다(throw 없음).
          const assignment = resolveLadderAll(columnCount, rungs);
          expect(isPermutation(assignment, columnCount)).toBe(true);
        }
      }
    }
  });

  it("rng만으로 결정적: 같은 seed면 같은 rungs", () => {
    const a = generateLadderRungs(4, 5, new LcgRandom(42));
    const b = generateLadderRungs(4, 5, new LcgRandom(42));
    expect(a).toEqual(b);
  });

  it("같은 row에서 인접/중복 노드를 공유하지 않는다", () => {
    // columnCount=5 → 후보 0..3. 항상 0을 고르면 0 배치 후 -1,0,1 제거 → 2,3 남고 2의 인덱스0 선택...
    const rungs = generateLadderRungs(5, 1, new ZeroRandom());
    const byRow = new Map<number, number[]>();
    for (const r of rungs) {
      const lefts = byRow.get(r.row) ?? [];
      lefts.push(r.left);
      byRow.set(r.row, lefts);
    }
    for (const lefts of byRow.values()) {
      const sorted = [...lefts].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1) {
        // 인접한 left끼리 최소 2 이상 차이나야 노드 공유가 없다.
        expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("playLadder", () => {
  it("입력 검증: 길이 불일치면 throw", () => {
    expect(() =>
      playLadder(["a", "b"], ["x"], 3, new ZeroRandom()),
    ).toThrow();
  });

  it("입력 검증: 길이 < 2면 throw", () => {
    expect(() => playLadder(["a"], ["x"], 3, new ZeroRandom())).toThrow();
    expect(() => playLadder([], [], 3, new ZeroRandom())).toThrow();
  });

  it("pairs는 players[i] → outcomes[assignment[i]]와 정확히 일치한다", () => {
    const players = ["철수", "영희", "민수"];
    const outcomes = ["꽝", "당첨", "한번더"];
    const result = playLadder(players, outcomes, 5, new LcgRandom(7));
    expect(result.columnCount).toBe(3);
    expect(isPermutation(result.assignment, 3)).toBe(true);
    expect(result.pairs).toHaveLength(3);
    result.pairs.forEach((pair, i) => {
      expect(pair.player).toBe(players[i]);
      expect(pair.outcome).toBe(outcomes[result.assignment[i]!]);
    });
  });

  it("결정적: 같은 seed면 같은 결과", () => {
    const players = ["a", "b", "c", "d"];
    const outcomes = ["1", "2", "3", "4"];
    const r1 = playLadder(players, outcomes, 6, new LcgRandom(99));
    const r2 = playLadder(players, outcomes, 6, new LcgRandom(99));
    expect(r1).toEqual(r2);
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const players = ["a", "b", "c"];
    const outcomes = ["x", "y", "z"];
    const playersCopy = [...players];
    const outcomesCopy = [...outcomes];
    playLadder(players, outcomes, 4, new LcgRandom(3));
    expect(players).toEqual(playersCopy);
    expect(outcomes).toEqual(outcomesCopy);
  });

  it("assignment의 각 outcome이 정확히 한 번씩 배정된다(순열)", () => {
    const players = ["p0", "p1", "p2", "p3", "p4"];
    const outcomes = ["o0", "o1", "o2", "o3", "o4"];
    for (let seed = 1; seed <= 10; seed += 1) {
      const result = playLadder(players, outcomes, 8, new LcgRandom(seed));
      const assignedOutcomes = result.pairs.map((p) => p.outcome).sort();
      expect(assignedOutcomes).toEqual([...outcomes].sort());
    }
  });
});
