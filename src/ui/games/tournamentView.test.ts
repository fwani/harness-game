import { describe, expect, it } from "vitest";
import { generateRoundRobinSchedule } from "../../domain/roundRobin";
import { computeStandings } from "../../domain/standings";
import {
  allMatchesDecided,
  byePlayersForRound,
  decidedCount,
  flattenSchedule,
  toMatchResults,
  validatePlayers,
  type ScheduledMatch,
} from "./tournamentView";

describe("validatePlayers", () => {
  it("trims names and drops blanks", () => {
    const { players, error } = validatePlayers(["  Alice ", "", "Bob", "   "]);
    expect(players).toEqual(["Alice", "Bob"]);
    expect(error).toBeNull();
  });

  it("rejects fewer than two players", () => {
    const { error } = validatePlayers(["Solo", "  "]);
    expect(error).toBe("참가자를 2명 이상 입력하세요.");
  });

  it("rejects duplicate names", () => {
    const { error } = validatePlayers(["Alice", "Alice"]);
    expect(error).toContain("중복");
  });
});

describe("flattenSchedule", () => {
  it("flattens rounds into matches with stable unique ids", () => {
    const schedule = generateRoundRobinSchedule(["A", "B", "C", "D"]);
    const matches = flattenSchedule(schedule);

    // 4명 짝수 → 3라운드 × 2경기 = 6경기.
    expect(matches).toHaveLength(6);
    const ids = matches.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    // 모든 쌍이 정확히 한 번씩.
    const pairs = matches.map((m) => [m.a, m.b].sort().join("-")).sort();
    expect(pairs).toEqual(["A-B", "A-C", "A-D", "B-C", "B-D", "C-D"]);
  });

  it("returns empty list for an empty schedule", () => {
    expect(flattenSchedule([])).toEqual([]);
  });
});

describe("byePlayersForRound", () => {
  it("identifies the resting player each round for odd participant counts", () => {
    const players = ["A", "B", "C"];
    const schedule = generateRoundRobinSchedule(players);
    // 홀수 3명 → 3라운드, 매 라운드 정확히 1명 부전승.
    for (const round of schedule) {
      const byes = byePlayersForRound(round, players);
      expect(byes).toHaveLength(1);
    }
  });

  it("returns no byes for even participant counts", () => {
    const players = ["A", "B", "C", "D"];
    const schedule = generateRoundRobinSchedule(players);
    for (const round of schedule) {
      expect(byePlayersForRound(round, players)).toEqual([]);
    }
  });
});

describe("toMatchResults", () => {
  const matches: ScheduledMatch[] = [
    { round: 0, index: 0, id: "r0-m0", a: "A", b: "B" },
    { round: 0, index: 1, id: "r0-m1", a: "C", b: "D" },
    { round: 1, index: 0, id: "r1-m0", a: "A", b: "C" },
  ];

  it("maps entered outcomes and skips undecided matches", () => {
    const results = toMatchResults(matches, { "r0-m0": "a", "r1-m0": "draw" });
    expect(results).toEqual([
      { pairing: { a: "A", b: "B" }, outcome: "a" },
      { pairing: { a: "A", b: "C" }, outcome: "draw" },
    ]);
  });

  it("feeds computeStandings to produce a ranking", () => {
    const results = toMatchResults(matches, { "r0-m0": "a", "r0-m1": "b", "r1-m0": "a" });
    const standings = computeStandings(results);
    const top = standings[0]!;
    // A가 2승으로 단독 1위(승점 6).
    expect(top.player).toBe("A");
    expect(top.rank).toBe(1);
    expect(top.wins).toBe(2);
    expect(top.points).toBe(6);
  });
});

describe("allMatchesDecided / decidedCount", () => {
  const matches: ScheduledMatch[] = [
    { round: 0, index: 0, id: "r0-m0", a: "A", b: "B" },
    { round: 0, index: 1, id: "r0-m1", a: "C", b: "D" },
  ];

  it("is false until every match has a result", () => {
    expect(allMatchesDecided(matches, { "r0-m0": "a" })).toBe(false);
    expect(decidedCount(matches, { "r0-m0": "a" })).toBe(1);
  });

  it("is true once all matches are decided", () => {
    const outcomes = { "r0-m0": "a", "r0-m1": "draw" } as const;
    expect(allMatchesDecided(matches, outcomes)).toBe(true);
    expect(decidedCount(matches, outcomes)).toBe(2);
  });

  it("is false for an empty schedule", () => {
    expect(allMatchesDecided([], {})).toBe(false);
  });
});
