import { describe, expect, it } from "vitest";
import { computeEloRatings } from "./eloRatings";
import { updateElo } from "./elo";
import type { GameRecord } from "./gameRecord";

function record(
  pa: string,
  ra: "win" | "loss" | "draw",
  pb: string,
  rb: "win" | "loss" | "draw",
): GameRecord {
  return {
    game: "card",
    outcomes: [
      { player: pa, result: ra },
      { player: pb, result: rb },
    ],
  };
}

describe("computeEloRatings", () => {
  it("returns an empty array for empty records", () => {
    expect(computeEloRatings([])).toEqual([]);
  });

  it("matches updateElo after a single game", () => {
    const ratings = computeEloRatings([record("a", "win", "b", "loss")]);
    const expected = updateElo(1000, 1000, "win", 32);
    expect(ratings).toEqual([
      { player: "a", rating: expected.ratingA, games: 1 },
      { player: "b", rating: expected.ratingB, games: 1 },
    ]);
    expect(ratings[0]!.rating).toBe(1016);
    expect(ratings[1]!.rating).toBe(984);
  });

  it("accumulates multiple games between the same two players", () => {
    const records = [
      record("a", "win", "b", "loss"),
      record("a", "win", "b", "loss"),
    ];
    const ratings = computeEloRatings(records);

    // 수동 재생으로 동일 값을 검증.
    let ra = 1000;
    let rb = 1000;
    for (let i = 0; i < 2; i++) {
      const u = updateElo(ra, rb, "win", 32);
      ra = u.ratingA;
      rb = u.ratingB;
    }
    expect(ratings).toEqual([
      { player: "a", rating: ra, games: 2 },
      { player: "b", rating: rb, games: 2 },
    ]);
  });

  it("returns players in first-appearance order with 3+ players", () => {
    const records = [
      record("b", "win", "a", "loss"),
      record("c", "win", "a", "loss"),
    ];
    const ratings = computeEloRatings(records);
    expect(ratings.map((r) => r.player)).toEqual(["b", "a", "c"]);
    expect(ratings.find((r) => r.player === "a")!.games).toBe(2);
    expect(ratings.find((r) => r.player === "b")!.games).toBe(1);
    expect(ratings.find((r) => r.player === "c")!.games).toBe(1);
  });

  it("handles draws (both sides 0.5)", () => {
    const ratings = computeEloRatings([record("a", "draw", "b", "draw")]);
    // 동률 레이팅 무승부는 변화가 없다.
    expect(ratings).toEqual([
      { player: "a", rating: 1000, games: 1 },
      { player: "b", rating: 1000, games: 1 },
    ]);
  });

  it("respects initialRating and kFactor options", () => {
    const ratings = computeEloRatings([record("a", "win", "b", "loss")], {
      initialRating: 1500,
      kFactor: 16,
    });
    const expected = updateElo(1500, 1500, "win", 16);
    expect(ratings).toEqual([
      { player: "a", rating: expected.ratingA, games: 1 },
      { player: "b", rating: expected.ratingB, games: 1 },
    ]);
  });

  it("throws when a record does not have exactly 2 outcomes", () => {
    const bad: GameRecord = {
      game: "card",
      outcomes: [{ player: "a", result: "win" }],
    };
    expect(() => computeEloRatings([bad])).toThrow();
  });

  it("throws when initialRating is not finite", () => {
    expect(() =>
      computeEloRatings([record("a", "win", "b", "loss")], {
        initialRating: Number.NaN,
      }),
    ).toThrow();
  });

  it("propagates updateElo throw for invalid kFactor", () => {
    expect(() =>
      computeEloRatings([record("a", "win", "b", "loss")], { kFactor: 0 }),
    ).toThrow();
  });

  it("does not mutate the input records array or elements", () => {
    const records = [record("a", "win", "b", "loss")];
    const snapshot = JSON.parse(JSON.stringify(records));
    computeEloRatings(records);
    expect(records).toEqual(snapshot);
  });
});
