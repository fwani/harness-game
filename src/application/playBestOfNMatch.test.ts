import { describe, it, expect } from "vitest";
import { playBestOfNMatch } from "./playBestOfNMatch";
import type { GameRecordRepository } from "./gameRecordStore";
import type { GameRecord } from "../domain/gameRecord";
import type { RoundOutcome } from "../domain/match";

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

describe("playBestOfNMatch", () => {
  it("a가 targetWins 도달 → a:win/b:loss 레코드 1건 저장", () => {
    const repo = makeRepo();
    const result = playBestOfNMatch(
      repo,
      "rps",
      { a: "alice", b: "bob" },
      ["a", "b", "a"],
      2,
    );

    expect(result.status.decided).toBe(true);
    expect(result.status.winner).toBe("a");
    expect(result.record).not.toBeNull();
    expect(result.record!.outcomes).toEqual([
      { player: "alice", result: "win" },
      { player: "bob", result: "loss" },
    ]);
    expect(repo.list()).toHaveLength(1);
    expect(repo.list()[0]).toEqual(result.record);
  });

  it("b 승 매치 → b:win/a:loss 레코드 1건 저장", () => {
    const repo = makeRepo();
    const result = playBestOfNMatch(
      repo,
      "gomoku",
      { a: "alice", b: "bob" },
      ["b", "a", "b"],
      2,
    );

    expect(result.status.winner).toBe("b");
    expect(result.record!.outcomes).toEqual([
      { player: "alice", result: "loss" },
      { player: "bob", result: "win" },
    ]);
    expect(repo.list()).toHaveLength(1);
  });

  it("무승부 라운드가 섞여도 매치 승자만 기록한다", () => {
    const repo = makeRepo();
    const result = playBestOfNMatch(
      repo,
      "oddEven",
      { a: "alice", b: "bob" },
      ["draw", "a", "draw", "a"],
      2,
    );

    expect(result.status.winner).toBe("a");
    expect(result.status.draws).toBe(2);
    expect(result.record!.outcomes).toEqual([
      { player: "alice", result: "win" },
      { player: "bob", result: "loss" },
    ]);
    expect(repo.list()).toHaveLength(1);
  });

  it("라운드 부족으로 미결정 → 저장 없음(record: null, 저장소 불변)", () => {
    const repo = makeRepo();
    const result = playBestOfNMatch(
      repo,
      "rps",
      { a: "alice", b: "bob" },
      ["a", "b"],
      2,
    );

    expect(result.status.decided).toBe(false);
    expect(result.status.winner).toBeNull();
    expect(result.record).toBeNull();
    expect(repo.list()).toHaveLength(0);
  });

  it("이미 결정된 뒤의 잉여 라운드는 결과/기록을 바꾸지 않는다(도메인 위임)", () => {
    const repo = makeRepo();
    const result = playBestOfNMatch(
      repo,
      "rps",
      { a: "alice", b: "bob" },
      ["a", "a", "b", "b", "b"],
      2,
    );

    // a가 먼저 2승 달성 → 이후 b 라운드는 무시된다.
    expect(result.status.winner).toBe("a");
    expect(result.status.winsA).toBe(2);
    expect(result.status.winsB).toBe(0);
    expect(repo.list()).toHaveLength(1);
  });

  it("잘못된 targetWins 검증은 도메인(playMatch)에 위임해 throw 한다", () => {
    const repo = makeRepo();
    expect(() =>
      playBestOfNMatch(repo, "rps", { a: "alice", b: "bob" }, ["a"], 0),
    ).toThrow();
    expect(repo.list()).toHaveLength(0);
  });

  it("입력 배열·객체를 변형하지 않는다", () => {
    const repo = makeRepo();
    const players = { a: "alice", b: "bob" };
    const rounds: RoundOutcome[] = ["a", "a"];
    const playersSnapshot = { ...players };
    const roundsSnapshot = [...rounds];

    playBestOfNMatch(repo, "rps", players, rounds, 2);

    expect(players).toEqual(playersSnapshot);
    expect(rounds).toEqual(roundsSnapshot);
  });
});
