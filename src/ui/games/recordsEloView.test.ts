import { describe, it, expect } from "vitest";
import { toEloLeaderboard } from "./recordsEloView";
import type { GameRecord } from "../../domain/gameRecord";

/** (win, loss) 2인 기록 헬퍼: winner가 a 슬롯(win), loser가 b 슬롯(loss). */
function win(game: GameRecord["game"], winner: string, loser: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: winner, result: "win" },
      { player: loser, result: "loss" },
    ],
  };
}

describe("toEloLeaderboard", () => {
  it("빈 기록이면 빈 배열을 반환한다", () => {
    expect(toEloLeaderboard([])).toEqual([]);
  });

  it("단순 승패 시 승자 레이팅이 패자보다 높다", () => {
    const rows = toEloLeaderboard([win("rps", "나", "CPU")]);
    expect(rows).toHaveLength(2);
    const me = rows.find((r) => r.player === "나")!;
    const cpu = rows.find((r) => r.player === "CPU")!;
    expect(me.rating).toBeGreaterThan(cpu.rating);
    // 승자가 1위.
    expect(rows[0]!.player).toBe("나");
    expect(rows[0]!.rank).toBe(1);
  });

  it("레이팅 내림차순으로 정렬한다", () => {
    const rows = toEloLeaderboard([win("rps", "나", "CPU")]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.rating).toBeGreaterThanOrEqual(rows[i]!.rating);
    }
  });

  it("동률 레이팅은 같은 rank, 다음 순위는 건너뛴다(1,1,3)", () => {
    // 아무 경기도 하지 않은 세 플레이어를 동시에 등장시킬 수는 없으므로,
    // 서로 다른 페어가 한 번씩 비겨(draw) 동률(1000)을 만든다.
    const draw = (a: string, b: string): GameRecord => ({
      game: "rps",
      outcomes: [
        { player: a, result: "draw" },
        { player: b, result: "draw" },
      ],
    });
    // 무승부는 동일 레이팅끼리면 레이팅이 변하지 않는다 → 모두 1000.
    const rows = toEloLeaderboard([draw("p1", "p2"), draw("p2", "p3")]);
    expect(rows.every((r) => r.rating === 1000)).toBe(true);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 1]);
  });

  it("승자/패자/동률 혼합에서 1,1,3 형태 순위가 나온다", () => {
    // a가 b를 이기고, c·d는 비김 → a 최고, b 최저, c=d 동률(1000)이 가운데.
    const records: GameRecord[] = [
      win("rps", "a", "b"),
      {
        game: "rps",
        outcomes: [
          { player: "c", result: "draw" },
          { player: "d", result: "draw" },
        ],
      },
    ];
    const rows = toEloLeaderboard(records);
    // a(1016) > c=d(1000) > b(984)
    expect(rows[0]!.player).toBe("a");
    expect(rows[0]!.rank).toBe(1);
    // c, d 동률 → 같은 rank 2, 그 다음 b는 rank 4.
    const c = rows.find((r) => r.player === "c")!;
    const d = rows.find((r) => r.player === "d")!;
    expect(c.rank).toBe(2);
    expect(d.rank).toBe(2);
    expect(rows.find((r) => r.player === "b")!.rank).toBe(4);
  });

  it("2인이 아닌 record는 throw 없이 집계에서 제외한다", () => {
    const records: GameRecord[] = [
      win("rps", "나", "CPU"),
      // outcomes 1개(비정상) — computeEloRatings라면 throw하지만 헬퍼는 제외해야 한다.
      { game: "rps", outcomes: [{ player: "외톨이", result: "win" }] },
    ];
    expect(() => toEloLeaderboard(records)).not.toThrow();
    const rows = toEloLeaderboard(records);
    expect(rows.map((r) => r.player).sort()).toEqual(["CPU", "나"]);
    expect(rows.some((r) => r.player === "외톨이")).toBe(false);
  });

  it("games(판수)를 행에 노출한다", () => {
    const rows = toEloLeaderboard([win("rps", "나", "CPU"), win("rps", "나", "CPU")]);
    expect(rows.find((r) => r.player === "나")!.games).toBe(2);
  });
});
