import { describe, it, expect } from "vitest";
import { GAME_LABEL, gameLabel } from "./recordsGameLabelView";
import { buildRecordsByGameRows } from "./recordsByGameView";
import type { GameId, GameRecord } from "../../domain/gameRecord";

/** (win, loss) 2인 기록 헬퍼. */
function win(game: GameId, winner: string, loser: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: winner, result: "win" },
      { player: loser, result: "loss" },
    ],
  };
}

describe("recordsGameLabelView", () => {
  it("카드 게임 5종이 각자 고유 라벨로 매핑된다(#246 회귀 수정)", () => {
    expect(gameLabel("highcard")).toBe("하이카드");
    expect(gameLabel("blackjack")).toBe("블랙잭");
    expect(gameLabel("baccarat")).toBe("바카라");
    expect(gameLabel("sutda")).toBe("섯다");
    expect(gameLabel("poker")).toBe("포커");
  });

  it("5개 카드 게임 라벨은 서로 구분된다(하나로 합쳐지지 않음)", () => {
    const labels = ["highcard", "blackjack", "baccarat", "sutda", "poker"].map(
      (g) => gameLabel(g as GameId),
    );
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("레거시 'card' 키는 이전 기록임을 알리는 별도 라벨을 쓴다", () => {
    expect(gameLabel("card")).toBe("카드(이전 기록)");
    expect(gameLabel("card")).not.toBe(gameLabel("highcard"));
  });

  it("모든 라벨은 공백이 아닌 문자열이다", () => {
    for (const label of Object.values(GAME_LABEL)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("게임별 전적 표에서 카드 게임이 게임별로 구분·라벨링된다", () => {
    // 예전에는 5종이 모두 "card"로 기록돼 단일 "하이카드" 행으로 합쳐졌다.
    const rows = buildRecordsByGameRows(
      [
        win("highcard", "나", "CPU"),
        win("blackjack", "나", "CPU"),
        win("baccarat", "나", "CPU"),
        win("sutda", "나", "CPU"),
        win("poker", "나", "CPU"),
      ],
      gameLabel,
    );
    expect(rows.map((r) => r.gameLabel)).toEqual([
      "하이카드",
      "블랙잭",
      "바카라",
      "섯다",
      "포커",
    ]);
    expect(rows.every((r) => r.totalGames === 1)).toBe(true);
  });
});
