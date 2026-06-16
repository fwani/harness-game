import { describe, it, expect } from "vitest";
import { InMemoryGameRecordRepository } from "./inMemoryGameRecordRepository";
import { standings } from "../application/gameRecordStore";
import { createGameRecord } from "../domain/gameRecord";

describe("InMemoryGameRecordRepository", () => {
  it("save 후 list가 저장 순서대로 반환한다", () => {
    const repo = new InMemoryGameRecordRepository();
    const r1 = createGameRecord("rps", [
      { player: "a", result: "win" },
      { player: "b", result: "loss" },
    ]);
    const r2 = createGameRecord("oddEven", [
      { player: "a", result: "draw" },
      { player: "b", result: "draw" },
    ]);

    repo.save(r1);
    repo.save(r2);

    expect(repo.list()).toEqual([r1, r2]);
  });

  it("빈 저장소의 list는 빈 배열", () => {
    expect(new InMemoryGameRecordRepository().list()).toEqual([]);
  });

  it("list() 반환값을 변경해도 내부 상태에 영향이 없다(불변성)", () => {
    const repo = new InMemoryGameRecordRepository();
    const r1 = createGameRecord("rps", [
      { player: "a", result: "win" },
      { player: "b", result: "loss" },
    ]);
    repo.save(r1);

    const first = repo.list();
    first.push(
      createGameRecord("card", [
        { player: "a", result: "draw" },
        { player: "b", result: "draw" },
      ]),
    );
    first.length = 0;

    expect(repo.list()).toEqual([r1]);
  });

  it("standings와 연동해 유효 기록을 집계한다", () => {
    const repo = new InMemoryGameRecordRepository();
    repo.save(
      createGameRecord("rps", [
        { player: "a", result: "win" },
        { player: "b", result: "loss" },
      ]),
    );
    repo.save(
      createGameRecord("oddEven", [
        { player: "a", result: "draw" },
        { player: "b", result: "draw" },
      ]),
    );

    expect(standings(repo)).toEqual([
      { player: "a", wins: 1, losses: 0, draws: 1 },
      { player: "b", wins: 0, losses: 1, draws: 1 },
    ]);
  });
});
