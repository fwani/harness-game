import { describe, it, expect } from "vitest";
import { toHeadToHeadList } from "./recordsHeadToHeadView";
import type { GameRecord } from "../../domain/gameRecord";

/** (win, loss) 2인 기록 헬퍼: winner가 win, loser가 loss. */
function win(game: GameRecord["game"], winner: string, loser: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: winner, result: "win" },
      { player: loser, result: "loss" },
    ],
  };
}

/** (draw, draw) 무승부 2인 기록 헬퍼. */
function draw(game: GameRecord["game"], a: string, b: string): GameRecord {
  return {
    game,
    outcomes: [
      { player: a, result: "draw" },
      { player: b, result: "draw" },
    ],
  };
}

describe("toHeadToHeadList", () => {
  it("빈 입력이면 빈 배열을 반환한다", () => {
    expect(toHeadToHeadList([])).toEqual([]);
  });

  it("2인이 아닌 record는 무시한다(throw 없이)", () => {
    const records: GameRecord[] = [
      // outcomes 1개(비정상).
      { game: "rps", outcomes: [{ player: "외톨이", result: "win" }] },
    ];
    expect(() => toHeadToHeadList(records)).not.toThrow();
    expect(toHeadToHeadList(records)).toEqual([]);
  });

  it("한 쌍의 여러 판을 한 행으로 합산한다", () => {
    const rows = toHeadToHeadList([
      win("rps", "나", "CPU"),
      win("rps", "나", "CPU"),
      win("rps", "CPU", "나"),
      draw("rps", "나", "CPU"),
    ]);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    // 정규화: "CPU" < "나" 이므로 playerA="CPU", playerB="나".
    expect(row.playerA).toBe("CPU");
    expect(row.playerB).toBe("나");
    expect(row.winsA).toBe(1); // CPU 1승
    expect(row.winsB).toBe(2); // 나 2승
    expect(row.draws).toBe(1);
    expect(row.games).toBe(4);
  });

  it("{A,B}와 {B,A} 기록을 중복 없이 한 행으로 합친다", () => {
    const rows = toHeadToHeadList([
      win("rps", "a", "b"), // outcomes 순서 [a, b]
      win("rps", "b", "a"), // outcomes 순서 [b, a]
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.playerA).toBe("a");
    expect(rows[0]!.playerB).toBe("b");
    expect(rows[0]!.games).toBe(2);
  });

  it("games가 0인 쌍은 제외한다(맞붙은 판이 없는 경우)", () => {
    // a-c는 직접 맞붙은 적이 없다. a-b, b-c만 행으로 남아야 한다.
    const rows = toHeadToHeadList([win("rps", "a", "b"), win("rps", "b", "c")]);
    const labels = rows.map((r) => `${r.playerA}-${r.playerB}`);
    expect(labels).toContain("a-b");
    expect(labels).toContain("b-c");
    expect(labels).not.toContain("a-c");
  });

  it("정렬: games 내림차순 → playerA 오름차순 → playerB 오름차순", () => {
    const records: GameRecord[] = [
      // a-b: 3판
      win("rps", "a", "b"),
      win("rps", "a", "b"),
      win("rps", "b", "a"),
      // c-d: 1판
      win("rps", "c", "d"),
      // a-c: 1판
      win("rps", "a", "c"),
    ];
    const rows = toHeadToHeadList(records);
    expect(rows.map((r) => `${r.playerA}-${r.playerB}`)).toEqual([
      "a-b", // games 3
      "a-c", // games 1, playerA "a"
      "c-d", // games 1, playerA "c"
    ]);
  });

  it("서로 다른 게임의 맞대결도 각각 한 쌍으로 합산된다", () => {
    // 같은 두 사람이 다른 게임에서 맞붙어도 head-to-head는 게임 구분 없이 합산한다.
    const rows = toHeadToHeadList([win("rps", "나", "CPU"), win("gomoku", "CPU", "나")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.games).toBe(2);
    expect(rows[0]!.winsA).toBe(1); // CPU 1승
    expect(rows[0]!.winsB).toBe(1); // 나 1승
  });

  it("입력 배열·원소를 변형하지 않는다", () => {
    const records: GameRecord[] = [win("rps", "나", "CPU")];
    const snapshot = JSON.stringify(records);
    toHeadToHeadList(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });
});
