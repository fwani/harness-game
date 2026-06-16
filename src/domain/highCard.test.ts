import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "./card";
import { rankValue, compareHighCard } from "./highCard";

const card = (rank: Rank, suit: Suit = "spades"): Card => ({ suit, rank });

describe("rankValue", () => {
  it("13개 랭크 전부에 대해 에이스 하이 기대값(2..14)을 돌려준다", () => {
    const expected: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    for (const rank of Object.keys(expected) as Rank[]) {
      expect(rankValue(rank)).toBe(expected[rank]);
    }
  });
});

describe("compareHighCard", () => {
  it("높은 랭크 카드가 'first'로 판정된다", () => {
    expect(compareHighCard(card("A"), card("K"))).toBe("first");
    expect(compareHighCard(card("10"), card("9"))).toBe("first");
    expect(compareHighCard(card("3"), card("2"))).toBe("first");
  });

  it("낮은 랭크 카드면 'second'로 판정된다(양방향)", () => {
    expect(compareHighCard(card("K"), card("A"))).toBe("second");
    expect(compareHighCard(card("9"), card("10"))).toBe("second");
    expect(compareHighCard(card("2"), card("3"))).toBe("second");
  });

  it("같은 랭크·다른 무늬는 'draw'다", () => {
    expect(compareHighCard(card("A", "spades"), card("A", "hearts"))).toBe(
      "draw",
    );
    expect(compareHighCard(card("7", "diamonds"), card("7", "clubs"))).toBe(
      "draw",
    );
  });

  it("무늬는 결과에 영향을 주지 않는다", () => {
    const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
    for (const sa of suits) {
      for (const sb of suits) {
        // 같은 랭크면 무늬와 무관하게 항상 draw
        expect(compareHighCard(card("Q", sa), card("Q", sb))).toBe("draw");
        // 높은 랭크는 무늬와 무관하게 항상 first
        expect(compareHighCard(card("K", sa), card("5", sb))).toBe("first");
      }
    }
  });

  it("입력 카드 객체를 변형하지 않는다(불변)", () => {
    const a = card("A", "spades");
    const b = card("K", "hearts");
    compareHighCard(a, b);
    expect(a).toEqual({ suit: "spades", rank: "A" });
    expect(b).toEqual({ suit: "hearts", rank: "K" });
  });
});
