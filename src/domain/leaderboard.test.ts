import { describe, expect, it } from "vitest";
import type { PlayerStats } from "./gameRecord";
import { rankPlayers } from "./leaderboard";

describe("rankPlayers", () => {
  it("returns an empty array for empty input", () => {
    expect(rankPlayers([])).toEqual([]);
  });

  it("ranks a single player as rank 1 with correct winRate and gamesPlayed", () => {
    const result = rankPlayers([{ player: "a", wins: 3, losses: 1, draws: 0 }]);
    expect(result).toEqual([
      { player: "a", wins: 3, losses: 1, draws: 0, gamesPlayed: 4, winRate: 0.75, rank: 1 },
    ]);
  });

  it("orders by wins descending", () => {
    const stats: PlayerStats[] = [
      { player: "a", wins: 1, losses: 0, draws: 0 },
      { player: "b", wins: 3, losses: 0, draws: 0 },
      { player: "c", wins: 2, losses: 0, draws: 0 },
    ];
    expect(rankPlayers(stats).map((r) => r.player)).toEqual(["b", "c", "a"]);
    expect(rankPlayers(stats).map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("breaks tied wins by winRate descending", () => {
    // both have 2 wins, but a has fewer games (higher winRate).
    const stats: PlayerStats[] = [
      { player: "b", wins: 2, losses: 2, draws: 0 }, // winRate 0.5
      { player: "a", wins: 2, losses: 0, draws: 0 }, // winRate 1.0
    ];
    const result = rankPlayers(stats);
    expect(result.map((r) => r.player)).toEqual(["a", "b"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("breaks tied wins+winRate by losses ascending", () => {
    // same wins (2) and same winRate (1.0, no losses) handled by label;
    // here use losses tiebreak: equal wins & winRate requires equal winRate.
    const stats: PlayerStats[] = [
      { player: "a", wins: 0, losses: 2, draws: 0 }, // winRate 0
      { player: "b", wins: 0, losses: 1, draws: 0 }, // winRate 0, fewer losses
    ];
    const result = rankPlayers(stats);
    expect(result.map((r) => r.player)).toEqual(["b", "a"]);
  });

  it("shares rank for full ties and skips the next rank (1,2,2,4)", () => {
    const stats: PlayerStats[] = [
      { player: "a", wins: 3, losses: 0, draws: 0 },
      { player: "b", wins: 2, losses: 1, draws: 0 },
      { player: "c", wins: 2, losses: 1, draws: 0 },
      { player: "d", wins: 1, losses: 2, draws: 0 },
    ];
    const result = rankPlayers(stats);
    expect(result.map((r) => r.player)).toEqual(["a", "b", "c", "d"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("uses player label as the final deterministic tiebreak", () => {
    const stats: PlayerStats[] = [
      { player: "z", wins: 1, losses: 1, draws: 0 },
      { player: "a", wins: 1, losses: 1, draws: 0 },
    ];
    const result = rankPlayers(stats);
    // identical sort keys (1~3) -> share rank, but stable label order a before z.
    expect(result.map((r) => r.player)).toEqual(["a", "z"]);
    expect(result.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("treats a zero-games player as winRate 0 (not NaN)", () => {
    const result = rankPlayers([{ player: "a", wins: 0, losses: 0, draws: 0 }]);
    expect(result[0]!.winRate).toBe(0);
    expect(Number.isNaN(result[0]!.winRate)).toBe(false);
    expect(result[0]!.gamesPlayed).toBe(0);
  });

  it("counts draws toward gamesPlayed and winRate", () => {
    const result = rankPlayers([{ player: "a", wins: 1, losses: 1, draws: 2 }]);
    expect(result[0]!.gamesPlayed).toBe(4);
    expect(result[0]!.winRate).toBe(0.25);
  });

  it("does not mutate the input array or its elements", () => {
    const stats: PlayerStats[] = [
      { player: "a", wins: 1, losses: 0, draws: 0 },
      { player: "b", wins: 2, losses: 0, draws: 0 },
    ];
    const snapshot = JSON.parse(JSON.stringify(stats));
    rankPlayers(stats);
    expect(stats).toEqual(snapshot);
    expect(stats[0]!.player).toBe("a");
  });
});
