import { describe, it, expect } from "vitest";
import { toStreakRankingRows } from "./recordsStreakRankingView";
import { playerStreak } from "../../domain/streak";
import type { GameRecord } from "../../domain/gameRecord";

/** (a win, b loss) 한 판 기록 헬퍼. */
function rec(winner: string, loser: string): GameRecord {
  return {
    game: "rps",
    outcomes: [
      { player: winner, result: "win" },
      { player: loser, result: "loss" },
    ],
  };
}

/** 무승부 한 판 기록 헬퍼. */
function drawRec(a: string, b: string): GameRecord {
  return {
    game: "rps",
    outcomes: [
      { player: a, result: "draw" },
      { player: b, result: "draw" },
    ],
  };
}

describe("toStreakRankingRows", () => {
  it("빈 입력이면 빈 배열을 반환한다", () => {
    expect(toStreakRankingRows([])).toEqual([]);
  });

  it("등장하는 모든 플레이어에 대해 domain/playerStreak 행을 만든다", () => {
    const records = [rec("a", "b"), rec("a", "c")];
    const rows = toStreakRankingRows(records);
    const players = rows.map((r) => r.player).sort();
    expect(players).toEqual(["a", "b", "c"]);
    // 각 행은 domain/playerStreak 결과 + rank.
    for (const row of rows) {
      const { rank, ...streak } = row;
      expect(streak).toEqual(playerStreak(records, row.player));
      expect(typeof rank).toBe("number");
    }
  });

  it("longestWin 내림차순으로 정렬한다", () => {
    // a: 3연승, c: 2연승, b/d: 0연승.
    const records = [
      rec("a", "b"),
      rec("a", "b"),
      rec("a", "b"),
      rec("c", "d"),
      rec("c", "d"),
    ];
    const rows = toStreakRankingRows(records);
    expect(rows[0]!.player).toBe("a");
    expect(rows[0]!.longestWin).toBe(3);
    expect(rows[1]!.player).toBe("c");
    expect(rows[1]!.longestWin).toBe(2);
  });

  it("longestWin 동점이면 현재 연승 중인(currentType=win) currentLength 내림차순", () => {
    // a, c 모두 역대 최장 연승 2. a는 현재 2연승 중, c는 마지막 판이 패라 현재 연승 아님.
    const records = [
      rec("a", "x"),
      rec("a", "x"), // a 현재 2연승
      rec("c", "y"),
      rec("c", "y"),
      rec("y", "c"), // c 최장 연승 2지만 현재는 1연패
    ];
    const rows = toStreakRankingRows(records);
    const aIdx = rows.findIndex((r) => r.player === "a");
    const cIdx = rows.findIndex((r) => r.player === "c");
    expect(rows[aIdx]!.longestWin).toBe(2);
    expect(rows[cIdx]!.longestWin).toBe(2);
    // 둘 다 최장 2지만 현재 연승 중인 a가 앞선다.
    expect(aIdx).toBeLessThan(cIdx);
  });

  it("정렬키가 같으면 같은 rank를 공유하고 라벨 사전순으로 정렬한다", () => {
    // p1: 2연승(현재 2연승), p2·p3: 1연승(현재 연승 아님, 둘 다 동일 키) → p2,p3 공동 rank, 라벨순.
    const records = [
      rec("p1", "z"),
      rec("p1", "z"),
      rec("p2", "z"),
      rec("z", "p2"), // p2: 최장1, 현재 연승 아님
      rec("p3", "z"),
      rec("z", "p3"), // p3: 최장1, 현재 연승 아님
    ];
    const rows = toStreakRankingRows(records);
    const rankOf = (p: string) => rows.find((r) => r.player === p)!.rank;
    expect(rankOf("p1")).toBe(1);
    expect(rankOf("p2")).toBe(rankOf("p3")); // 동점 공유
    // 동점인 p2, p3는 라벨 사전순으로 인접 배치.
    const p2Idx = rows.findIndex((r) => r.player === "p2");
    const p3Idx = rows.findIndex((r) => r.player === "p3");
    expect(p2Idx).toBeLessThan(p3Idx);
  });

  it("미참가 record가 연속을 끊지 않는다(playerStreak 위임 동작)", () => {
    // a는 1·2번째 판에 참가(2연승), 3번째 판은 b·c만 — a의 연승은 끊기지 않는다.
    const records = [rec("a", "b"), rec("a", "b"), rec("b", "c")];
    const rows = toStreakRankingRows(records);
    const a = rows.find((r) => r.player === "a")!;
    expect(a.longestWin).toBe(2);
    expect(a.currentType).toBe("win");
    expect(a.currentLength).toBe(2);
  });

  it("무승부만 있어도 안전하게 처리한다(longestWin 0)", () => {
    const records = [drawRec("a", "b")];
    const rows = toStreakRankingRows(records);
    for (const row of rows) {
      expect(row.longestWin).toBe(0);
      expect(row.currentType).toBe("draw");
    }
  });

  it("입력 배열과 요소를 변형하지 않는다", () => {
    const records = [rec("a", "b"), rec("b", "a")];
    const snapshot = JSON.parse(JSON.stringify(records));
    toStreakRankingRows(records);
    expect(records).toEqual(snapshot);
  });
});
