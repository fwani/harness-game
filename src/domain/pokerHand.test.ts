import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "./card";
import {
  PokerHandCategory,
  evaluatePokerHand,
  comparePokerHands,
  findPokerWinners,
} from "./pokerHand";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({ suit, rank });

/** 무늬 4종을 섞은 5장(플러시·스트레이트플러시가 아닌 일반 핸드용). */
const mixed = (...ranks: Rank[]): Card[] => {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs", "spades"];
  return ranks.map((r, i) => card(r, suits[i]));
};

/** 한 무늬로 5장(플러시 계열용). */
const oneSuit = (suit: Suit, ...ranks: Rank[]): Card[] =>
  ranks.map((r) => card(r, suit));

describe("evaluatePokerHand - 족보 판정", () => {
  it("하이카드", () => {
    const r = evaluatePokerHand(mixed("A", "K", "9", "5", "3"));
    expect(r.category).toBe(PokerHandCategory.HighCard);
    expect(r.tiebreakers).toEqual([14, 13, 9, 5, 3]);
  });

  it("원페어", () => {
    const r = evaluatePokerHand(mixed("9", "9", "K", "5", "3"));
    expect(r.category).toBe(PokerHandCategory.OnePair);
    expect(r.tiebreakers).toEqual([9, 13, 5, 3]);
  });

  it("투페어", () => {
    const r = evaluatePokerHand(mixed("K", "K", "5", "5", "2"));
    expect(r.category).toBe(PokerHandCategory.TwoPair);
    expect(r.tiebreakers).toEqual([13, 5, 2]);
  });

  it("트리플", () => {
    const r = evaluatePokerHand(mixed("7", "7", "7", "K", "2"));
    expect(r.category).toBe(PokerHandCategory.ThreeOfAKind);
    expect(r.tiebreakers).toEqual([7, 13, 2]);
  });

  it("스트레이트(일반)", () => {
    const r = evaluatePokerHand(mixed("9", "8", "7", "6", "5"));
    expect(r.category).toBe(PokerHandCategory.Straight);
    expect(r.tiebreakers).toEqual([9]);
  });

  it("스트레이트(휠 A-2-3-4-5는 high=5)", () => {
    const r = evaluatePokerHand(mixed("A", "2", "3", "4", "5"));
    expect(r.category).toBe(PokerHandCategory.Straight);
    expect(r.tiebreakers).toEqual([5]);
  });

  it("스트레이트(A-K-Q-J-10은 최강 high=14)", () => {
    const r = evaluatePokerHand(mixed("A", "K", "Q", "J", "10"));
    expect(r.category).toBe(PokerHandCategory.Straight);
    expect(r.tiebreakers).toEqual([14]);
  });

  it("플러시", () => {
    const r = evaluatePokerHand(oneSuit("hearts", "A", "J", "9", "5", "2"));
    expect(r.category).toBe(PokerHandCategory.Flush);
    expect(r.tiebreakers).toEqual([14, 11, 9, 5, 2]);
  });

  it("풀하우스", () => {
    const r = evaluatePokerHand(mixed("4", "4", "4", "9", "9"));
    expect(r.category).toBe(PokerHandCategory.FullHouse);
    expect(r.tiebreakers).toEqual([4, 9]);
  });

  it("포카드", () => {
    const r = evaluatePokerHand(mixed("Q", "Q", "Q", "Q", "3"));
    expect(r.category).toBe(PokerHandCategory.FourOfAKind);
    expect(r.tiebreakers).toEqual([12, 3]);
  });

  it("스트레이트 플러시", () => {
    const r = evaluatePokerHand(oneSuit("clubs", "9", "8", "7", "6", "5"));
    expect(r.category).toBe(PokerHandCategory.StraightFlush);
    expect(r.tiebreakers).toEqual([9]);
  });

  it("스트레이트 플러시(휠, 같은 무늬 A-2-3-4-5)", () => {
    const r = evaluatePokerHand(oneSuit("clubs", "A", "2", "3", "4", "5"));
    expect(r.category).toBe(PokerHandCategory.StraightFlush);
    expect(r.tiebreakers).toEqual([5]);
  });

  it("로열 플러시는 최강 스트레이트 플러시(high=14)로 처리", () => {
    const r = evaluatePokerHand(oneSuit("spades", "A", "K", "Q", "J", "10"));
    expect(r.category).toBe(PokerHandCategory.StraightFlush);
    expect(r.tiebreakers).toEqual([14]);
  });
});

