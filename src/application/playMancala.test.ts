import { describe, it, expect } from "vitest";
import { createMancalaBoard, type MancalaBoard } from "../domain/mancala";
import { chooseRandomMancalaMove, playMancalaTurn } from "./playMancala";
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

/** 6칸 기준 임의 보드 구성 헬퍼. */
function board(
  p1: number[],
  p2: number[],
  store1: number,
  store2: number,
): MancalaBoard {
  return {
    pitsPerSide: 6,
    pits: { 1: [...p1], 2: [...p2] },
    stores: { 1: store1, 2: store2 },
  };
}

describe("chooseRandomMancalaMove", () => {
  it("legalMancalaMoves 순서대로 인덱스를 균등 선택한다", () => {
    const b = board([0, 3, 0, 5, 0, 0], [4, 4, 4, 4, 4, 4], 0, 0);
    // 둘 수 있는 구덩이: 1, 3
    expect(chooseRandomMancalaMove(b, 1, fixedRng(0))).toBe(1);
    expect(chooseRandomMancalaMove(b, 1, fixedRng(1))).toBe(3);
  });

  it("빈 구덩이는 후보에서 제외한다(도메인 위임)", () => {
    const b = createMancalaBoard();
    // 표준 보드: 모든 구덩이가 후보(0..5). 첫 후보 0, 마지막 후보 5.
    expect(chooseRandomMancalaMove(b, 1, fixedRng(0))).toBe(0);
    expect(chooseRandomMancalaMove(b, 1, fixedRng(5))).toBe(5);
  });

  it("둘 곳이 하나도 없으면 null을 반환한다", () => {
    // 한쪽이 전부 비면 게임 종료 → 합법 수 없음.
    const b = board([0, 0, 0, 0, 0, 0], [4, 4, 4, 4, 4, 4], 10, 10);
    expect(chooseRandomMancalaMove(b, 1, fixedRng(0))).toBeNull();
    expect(chooseRandomMancalaMove(b, 2, fixedRng(0))).toBeNull();
  });

  it("범위 밖 인덱스를 주면 throw 한다", () => {
    const b = board([0, 3, 0, 5, 0, 0], [4, 4, 4, 4, 4, 4], 0, 0);
    // 후보 2개인데 인덱스 2 → 범위 밖.
    expect(() => chooseRandomMancalaMove(b, 1, fixedRng(2))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다", () => {
    const b = createMancalaBoard();
    const snapshot = JSON.stringify(b);
    chooseRandomMancalaMove(b, 1, fixedRng(0));
    expect(JSON.stringify(b)).toBe(snapshot);
  });
});

describe("playMancalaTurn", () => {
  it("마지막 씨앗이 자기 곳간에 떨어지면 again=true·nextToMove=같은 player", () => {
    const b = createMancalaBoard(); // 표준 4씨앗
    // player 1, pit 2: 4씨앗 → 곳간(인덱스 i+seeds=6=자기 곳간)에서 멈춤.
    const r = playMancalaTurn(b, 1, 2);
    expect(r.again).toBe(true);
    expect(r.nextToMove).toBe(1);
    expect(r.over).toBe(false);
    expect(r.winner).toBeNull();
    expect(r.board.stores[1]).toBe(1);
  });

  it("일반 수는 again=false·nextToMove=상대", () => {
    const b = createMancalaBoard();
    // player 1, pit 0: 4씨앗 → 자기 구덩이 4에서 멈춤(곳간 아님).
    const r = playMancalaTurn(b, 1, 0);
    expect(r.again).toBe(false);
    expect(r.nextToMove).toBe(2);
    expect(r.over).toBe(false);
    expect(r.winner).toBeNull();
  });

  it("종료 수에서 winner 세팅·over=true (again=false 경로)", () => {
    // player 1 side에 마지막 2씨앗만. 둔 뒤 side1 전부 비어 종료·쓸어담기.
    const b = board([0, 0, 0, 0, 0, 2], [1, 0, 0, 0, 0, 0], 21, 18);
    const r = playMancalaTurn(b, 1, 5);
    expect(r.over).toBe(true);
    expect(r.again).toBe(false);
    // 종료 시 nextToMove는 현재 player 유지(의미 없음).
    expect(r.nextToMove).toBe(1);
    // store1 = 21 + 1(곳간 통과) = 22. store2 = 18 + 1(상대 구덩이 0) + 1(쓸어담기) = 20.
    expect(r.board.stores[1]).toBe(22);
    expect(r.board.stores[2]).toBe(20);
    expect(r.winner).toBe(1);
  });

  it("종료 수에서 again=true 경로도 over로 보고한다", () => {
    // player 1 side에 마지막 1씨앗 → 곳간 착지(again) + side1 비어 종료.
    const b = board([0, 0, 0, 0, 0, 1], [3, 0, 0, 0, 0, 0], 20, 20);
    const r = playMancalaTurn(b, 1, 5);
    expect(r.over).toBe(true);
    expect(r.again).toBe(true);
    expect(r.nextToMove).toBe(1);
    // store1 = 21, store2 = 20 + 3(쓸어담기) = 23 → winner 2.
    expect(r.winner).toBe(2);
  });

  it("종료 시 동점이면 winner=null(무승부)", () => {
    // 둔 뒤 양쪽 곳간이 같아지도록 구성.
    const b = board([0, 0, 0, 0, 0, 2], [1, 0, 0, 0, 0, 0], 11, 10);
    const r = playMancalaTurn(b, 1, 5);
    expect(r.over).toBe(true);
    // store1 = 11 + 1 = 12, store2 = 10 + 1 + 1 = 12 → 동점.
    expect(r.board.stores[1]).toBe(12);
    expect(r.board.stores[2]).toBe(12);
    expect(r.winner).toBeNull();
  });

  it("진행 중에는 곳간 차이가 있어도 winner=null", () => {
    // 표준 첫 수: 진행 중이므로 winner는 null이어야 한다(종료 시에만 판정).
    const b = createMancalaBoard();
    const r = playMancalaTurn(b, 1, 0);
    expect(r.over).toBe(false);
    expect(r.winner).toBeNull();
  });

  it("불법 수(빈 구덩이/범위 밖)는 도메인이 throw 한다", () => {
    const b = board([0, 1, 0, 0, 0, 0], [4, 4, 4, 4, 4, 4], 0, 0);
    expect(() => playMancalaTurn(b, 1, 0)).toThrow(); // 빈 구덩이
    expect(() => playMancalaTurn(b, 1, 6)).toThrow(); // 범위 밖
  });

  it("입력 board를 변형하지 않는다", () => {
    const b = createMancalaBoard();
    const snapshot = JSON.stringify(b);
    const r = playMancalaTurn(b, 1, 2);
    expect(JSON.stringify(b)).toBe(snapshot);
    // 반환 보드는 입력과 다른 인스턴스.
    expect(r.board).not.toBe(b);
  });
});
