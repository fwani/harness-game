import { describe, it, expect } from "vitest";
import { summarizeStreakForGame, selfStreakSummary, SELF_PLAYER } from "./streakView";
import type { GameRecord } from "../../domain/gameRecord";

/** player가 결과 result로 한 판 둔 2인 기록 헬퍼(상대는 반대 결과). */
function rec(
  game: GameRecord["game"],
  player: string,
  result: "win" | "loss" | "draw",
): GameRecord {
  const opp =
    result === "win" ? "loss" : result === "loss" ? "win" : "draw";
  return {
    game,
    outcomes: [
      { player, result },
      { player: "상대", result: opp },
    ],
  };
}

describe("summarizeStreakForGame", () => {
  it("참가 기록이 없으면 빈 상태 라벨을 반환한다", () => {
    const s = summarizeStreakForGame([], "rps", "나");
    expect(s.currentLabel).toBe("아직 전적이 없습니다");
    expect(s.totalLabel).toBe("0승 0패 0무");
    expect(s.bestLabel).toBe("최장 연승 0 · 최장 연패 0");
  });

  it("연승을 현재 연속·통산·최장으로 표시한다", () => {
    const records = [rec("rps", "나", "win"), rec("rps", "나", "win"), rec("rps", "나", "win")];
    const s = summarizeStreakForGame(records, "rps", "나");
    expect(s.currentLabel).toBe("3승 연속");
    expect(s.totalLabel).toBe("3승 0패 0무");
    expect(s.bestLabel).toBe("최장 연승 3 · 최장 연패 0");
  });

  it("연패를 현재 연속으로 표시한다", () => {
    const records = [rec("rps", "나", "loss"), rec("rps", "나", "loss")];
    const s = summarizeStreakForGame(records, "rps", "나");
    expect(s.currentLabel).toBe("2패 연속");
    expect(s.totalLabel).toBe("0승 2패 0무");
    expect(s.bestLabel).toBe("최장 연승 0 · 최장 연패 2");
  });

  it("최근 판이 무승부면 무 연속으로 표시한다", () => {
    const records = [rec("oddEven", "나", "win"), rec("oddEven", "나", "draw")];
    const s = summarizeStreakForGame(records, "oddEven", "나");
    expect(s.currentLabel).toBe("1무 연속");
    expect(s.totalLabel).toBe("1승 0패 1무");
    // draw는 연승/연패를 끊지만 그 이전 1연승은 최장 연승으로 남는다.
    expect(s.bestLabel).toBe("최장 연승 1 · 최장 연패 0");
  });

  it("다른 게임 기록은 집계에서 제외한다", () => {
    const records = [
      rec("rps", "나", "win"),
      rec("oddEven", "나", "loss"),
      rec("oddEven", "나", "loss"),
    ];
    const s = summarizeStreakForGame(records, "rps", "나");
    expect(s.currentLabel).toBe("1승 연속");
    expect(s.totalLabel).toBe("1승 0패 0무");
  });

  it("해당 플레이어가 참가하지 않은 기록은 제외한다", () => {
    const records = [
      {
        game: "rps" as const,
        outcomes: [
          { player: "남", result: "win" as const },
          { player: "상대", result: "loss" as const },
        ],
      },
      rec("rps", "나", "win"),
    ];
    const s = summarizeStreakForGame(records, "rps", "나");
    expect(s.totalLabel).toBe("1승 0패 0무");
    expect(s.currentLabel).toBe("1승 연속");
  });

  it("입력 배열을 변형하지 않는다", () => {
    const records = [rec("rps", "나", "win")];
    const copy = JSON.parse(JSON.stringify(records));
    summarizeStreakForGame(records, "rps", "나");
    expect(records).toEqual(copy);
  });
});

describe("selfStreakSummary / SELF_PLAYER", () => {
  it("SELF_PLAYER는 화면에서 기록하는 사람 라벨('나')과 같다", () => {
    expect(SELF_PLAYER).toBe("나");
  });

  it.each(["card", "dice", "yut"] as const)(
    "%s 게임의 '나' 집계는 summarizeStreakForGame(records, game, SELF_PLAYER)와 동일하다",
    (game) => {
      const records = [
        rec(game, SELF_PLAYER, "win"),
        rec(game, SELF_PLAYER, "win"),
        rec(game, SELF_PLAYER, "loss"),
        rec(game, SELF_PLAYER, "draw"),
      ];
      expect(selfStreakSummary(records, game)).toEqual(
        summarizeStreakForGame(records, game, SELF_PLAYER),
      );
    },
  );

  it("승/패/무가 섞인 기록을 현재 연속·통산·최장으로 요약한다", () => {
    const records = [
      rec("dice", SELF_PLAYER, "win"),
      rec("dice", SELF_PLAYER, "win"),
      rec("dice", SELF_PLAYER, "loss"),
    ];
    const s = selfStreakSummary(records, "dice");
    expect(s.currentLabel).toBe("1패 연속");
    expect(s.totalLabel).toBe("2승 1패 0무");
    expect(s.bestLabel).toBe("최장 연승 2 · 최장 연패 1");
  });

  it("다른 게임 기록·'나' 미참가 기록은 제외되어 빈 상태가 된다", () => {
    const records = [
      rec("card", SELF_PLAYER, "win"), // 다른 게임
      {
        game: "dice" as const, // 같은 게임이지만 '나' 미참가
        outcomes: [
          { player: "남", result: "win" as const },
          { player: "상대", result: "loss" as const },
        ],
      },
    ];
    const s = selfStreakSummary(records, "dice");
    expect(s.currentLabel).toBe("아직 전적이 없습니다");
    expect(s.totalLabel).toBe("0승 0패 0무");
    expect(s.bestLabel).toBe("최장 연승 0 · 최장 연패 0");
  });

  it("카드 5종이 공유하는 'card' 집계는 여러 카드 게임 결과를 한 패널로 합산한다", () => {
    // 하이카드·바카라·블랙잭·섯다·포커가 모두 game id "card"로 기록되는 상황.
    const records = [
      rec("card", SELF_PLAYER, "win"), // 하이카드
      rec("card", SELF_PLAYER, "loss"), // 바카라
      rec("card", SELF_PLAYER, "win"), // 블랙잭
      rec("card", SELF_PLAYER, "draw"), // 섯다
      rec("card", SELF_PLAYER, "win"), // 포커
    ];
    const s = selfStreakSummary(records, "card");
    expect(s.totalLabel).toBe("3승 1패 1무");
    expect(s.currentLabel).toBe("1승 연속");
  });
});