describe("comparePokerHands - 우열 비교", () => {
  it("풀하우스 vs 포카드 → 포카드가 강하다", () => {
    const fullHouse = mixed("K", "K", "K", "9", "9");
    const fourKind = mixed("4", "4", "4", "4", "2");
    expect(comparePokerHands(fourKind, fullHouse)).toBeGreaterThan(0);
    expect(comparePokerHands(fullHouse, fourKind)).toBeLessThan(0);
  });

  it("같은 카테고리 타이브레이크(높은 페어가 강하다)", () => {
    const pairK = mixed("K", "K", "9", "5", "3");
    const pairQ = mixed("Q", "Q", "9", "5", "3");
    expect(comparePokerHands(pairK, pairQ)).toBeGreaterThan(0);
  });

  it("같은 페어면 키커로 가린다", () => {
    const better = mixed("9", "9", "K", "5", "3");
    const worse = mixed("9", "9", "Q", "5", "3");
    expect(comparePokerHands(better, worse)).toBeGreaterThan(0);
  });

  it("휠 스트레이트는 일반 6-high 스트레이트보다 약하다", () => {
    const wheel = mixed("A", "2", "3", "4", "5");
    const sixHigh = mixed("6", "5", "4", "3", "2");
    expect(comparePokerHands(sixHigh, wheel)).toBeGreaterThan(0);
  });

  it("완전히 같은 강도(무늬만 다름)면 0을 반환한다", () => {
    const a = oneSuit("spades", "A", "K", "9", "5", "3");
    const b = oneSuit("hearts", "A", "K", "9", "5", "3");
    // 둘 다 플러시, 랭크 동일 → 무승부.
    expect(comparePokerHands(a, b)).toBe(0);
  });

  it("랭크가 같으면 무늬가 달라도 0(suit는 우열에 무관)", () => {
    const a = mixed("Q", "Q", "8", "6", "2");
    const b = [
      card("Q", "clubs"),
      card("Q", "diamonds"),
      card("8", "clubs"),
      card("6", "hearts"),
      card("2", "diamonds"),
    ];
    expect(comparePokerHands(a, b)).toBe(0);
  });
});

describe("입력 검증·불변성", () => {
  it("5장이 아니면 throw (4장)", () => {
    expect(() => evaluatePokerHand(mixed("A", "K", "Q", "J"))).toThrow();
  });

  it("5장이 아니면 throw (6장)", () => {
    expect(() =>
      evaluatePokerHand([
        card("A"),
        card("K"),
        card("Q"),
        card("J"),
        card("10"),
        card("9"),
      ]),
    ).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const hand = mixed("3", "9", "K", "9", "5");
    const snapshot = hand.map((c) => ({ ...c }));
    evaluatePokerHand(hand);
    expect(hand).toEqual(snapshot);
  });

  it("comparePokerHands도 입력 배열을 변형하지 않는다", () => {
    const a = mixed("3", "9", "K", "9", "5");
    const b = mixed("7", "7", "2", "4", "A");
    const sa = a.map((c) => ({ ...c }));
    const sb = b.map((c) => ({ ...c }));
    comparePokerHands(a, b);
    expect(a).toEqual(sa);
    expect(b).toEqual(sb);
  });
});

describe("findPokerWinners - 여러 핸드 중 승자(들) 판정", () => {
  it("서로 다른 카테고리면 단독 승자 인덱스를 반환한다", () => {
    const hands = [
      mixed("A", "K", "9", "5", "3"), // 0: 하이카드
      mixed("7", "7", "7", "K", "2"), // 1: 트리플 (최강)
      mixed("9", "9", "K", "5", "3"), // 2: 원페어
    ];
    expect(findPokerWinners(hands)).toEqual([1]);
  });

  it("같은 카테고리에서 타이브레이크로 단독 승자를 가린다", () => {
    const hands = [
      mixed("Q", "Q", "9", "5", "3"), // 0: 페어 Q
      mixed("K", "K", "9", "5", "3"), // 1: 페어 K (최강)
      mixed("9", "9", "K", "5", "3"), // 2: 페어 9
    ];
    expect(findPokerWinners(hands)).toEqual([1]);
  });

  it("완전 동률(무늬만 다른 동일 랭크)이면 공동 1위 인덱스를 오름차순으로 반환한다", () => {
    const hands = [
      oneSuit("spades", "A", "K", "9", "5", "3"), // 플러시
      oneSuit("hearts", "A", "K", "9", "5", "3"), // 플러시(동일 랭크)
      oneSuit("clubs", "A", "K", "9", "5", "3"), // 플러시(동일 랭크)
    ];
    expect(findPokerWinners(hands)).toEqual([0, 1, 2]);
  });

  it("일부만 동률(3명 중 2명 공동 1위)인 경우 정확한 인덱스 집합을 반환한다", () => {
    const hands = [
      mixed("K", "K", "9", "5", "3"), // 0: 페어 K (공동 1위)
      mixed("Q", "Q", "9", "5", "3"), // 1: 페어 Q
      [
        card("K", "clubs"),
        card("K", "diamonds"),
        card("9", "hearts"),
        card("5", "clubs"),
        card("3", "diamonds"),
      ], // 2: 페어 K, 동일 랭크 (공동 1위, 무늬만 다름)
    ];
    expect(findPokerWinners(hands)).toEqual([0, 2]);
  });

  it("핸드가 하나여도 그 핸드가 승자다", () => {
    expect(findPokerWinners([mixed("A", "K", "9", "5", "3")])).toEqual([0]);
  });

  it("어떤 핸드가 5장이 아니면 throw", () => {
    const hands = [mixed("A", "K", "9", "5", "3"), mixed("A", "K", "Q", "J")];
    expect(() => findPokerWinners(hands)).toThrow();
  });

  it("hands가 비어 있으면 throw", () => {
    expect(() => findPokerWinners([])).toThrow();
  });

  it("입력 배열과 원소를 변형하지 않는다", () => {
    const hands = [
      mixed("K", "K", "9", "5", "3"),
      mixed("Q", "Q", "9", "5", "3"),
    ];
    const snapshot = hands.map((h) => h.map((c) => ({ ...c })));
    findPokerWinners(hands);
    expect(hands).toEqual(snapshot);
  });
});
