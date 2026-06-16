import { describe, it, expect } from "vitest";
import { standings, type GameRecordRepository } from "./gameRecordStore";
import { createGameRecord, summarize, type GameRecord } from "../domain/gameRecord";

/** 테스트용 최소 인메모리 저장소(인프라 구현과 독립적으로 application 로직만 검증). */
function makeRepo(records: GameRecord[] = []): GameRecordRepository {
  const store = [...records];
  return {
    save: (record) => {
      store.push(record);
    },
    list: () => [...store],
  };
}

describe("standings", () => {
  it("빈 저장소면 빈 배열을 반환한다", () => {
    expect(standings(makeRepo())).toEqual([]);
  });

  it("저장된 기록을 도메인 summarize와 동일하게 집계한다", () => {
    const records = [
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "loss" },
      ]),
      createGameRecord("oddEven", [
        { player: "a", result: "draw" },
        { player: "b", result: "draw" },
      ]),
    ];
    const repo = makeRepo(records);

    expect(standings(repo)).toEqual(summarize(records));
    expect(standings(repo)).toEqual([
      { player: "a", wins: 1, losses: 0, draws: 1 },
      { player: "b", wins: 0, losses: 1, draws: 1 },
    ]);
  });
});
