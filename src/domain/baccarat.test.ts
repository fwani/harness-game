import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "./card";
import { evaluateBaccaratHand, settleBaccaratBet } from "./baccarat";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({ suit, rank });
const hand = (...ranks: Rank[]): Card[] => ranks.map((r) => card(r));

describe("evaluateBaccaratHand", () => {
  it("10+J = 0끗 (10·J·Q·K는 0가치)", () => {
    expect(evaluateBaccaratHand(hand("10", "J"))).toEqual({
      score: 0,
      isNatural: false,
    });
  });

  it("7+8 = 5끗 (15 mod 10)", () => {
    expect(evaluateBaccaratHand(hand("7", "8"))).toEqual({
      score: 5,
      isNatural: false,
    });
  });

  it("9+9 = 8끗 (18 mod 10) → 내추럴", () => {
    expect(evaluateBaccaratHand(hand("9", "9"))).toEqual({
      score: 8,
      isNatural: true,
    });
  });

  it("2장 합 9 → 내추럴 true", () => {
    expect(evaluateBaccaratHand(hand("4", "5")).isNatural).toBe(true);
  });

  it("2장 합 8 → 내추럴 true", () => {
    expect(evaluateBaccaratHand(hand("3", "5")).isNatural).toBe(true);
  });

  it("10·J·Q·K는 모두 0으로 계산된다", () => {
    expect(evaluateBaccaratHand(hand("10")).score).toBe(0);
    expect(evaluateBaccaratHand(hand("J")).score).toBe(0);
    expect(evaluateBaccaratHand(hand("Q")).score).toBe(0);
    expect(evaluateBaccaratHand(hand("K")).score).toBe(0);
  });

  it("A는 1로 센다 (11로 올리지 않는다)", () => {
    expect(evaluateBaccaratHand(hand("A", "A")).score).toBe(2);
    expect(evaluateBaccaratHand(hand("A", "7")).score).toBe(8);
  });

  it("3장 손패는 내추럴이 아니다 (2장만 내추럴)", () => {
    // 3+5+K(0) = 8끗 이지만 3장이므로 내추럴 false.
    const v = evaluateBaccaratHand(hand("3", "5", "K"));
    expect(v.score).toBe(8);
    expect(v.isNatural).toBe(false);
  });

  it("2장이지만 점수가 8/9가 아니면 내추럴 false", () => {
    expect(evaluateBaccaratHand(hand("7", "10")).isNatural).toBe(false);
  });

  it("suit는 무시한다", () => {
    const mixed: Card[] = [card("9", "hearts"), card("9", "clubs")];
    expect(evaluateBaccaratHand(mixed)).toEqual({ score: 8, isNatural: true });
  });

  it("빈 배열이면 throw", () => {
    expect(() => evaluateBaccaratHand([])).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const cards = hand("7", "8");
    const snapshot = JSON.parse(JSON.stringify(cards));
    evaluateBaccaratHand(cards);
    expect(cards).toEqual(snapshot);
  });
});

describe("settleBaccaratBet", () => {
  it("player 적중: 1:1 (+bet)", () => {
    expect(settleBaccaratBet("player", 100, "player")).toEqual({ net: 100, push: false });
  });

  it("banker 적중: 5% 커미션 차감, 실수령 0.95:1 (+95)", () => {
    expect(settleBaccaratBet("banker", 100, "banker")).toEqual({ net: 95, push: false });
  });

  it("banker 적중 커미션 내림 규칙: 50 → floor(47.5)=47", () => {
    expect(settleBaccaratBet("banker", 50, "banker")).toEqual({ net: 47, push: false });
  });

  it("banker 적중 커미션 내림 규칙: 10 → floor(9.5)=9", () => {
    expect(settleBaccaratBet("banker", 10, "banker")).toEqual({ net: 9, push: false });
  });

  it("tie 적중: 8:1 (+bet*8)", () => {
    expect(settleBaccaratBet("tie", 10, "tie")).toEqual({ net: 80, push: false });
  });

  it("tie 결과에서 player 베팅: push(net 0, 원금 환원)", () => {
    expect(settleBaccaratBet("player", 100, "tie")).toEqual({ net: 0, push: true });
  });

  it("tie 결과에서 banker 베팅: push(net 0, 원금 환원)", () => {
    expect(settleBaccaratBet("banker", 100, "tie")).toEqual({ net: 0, push: true });
  });

  it("미적중(player 베팅·banker 승): -bet", () => {
    expect(settleBaccaratBet("player", 100, "banker")).toEqual({ net: -100, push: false });
  });

  it("미적중(banker 베팅·player 승): -bet", () => {
    expect(settleBaccaratBet("banker", 100, "player")).toEqual({ net: -100, push: false });
  });

  it("tie 베팅인데 player 승이면 패배: -bet", () => {
    expect(settleBaccaratBet("tie", 100, "player")).toEqual({ net: -100, push: false });
  });

  it("tie 베팅인데 banker 승이면 패배: -bet", () => {
    expect(settleBaccaratBet("tie", 100, "banker")).toEqual({ net: -100, push: false });
  });

  it("bet이 0이면 throw", () => {
    expect(() => settleBaccaratBet("player", 0, "player")).toThrow();
  });

  it("bet이 음수면 throw", () => {
    expect(() => settleBaccaratBet("player", -10, "player")).toThrow();
  });

  it("bet이 비정수면 throw", () => {
    expect(() => settleBaccaratBet("player", 10.5, "player")).toThrow();
  });
});
