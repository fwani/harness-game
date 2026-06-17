import { describe, expect, it } from "vitest";
import {
  generateSingleEliminationFirstRound,
  type BracketPairing,
} from "./singleElimination";

/** 대진에 등장한 모든 실제 참가자(부전승 상대 null 제외)를 수집한다. */
function collectParticipants(pairings: BracketPairing[]): string[] {
  const seen: string[] = [];
  for (const { a, b } of pairings) {
    seen.push(a);
    if (b !== null) {
      seen.push(b);
    }
  }
  return seen;
}

describe("generateSingleEliminationFirstRound", () => {
  it("pairs 2 players (2^1) as a single match", () => {
    const pairings = generateSingleEliminationFirstRound(["s1", "s2"]);
    expect(pairings).toEqual([{ a: "s1", b: "s2" }]);
  });

  it("places 4 players (2^2) in standard seed order (1v4, 2v3)", () => {
    const pairings = generateSingleEliminationFirstRound(["s1", "s2", "s3", "s4"]);
    expect(pairings).toEqual([
      { a: "s1", b: "s4" },
      { a: "s2", b: "s3" },
    ]);
  });

  it("places 8 players (2^3) into the standard 8-bracket matchups", () => {
    const players = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
    const pairings = generateSingleEliminationFirstRound(players);
    expect(pairings).toHaveLength(4);
    // 표준 8강 시드 배치의 대진(쌍)들: 1-8, 4-5, 3-6, 2-7. 각 대진은 한 번씩만 등장한다.
    const matchups = new Set(pairings.map((p) => `${p.a}|${p.b}`));
    expect(matchups).toEqual(
      new Set(["s1|s8", "s4|s5", "s3|s6", "s2|s7"]),
    );
    // 모든 참가자가 정확히 한 대진에 포함된다.
    const participants = collectParticipants(pairings);
    expect(participants).toHaveLength(8);
    expect(new Set(participants).size).toBe(8);
  });

  it("gives the top seed a bye for 3 players (bracketSize 4)", () => {
    const pairings = generateSingleEliminationFirstRound(["s1", "s2", "s3"]);
    expect(pairings).toEqual([
      { a: "s1", b: null },
      { a: "s2", b: "s3" },
    ]);
  });

  it("gives the top 3 seeds byes for 5 players (bracketSize 8)", () => {
    const pairings = generateSingleEliminationFirstRound([
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
    ]);
    expect(pairings).toHaveLength(4);
    // 부전승을 받은 시드(상대 null)와 정상 대진을 구분한다.
    const byes = pairings.filter((p) => p.b === null).map((p) => p.a);
    const matches = pairings.filter((p) => p.b !== null);
    expect(new Set(byes)).toEqual(new Set(["s1", "s2", "s3"]));
    expect(matches).toEqual([{ a: "s4", b: "s5" }]);
  });

  it("gives the top 2 seeds byes for 6 players (bracketSize 8)", () => {
    const pairings = generateSingleEliminationFirstRound([
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
    ]);
    expect(pairings).toHaveLength(4);
    const byes = pairings.filter((p) => p.b === null).map((p) => p.a);
    const matchups = new Set(
      pairings.filter((p) => p.b !== null).map((p) => `${p.a}|${p.b}`),
    );
    // 상위 2개 시드(1,2번)가 부전승.
    expect(new Set(byes)).toEqual(new Set(["s1", "s2"]));
    expect(matchups).toEqual(new Set(["s4|s5", "s3|s6"]));
  });

  it("returns an empty bracket for 0 or 1 players", () => {
    expect(generateSingleEliminationFirstRound([])).toEqual([]);
    expect(generateSingleEliminationFirstRound(["solo"])).toEqual([]);
  });

  it("includes every real participant in exactly one pairing (5 players)", () => {
    const players = ["a", "b", "c", "d", "e"];
    const pairings = generateSingleEliminationFirstRound(players);
    const participants = collectParticipants(pairings);
    expect(new Set(participants)).toEqual(new Set(players));
    expect(participants).toHaveLength(players.length);
  });

  it("throws on duplicate identifiers", () => {
    expect(() =>
      generateSingleEliminationFirstRound(["A", "B", "A"]),
    ).toThrow();
  });

  it("throws on empty-string identifiers", () => {
    expect(() => generateSingleEliminationFirstRound(["A", "", "B"])).toThrow();
  });

  it("is deterministic: identical input yields identical output", () => {
    const players = ["w", "x", "y", "z", "v", "u"];
    expect(generateSingleEliminationFirstRound(players)).toEqual(
      generateSingleEliminationFirstRound(players),
    );
  });

  it("does not mutate the input array", () => {
    const players = ["s1", "s2", "s3", "s4", "s5", "s6"];
    const snapshot = [...players];
    generateSingleEliminationFirstRound(players);
    expect(players).toEqual(snapshot);
  });
});
