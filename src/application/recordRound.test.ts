import { describe, it, expect } from "vitest";
import { recordRound } from "./recordRound";
import type { GameRecordRepository } from "./gameRecordStore";
import type { GameRecord } from "../domain/gameRecord";

/** 테스트용 최소 인메모리 저장소(인프라 구현과 독립적으로 application 로직만 검증). */
function makeRepo(): GameRecordRepository {
  const store: GameRecord[] = [];
  return {
    save: (record) => {
      store.push(record);
    },
    list: () => [...store],
  };
}

describe("recordRound", () => {
  it("winner 'a' -> a:win, b:loss", () => {
    const repo = makeRepo();
    const record = recordRound(repo, "rps", { a: "alice", b: "bob" }, "a");

    expect(record.outcomes).toEqual([
      { player: "alice", result: "win" },
      { player: "bob", result: "loss" },
    ]);
  });

  it("winner 'b' -> a:loss, b:win", () => {
    const repo = makeRepo();
    const record = recordRound(repo, "gomoku", { a: "alice", b: "bob" }, "b");

    expect(record.outcomes).toEqual([
      { player: "alice", result: "loss" },
      { player: "bob", result: "win" },
    ]);
  });

  it("winner 'draw' -> a:draw, b:draw", () => {
    const repo = makeRepo();
    const record = recordRound(repo, "oddEven", { a: "alice", b: "bob" }, "draw");

    expect(record.outcomes).toEqual([
      { player: "alice", result: "draw" },
      { player: "bob", result: "draw" },
    ]);
  });

  it("저장소에 레코드를 1건 추가한다", () => {
    const repo = makeRepo();
    expect(repo.list()).toHaveLength(0);

    recordRound(repo, "rps", { a: "alice", b: "bob" }, "a");

    expect(repo.list()).toHaveLength(1);
  });

  it("새로 추가된 GameId(go/janggi)로도 기록된다", () => {
    const repo = makeRepo();

    const go = recordRound(repo, "go", { a: "alice", b: "bob" }, "a");
    const janggi = recordRound(repo, "janggi", { a: "alice", b: "bob" }, "b");

    expect(go.game).toBe("go");
    expect(janggi.game).toBe("janggi");
    expect(repo.list()).toHaveLength(2);
  });

  it("잘못된 입력(동일 라벨)은 createGameRecord가 throw 한다(위임 검증)", () => {
    const repo = makeRepo();

    expect(() => recordRound(repo, "rps", { a: "same", b: "same" }, "a")).toThrow();
    // 검증 실패 시 저장되지 않는다.
    expect(repo.list()).toHaveLength(0);
  });

  it("반환 레코드는 저장된 레코드와 동등하며 입력 players를 변형하지 않는다(불변)", () => {
    const repo = makeRepo();
    const players = { a: "alice", b: "bob" };
    const before = { ...players };

    const record = recordRound(repo, "card", players, "a");

    expect(repo.list()).toHaveLength(1);
    expect(repo.list()[0]).toEqual(record);
    expect(players).toEqual(before);
  });
});
