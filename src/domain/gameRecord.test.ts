import { describe, it, expect } from "vitest";
import {
  createGameRecord,
  summarize,
  type GameRecord,
  type PlayerOutcome,
} from "./gameRecord";

describe("createGameRecord", () => {
  it("승/패 한 판 기록을 만든다", () => {
    const record = createGameRecord("rps", [
      { player: "a", result: "win" },
      { player: "b", result: "loss" },
    ]);
    expect(record).toEqual({
      game: "rps",
      outcomes: [
        { player: "a", result: "win" },
        { player: "b", result: "loss" },
      ],
    });
  });

  it("무승부(둘 다 draw) 한 판 기록을 만든다", () => {
    const record = createGameRecord("oddEven", [
      { player: "a", result: "draw" },
      { player: "b", result: "draw" },
    ]);
    expect(record.outcomes.every((o) => o.result === "draw")).toBe(true);
  });

  it("입력 outcomes 배열을 변형하지 않고 복제해 보관한다(불변)", () => {
    const input: PlayerOutcome[] = [
      { player: "a", result: "win" },
      { player: "b", result: "loss" },
    ];
    const record = createGameRecord("gomoku", input);
    expect(record.outcomes).not.toBe(input);
    expect(record.outcomes[0]).not.toBe(input[0]);
    // 반환 객체를 바꿔도 입력은 그대로다.
    record.outcomes[0]!.result = "loss";
    expect(input[0]!.result).toBe("win");
  });

  it("outcomes가 2개가 아니면 throw한다", () => {
    expect(() =>
      createGameRecord("rps", [{ player: "a", result: "win" }]),
    ).toThrow();
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "loss" },
        { player: "c", result: "loss" },
      ]),
    ).toThrow();
  });

  it("빈/공백 플레이어 라벨이면 throw한다", () => {
    expect(() =>
      createGameRecord("rps", [
        { player: "", result: "win" },
        { player: "b", result: "loss" },
      ]),
    ).toThrow();
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "   ", result: "loss" },
      ]),
    ).toThrow();
  });

  it("두 플레이어가 같은 라벨이면 throw한다", () => {
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "a", result: "loss" },
      ]),
    ).toThrow();
  });

  it("승자 수 모순(win/win, win/draw 등)이면 throw한다", () => {
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "win" },
      ]),
    ).toThrow();
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "draw" },
      ]),
    ).toThrow();
    expect(() =>
      createGameRecord("rps", [
        { player: "a", result: "loss" },
        { player: "b", result: "loss" },
      ]),
    ).toThrow();
  });
});

describe("summarize", () => {
  it("여러 판을 플레이어별 wins/losses/draws로 집계한다", () => {
    const records: GameRecord[] = [
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "loss" },
      ]),
      createGameRecord("gomoku", [
        { player: "a", result: "loss" },
        { player: "b", result: "win" },
      ]),
      createGameRecord("card", [
        { player: "a", result: "draw" },
        { player: "b", result: "draw" },
      ]),
    ];
    const stats = summarize(records);
    expect(stats).toEqual([
      { player: "a", wins: 1, losses: 1, draws: 1 },
      { player: "b", wins: 1, losses: 1, draws: 1 },
    ]);
  });

  it("처음 등장한 순서대로 반환한다(결정적)", () => {
    const records: GameRecord[] = [
      createGameRecord("rps", [
        { player: "b", result: "win" },
        { player: "a", result: "loss" },
      ]),
    ];
    const stats = summarize(records);
    expect(stats.map((s) => s.player)).toEqual(["b", "a"]);
  });

  it("빈 기록 목록이면 빈 배열을 반환한다", () => {
    expect(summarize([])).toEqual([]);
  });
});
