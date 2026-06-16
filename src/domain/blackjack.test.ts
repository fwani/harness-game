import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "./card";
import { evaluateBlackjackHand } from "./blackjack";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({ suit, rank });
const hand = (...ranks: Rank[]): Card[] => ranks.map((r) => card(r));

describe("evaluateBlackjackHand", () => {
  it("A+K = 21 내추럴 블랙잭(isBlackjack=true, total=21, isSoft=true)", () => {
    const v = evaluateBlackjackHand(hand("A", "K"));
    expect(v).toEqual({
      total: 21,
      isSoft: true,
      isBust: false,
      isBlackjack: true,
    });
  });

  it("A,5,K(3장)는 21이지만 2장이 아니므로 isBlackjack=false", () => {
    const v = evaluateBlackjackHand(hand("A", "5", "K"));
    // 최소 합 1+5+10=16, A를 11로 올리면 26>21이라 불가 → total=16(hard)
    expect(v.total).toBe(16);
    expect(v.isSoft).toBe(false);
    expect(v.isBust).toBe(false);
    expect(v.isBlackjack).toBe(false);
  });

  it("소프트 핸드: A,6 → 17 soft", () => {
    const v = evaluateBlackjackHand(hand("A", "6"));
    expect(v.total).toBe(17);
    expect(v.isSoft).toBe(true);
    expect(v.isBust).toBe(false);
    expect(v.isBlackjack).toBe(false);
  });

  it("하드 핸드: 10,7 → 17 hard", () => {
    const v = evaluateBlackjackHand(hand("10", "7"));
    expect(v.total).toBe(17);
    expect(v.isSoft).toBe(false);
    expect(v.isBust).toBe(false);
    expect(v.isBlackjack).toBe(false);
  });

  it("에이스 다수: A,A → 12 (한 장만 11)", () => {
    const v = evaluateBlackjackHand(hand("A", "A"));
    // 11 + 1 = 12, soft. 2장이지만 21이 아니라 블랙잭 아님.
    expect(v.total).toBe(12);
    expect(v.isSoft).toBe(true);
    expect(v.isBust).toBe(false);
    expect(v.isBlackjack).toBe(false);
  });

  it("에이스 다수: A,A,9 → 21 (한 장만 11)", () => {
    const v = evaluateBlackjackHand(hand("A", "A", "9"));
    // 11 + 1 + 9 = 21, soft.
    expect(v.total).toBe(21);
    expect(v.isSoft).toBe(true);
    expect(v.isBust).toBe(false);
    expect(v.isBlackjack).toBe(false);
  });

  it("버스트: K,Q,5 → 25 (isBust=true, isSoft=false)", () => {
    const v = evaluateBlackjackHand(hand("K", "Q", "5"));
    expect(v.total).toBe(25);
    expect(v.isSoft).toBe(false);
    expect(v.isBust).toBe(true);
    expect(v.isBlackjack).toBe(false);
  });

  it("에이스가 있어도 버스트면 모든 A를 1로 센 최소 합(soft 아님)", () => {
    const v = evaluateBlackjackHand(hand("K", "Q", "A", "5"));
    // 10+10+1+5 = 26 > 21 → 버스트, total은 최소 합 26.
    expect(v.total).toBe(26);
    expect(v.isSoft).toBe(false);
    expect(v.isBust).toBe(true);
    expect(v.isBlackjack).toBe(false);
  });

  it("정확히 16(에이스 없음) 같은 하드 멀티카드도 정상 계산", () => {
    const v = evaluateBlackjackHand(hand("10", "4", "2"));
    expect(v.total).toBe(16);
    expect(v.isSoft).toBe(false);
    expect(v.isBust).toBe(false);
  });

  it("J/Q/K는 모두 10가치로 센다", () => {
    expect(evaluateBlackjackHand(hand("J", "Q")).total).toBe(20);
    expect(evaluateBlackjackHand(hand("A", "J")).isBlackjack).toBe(true);
    expect(evaluateBlackjackHand(hand("A", "Q")).isBlackjack).toBe(true);
  });

  it("suit는 무시한다", () => {
    const mixed: Card[] = [card("A", "hearts"), card("K", "clubs")];
    expect(evaluateBlackjackHand(mixed).isBlackjack).toBe(true);
  });

  it("빈 배열이면 throw", () => {
    expect(() => evaluateBlackjackHand([])).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const cards = hand("A", "7");
    const snapshot = JSON.parse(JSON.stringify(cards));
    evaluateBlackjackHand(cards);
    expect(cards).toEqual(snapshot);
  });
});
