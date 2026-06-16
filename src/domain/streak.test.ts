import { describe, it, expect } from "vitest";
import { playerStreak } from "./streak";
import type { GameRecord } from "./gameRecord";

function rec(
  game: GameRecord["game"],
  a: { player: string; result: GameRecord["outcomes"][number]["result"] },
  b: { player: string; result: GameRecord["outcomes"][number]["result"] },
): GameRecord {
  return { game, outcomes: [a, b] };
}

describe("playerStreak", () => {
  it("빈 records → none/0", () => {
    expect(playerStreak([], "a")).toEqual({
      player: "a",
      currentType: "none",
      currentLength: 0,
      longestWin: 0,
      longestLoss: 0,
    });
  });

  it("player가 한 번도 참가하지 않은 records → none/0", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "x", result: "win" }, { player: "y", result: "loss" }),
      rec("rps", { player: "x", result: "loss" }, { player: "y", result: "win" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "none",
      currentLength: 0,
      longestWin: 0,
      longestLoss: 0,
    });
  });

  it("연승(win,win,win) → currentType win, currentLength 3, longestWin 3", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "win",
      currentLength: 3,
      longestWin: 3,
      longestLoss: 0,
    });
  });

  it("중간에 패가 섞임(win,win,loss,win)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "loss" }, { player: "b", result: "win" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "win",
      currentLength: 1,
      longestWin: 2,
      longestLoss: 1,
    });
  });

  it("draw가 연승/연패를 끊는다(win,draw,win → longestWin 1)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("oddEven", { player: "a", result: "draw" }, { player: "b", result: "draw" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "win",
      currentLength: 1,
      longestWin: 1,
      longestLoss: 0,
    });
  });

  it("가장 최근이 draw면 currentType draw, currentLength는 연속 draw 수", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("oddEven", { player: "a", result: "draw" }, { player: "b", result: "draw" }),
      rec("oddEven", { player: "a", result: "draw" }, { player: "b", result: "draw" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "draw",
      currentLength: 2,
      longestWin: 1,
      longestLoss: 0,
    });
  });

  it("연패도 추적한다(loss,loss → currentType loss, longestLoss 2)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "loss" }, { player: "b", result: "win" }),
      rec("rps", { player: "a", result: "loss" }, { player: "b", result: "win" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "loss",
      currentLength: 2,
      longestWin: 0,
      longestLoss: 2,
    });
  });

  it("player가 빠진 record는 건너뛰고 연속을 유지한다", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      // a가 빠진 판 — 연속이 끊기지 않아야 한다.
      rec("rps", { player: "x", result: "win" }, { player: "y", result: "loss" }),
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    expect(playerStreak(records, "a")).toEqual({
      player: "a",
      currentType: "win",
      currentLength: 2,
      longestWin: 2,
      longestLoss: 0,
    });
  });

  it("호출 후 입력 records가 변형되지 않는다(불변)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "loss" }, { player: "b", result: "win" }),
    ];
    const snapshot = JSON.parse(JSON.stringify(records));
    playerStreak(records, "a");
    expect(records).toEqual(snapshot);
  });

  it("공백 player → throw", () => {
    expect(() => playerStreak([], "")).toThrow();
    expect(() => playerStreak([], "   ")).toThrow();
  });
});
