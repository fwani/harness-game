import { describe, it, expect } from "vitest";
import { createNimPiles, legalNimMoves, type NimPiles } from "../domain/nim";
import { chooseRandomNimMove, playNimTurn } from "./playNim";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 돌려주는 결정적 RandomSource 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("chooseRandomNimMove", () => {
  it("legalNimMoves 순서대로 인덱스를 균등 선택한다", () => {
    const piles: NimPiles = [1, 2];
    // 합법 수 순서: {0,1}, {1,1}, {1,2}
    expect(chooseRandomNimMove(piles, fixedRng(0))).toEqual({ pile: 0, count: 1 });
    expect(chooseRandomNimMove(piles, fixedRng(1))).toEqual({ pile: 1, count: 1 });
    expect(chooseRandomNimMove(piles, fixedRng(2))).toEqual({ pile: 1, count: 2 });
  });

  it("기본 배치([3,5,7])에서 첫·마지막 후보를 선택할 수 있다", () => {
    const piles = createNimPiles();
    const moves = legalNimMoves(piles);
    expect(chooseRandomNimMove(piles, fixedRng(0))).toEqual(moves[0]);
    expect(chooseRandomNimMove(piles, fixedRng(moves.length - 1))).toEqual(
      moves[moves.length - 1],
    );
  });

  it("둘 곳이 하나도 없으면(모든 더미 0) null을 반환한다", () => {
    expect(chooseRandomNimMove([0, 0, 0], fixedRng(0))).toBeNull();
    expect(chooseRandomNimMove([], fixedRng(0))).toBeNull();
  });

  it("범위 밖 인덱스를 주면 throw 한다", () => {
    const piles: NimPiles = [1, 1];
    // 후보 2개인데 인덱스 2 → 범위 밖.
    expect(() => chooseRandomNimMove(piles, fixedRng(2))).toThrow(/out-of-range/);
  });

  it("입력 piles를 변형하지 않는다", () => {
    const piles: NimPiles = [3, 5, 7];
    const snapshot = JSON.stringify(piles);
    chooseRandomNimMove(piles, fixedRng(0));
    expect(JSON.stringify(piles)).toBe(snapshot);
  });
});

describe("playNimTurn", () => {
  it("진행 중인 한 수: 더미 갱신·턴 전환·winner null·over false", () => {
    const r = playNimTurn([3, 5, 7], 1, { pile: 2, count: 3 });
    expect(r.piles).toEqual([3, 5, 4]);
    expect(r.over).toBe(false);
    expect(r.winner).toBeNull();
    expect(r.next).toBe(2);
  });

  it("마지막 돌을 가져가면 winner=둔 player·over true", () => {
    // 마지막 남은 더미 [0,0,2]에서 2개를 다 가져가 종료.
    const r = playNimTurn([0, 0, 2], 2, { pile: 2, count: 2 });
    expect(r.piles).toEqual([0, 0, 0]);
    expect(r.over).toBe(true);
    expect(r.winner).toBe(2);
    // next는 상대(의미 없음)지만 상대로 전환된다.
    expect(r.next).toBe(1);
  });

  it("player 1이 마지막 돌을 가져가면 winner=1", () => {
    const r = playNimTurn([1], 1, { pile: 0, count: 1 });
    expect(r.over).toBe(true);
    expect(r.winner).toBe(1);
  });

  it("불법 수(범위 밖 pile/과다 count)는 도메인이 throw 전파", () => {
    expect(() => playNimTurn([3, 5, 7], 1, { pile: 5, count: 1 })).toThrow();
    expect(() => playNimTurn([3, 5, 7], 1, { pile: 0, count: 4 })).toThrow();
    expect(() => playNimTurn([3, 5, 7], 1, { pile: 0, count: 0 })).toThrow();
  });

  it("입력 piles를 변형하지 않는다", () => {
    const piles: NimPiles = [3, 5, 7];
    const snapshot = JSON.stringify(piles);
    const r = playNimTurn(piles, 1, { pile: 0, count: 2 });
    expect(JSON.stringify(piles)).toBe(snapshot);
    expect(r.piles).not.toBe(piles);
  });
});
