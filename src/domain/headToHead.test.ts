import { describe, it, expect } from "vitest";
import { headToHead } from "./headToHead";
import type { GameRecord } from "./gameRecord";

function rec(
  game: GameRecord["game"],
  a: { player: string; result: GameRecord["outcomes"][number]["result"] },
  b: { player: string; result: GameRecord["outcomes"][number]["result"] },
): GameRecord {
  return { game, outcomes: [a, b] };
}

describe("headToHead", () => {
  it("빈 records → 모든 카운트 0", () => {
    expect(headToHead([], "a", "b")).toEqual({
      playerA: "a",
      playerB: "b",
      winsA: 0,
      winsB: 0,
      draws: 0,
      games: 0,
    });
  });

  it("A 승 / B 승 / 무승부를 각각 집계한다", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("rps", { player: "a", result: "loss" }, { player: "b", result: "win" }),
      rec("oddEven", { player: "a", result: "draw" }, { player: "b", result: "draw" }),
    ];
    const h2h = headToHead(records, "a", "b");
    expect(h2h.winsA).toBe(1);
    expect(h2h.winsB).toBe(1);
    expect(h2h.draws).toBe(1);
    expect(h2h.games).toBe(3);
  });

  it("outcomes 순서와 무관하게 player 라벨로 집계한다", () => {
    const records: GameRecord[] = [
      // b가 먼저 등장하지만 a가 이김
      rec("rps", { player: "b", result: "loss" }, { player: "a", result: "win" }),
      // b가 먼저 등장하고 b가 이김
      rec("rps", { player: "b", result: "win" }, { player: "a", result: "loss" }),
    ];
    const h2h = headToHead(records, "a", "b");
    expect(h2h.winsA).toBe(1);
    expect(h2h.winsB).toBe(1);
    expect(h2h.draws).toBe(0);
  });

  it("입력 인자 순서를 바꿔도(기준 A/B 스왑) 일관되게 집계한다", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    const h2h = headToHead(records, "b", "a");
    expect(h2h.playerA).toBe("b");
    expect(h2h.playerB).toBe("a");
    expect(h2h.winsA).toBe(0); // b는 졌다
    expect(h2h.winsB).toBe(1); // a는 이겼다
  });

  it("두 사람이 모두 등장하는 판만 집계한다(한 명만/제3자 낀 기록 무시)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      // a vs c — b가 없으므로 무시
      rec("rps", { player: "a", result: "win" }, { player: "c", result: "loss" }),
      // c vs b — a가 없으므로 무시
      rec("rps", { player: "c", result: "win" }, { player: "b", result: "loss" }),
    ];
    const h2h = headToHead(records, "a", "b");
    expect(h2h.games).toBe(1);
    expect(h2h.winsA).toBe(1);
  });

  it("games === winsA + winsB + draws 항상 성립", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
      rec("oddEven", { player: "a", result: "draw" }, { player: "b", result: "draw" }),
      rec("gomoku", { player: "a", result: "loss" }, { player: "b", result: "win" }),
    ];
    const h2h = headToHead(records, "a", "b");
    expect(h2h.games).toBe(h2h.winsA + h2h.winsB + h2h.draws);
  });

  it("playerA === playerB → throw", () => {
    expect(() => headToHead([], "a", "a")).toThrow();
  });

  it("빈/공백 라벨 → throw", () => {
    expect(() => headToHead([], "", "b")).toThrow();
    expect(() => headToHead([], "a", "   ")).toThrow();
  });

  it("입력 records 배열·원소를 변형하지 않는다(불변)", () => {
    const records: GameRecord[] = [
      rec("rps", { player: "a", result: "win" }, { player: "b", result: "loss" }),
    ];
    const snapshot = JSON.parse(JSON.stringify(records));
    const len = records.length;
    headToHead(records, "a", "b");
    expect(records.length).toBe(len);
    expect(records).toEqual(snapshot);
  });
});
