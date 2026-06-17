import { describe, it, expect } from "vitest";
import { selfStreakSummary, summarizeStreakForGame, SELF_PLAYER } from "./streakView";
import type { GameRecord } from "../../domain/gameRecord";

// GoStop.tsx가 화면에 그리는 <StreakPanel summary={selfStreakSummary(records, "gostop")} /> 의
// 표시 요약이 누적된 "gostop" 기록과 일치하는지 검증한다(패널은 summary 라벨을 그대로 렌더하므로
// 여기서는 요약 라벨이 곧 화면 표시값이다).

/** SELF_PLAYER("나")가 결과 result로 한 판 둔 vs CPU 기록 헬퍼(상대는 반대 결과). */
function gostopRec(result: "win" | "loss" | "draw"): GameRecord {
  const opp = result === "win" ? "loss" : result === "loss" ? "win" : "draw";
  return {
    game: "gostop",
    outcomes: [
      { player: SELF_PLAYER, result },
      { player: "CPU", result: opp },
    ],
  };
}

describe("GoStop StreakPanel 요약(selfStreakSummary(records, \"gostop\"))", () => {
  it("아직 전적이 없으면 빈 상태 라벨을 표시한다", () => {
    const s = selfStreakSummary([], "gostop");
    expect(s.currentLabel).toBe("아직 전적이 없습니다");
    expect(s.totalLabel).toBe("0승 0패 0무");
    expect(s.bestLabel).toBe("최장 연승 0 · 최장 연패 0");
  });

  it("승/패/무가 섞인 gostop 기록을 현재 연속·통산·최장으로 요약한다", () => {
    const records = [
      gostopRec("win"),
      gostopRec("win"),
      gostopRec("loss"),
      gostopRec("draw"),
    ];
    const s = selfStreakSummary(records, "gostop");
    // 마지막 판이 무 → 현재 1무 연속, 그 이전 2연승이 최장 연승으로 남는다.
    expect(s.currentLabel).toBe("1무 연속");
    expect(s.totalLabel).toBe("2승 1패 1무");
    expect(s.bestLabel).toBe("최장 연승 2 · 최장 연패 1");
  });

  it("selfStreakSummary는 summarizeStreakForGame(records, \"gostop\", SELF_PLAYER)와 동일하다", () => {
    const records = [gostopRec("win"), gostopRec("loss"), gostopRec("win")];
    expect(selfStreakSummary(records, "gostop")).toEqual(
      summarizeStreakForGame(records, "gostop", SELF_PLAYER),
    );
  });

  it("다른 게임 기록은 gostop 패널 집계에서 제외한다", () => {
    const records = [
      gostopRec("win"),
      // 같은 "나" 라벨이지만 다른 게임 → gostop 패널에 섞이면 안 된다.
      {
        game: "card" as const,
        outcomes: [
          { player: SELF_PLAYER, result: "loss" as const },
          { player: "CPU", result: "win" as const },
        ],
      },
    ];
    const s = selfStreakSummary(records, "gostop");
    expect(s.totalLabel).toBe("1승 0패 0무");
    expect(s.currentLabel).toBe("1승 연속");
  });
});
