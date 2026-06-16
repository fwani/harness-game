import { describe, expect, it } from "vitest";
import { generateRoundRobinSchedule, type Round } from "./roundRobin";

/** 비순서 쌍 키(정렬해 방향 무관하게 비교). */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/** 일정 전체에서 등장한 모든 비순서 쌍을 수집한다. */
function collectPairs(schedule: Round[]): string[] {
  return schedule.flatMap((round) => round.map((p) => pairKey(p.a, p.b)));
}

describe("generateRoundRobinSchedule", () => {
  it("schedules an even number of players (4) with every pair exactly once", () => {
    const schedule = generateRoundRobinSchedule(["A", "B", "C", "D"]);
    expect(schedule).toHaveLength(3);
    for (const round of schedule) {
      expect(round).toHaveLength(2);
    }
    const pairs = collectPairs(schedule);
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs)).toEqual(
      new Set([
        pairKey("A", "B"),
        pairKey("A", "C"),
        pairKey("A", "D"),
        pairKey("B", "C"),
        pairKey("B", "D"),
        pairKey("C", "D"),
      ]),
    );
  });

  it("schedules an odd number of players (3) with one bye per round", () => {
    const schedule = generateRoundRobinSchedule(["A", "B", "C"]);
    expect(schedule).toHaveLength(3);
    for (const round of schedule) {
      expect(round).toHaveLength(1);
    }
    const pairs = collectPairs(schedule);
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs)).toEqual(
      new Set([pairKey("A", "B"), pairKey("A", "C"), pairKey("B", "C")]),
    );
  });

  it("has every unordered pair exactly once across the whole schedule", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const schedule = generateRoundRobinSchedule(players);
    const pairs = collectPairs(schedule);
    // n=6 -> 6*5/2 = 15 쌍, 각 1회.
    expect(pairs).toHaveLength(15);
    expect(new Set(pairs).size).toBe(15);
    const counts = new Map<string, number>();
    for (const key of pairs) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBe(1);
    }
  });

  it("never lists a participant more than once within a single round", () => {
    const players = ["a", "b", "c", "d", "e"];
    const schedule = generateRoundRobinSchedule(players);
    for (const round of schedule) {
      const seen = new Set<string>();
      for (const { a, b } of round) {
        expect(seen.has(a)).toBe(false);
        expect(seen.has(b)).toBe(false);
        seen.add(a);
        seen.add(b);
      }
    }
  });

  it("returns an empty schedule for 0 or 1 players", () => {
    expect(generateRoundRobinSchedule([])).toEqual([]);
    expect(generateRoundRobinSchedule(["solo"])).toEqual([]);
  });

  it("throws on duplicate identifiers", () => {
    expect(() => generateRoundRobinSchedule(["A", "B", "A"])).toThrow();
  });

  it("throws on empty-string identifiers", () => {
    expect(() => generateRoundRobinSchedule(["A", "", "B"])).toThrow();
  });

  it("is deterministic: identical input yields identical output", () => {
    const players = ["w", "x", "y", "z"];
    expect(generateRoundRobinSchedule(players)).toEqual(
      generateRoundRobinSchedule(players),
    );
  });

  it("does not mutate the input array", () => {
    const players = ["A", "B", "C", "D"];
    const snapshot = [...players];
    generateRoundRobinSchedule(players);
    expect(players).toEqual(snapshot);
  });
});
