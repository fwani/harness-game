import { describe, it, expect } from "vitest";
import { buildRecordsByGameRows } from "./recordsByGameView";
import type { GameId, GameRecord } from "../../domain/gameRecord";

/** (win, loss) 2인 기록 헬퍼: winner가 win, loser가 loss. */
function win(game: GameId, winner: string, loser: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: winner, result: "win" },
      { player: loser, result: "loss" },
    ],
  };
}

/** (draw, draw) 무승부 2인 기록 헬퍼. */
function draw(game: GameId, a: string, b: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: a, result: "draw" },
      { player: b, result: "draw" },
    ],
  };
}

const LABEL: Record<string, string> = {
  rps: "가위바위보",
  gomoku: "오목",
  dice: "주사위",
};
const label = (game: GameId): string => LABEL[game] ?? game;

describe("buildRecordsByGameRows", () => {
  it("빈 입력이면 빈 배열을 반환한다", () => {
    expect(buildRecordsByGameRows([], label)).toEqual([]);
  });

  it("게임 라벨·총 판수·플레이어별 승패무를 행으로 만든다", () => {
    const rows = buildRecordsByGameRows(
      [win("gomoku", "나", "CPU"), win("gomoku", "CPU", "나"), draw("gomoku", "나", "CPU")],
      label,
    );
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.game).toBe("gomoku");
    expect(row.gameLabel).toBe("오목");
    expect(row.totalGames).toBe(3);
    expect(row.players).toEqual([
      { player: "나", wins: 1, losses: 1, draws: 1 },
      { player: "CPU", wins: 1, losses: 1, draws: 1 },
    ]);
  });

  it("게임별로 분리된 행을 입력 등장 순서대로 만든다", () => {
    const rows = buildRecordsByGameRows(
      [win("dice", "나", "CPU"), win("rps", "나", "CPU")],
      label,
    );
    expect(rows.map((r) => r.game)).toEqual(["dice", "rps"]);
    expect(rows.map((r) => r.gameLabel)).toEqual(["주사위", "가위바위보"]);
    expect(rows.every((r) => r.totalGames === 1)).toBe(true);
  });

  it("라벨 맵에 없는 게임 id는 fallback 라벨을 쓴다", () => {
    const rows = buildRecordsByGameRows([win("yut", "나", "CPU")], label);
    expect(rows[0]!.gameLabel).toBe("yut");
  });

  it("입력 배열·원소를 변형하지 않는다", () => {
    const records: GameRecord[] = [win("rps", "나", "CPU")];
    const snapshot = JSON.stringify(records);
    buildRecordsByGameRows(records, label);
    expect(JSON.stringify(records)).toBe(snapshot);
  });
});
