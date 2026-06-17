import { describe, it, expect } from "vitest";
import { toWinRankingRows } from "./recordsRankingView";
import { rankPlayers } from "../../domain/leaderboard";
import type { PlayerStats } from "../../domain/gameRecord";

describe("toWinRankingRows", () => {
  it("빈 입력이면 빈 배열을 반환한다", () => {
    expect(toWinRankingRows([])).toEqual([]);
  });

  it("domain/rankPlayers와 동일한 순서·rank를 낸다", () => {
    const stats: PlayerStats[] = [
      { player: "b", wins: 1, losses: 2, draws: 0 },
      { player: "a", wins: 3, losses: 0, draws: 1 },
      { player: "c", wins: 2, losses: 1, draws: 0 },
    ];
    expect(toWinRankingRows(stats)).toEqual(rankPlayers(stats));
  });

  it("동점(같은 정렬키)은 같은 rank를 공유한다(표준 경쟁식: 1,2,2,4)", () => {
    // wins·winRate·losses가 같은 두 플레이어(p2, p3)는 같은 rank.
    const stats: PlayerStats[] = [
      { player: "p1", wins: 5, losses: 0, draws: 0 }, // 1위
      { player: "p2", wins: 3, losses: 1, draws: 0 }, // 공동 2위
      { player: "p3", wins: 3, losses: 1, draws: 0 }, // 공동 2위
      { player: "p4", wins: 1, losses: 4, draws: 0 }, // 4위
    ];
    const rows = toWinRankingRows(stats);
    const rankOf = (p: string) => rows.find((r) => r.player === p)!.rank;
    expect(rankOf("p1")).toBe(1);
    expect(rankOf("p2")).toBe(2);
    expect(rankOf("p3")).toBe(2);
    expect(rankOf("p4")).toBe(4);
  });

  it("winRate와 gamesPlayed 값이 올바르다", () => {
    const stats: PlayerStats[] = [
      { player: "a", wins: 3, losses: 1, draws: 0 }, // 4판, 0.75
      { player: "b", wins: 0, losses: 0, draws: 0 }, // 0판, 0
    ];
    const rows = toWinRankingRows(stats);
    const a = rows.find((r) => r.player === "a")!;
    const b = rows.find((r) => r.player === "b")!;
    expect(a.gamesPlayed).toBe(4);
    expect(a.winRate).toBeCloseTo(0.75);
    expect(b.gamesPlayed).toBe(0);
    expect(b.winRate).toBe(0);
  });

  it("입력 배열과 요소를 변형하지 않는다", () => {
    const stats: PlayerStats[] = [
      { player: "a", wins: 2, losses: 1, draws: 0 },
      { player: "b", wins: 1, losses: 2, draws: 0 },
    ];
    const snapshot = JSON.parse(JSON.stringify(stats));
    toWinRankingRows(stats);
    expect(stats).toEqual(snapshot);
  });
});
