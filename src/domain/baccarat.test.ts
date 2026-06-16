import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "./card";
import { evaluateBaccaratHand } from "./baccarat";

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
