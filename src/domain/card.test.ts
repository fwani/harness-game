import { describe, it, expect } from "vitest";
import {
  createDeck,
  rankValue,
  compareCards,
  type Suit,
  type Rank,
  type Card,
} from "./card";

const ALL_SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const ALL_RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

const key = (c: Card): string => `${c.suit}-${c.rank}`;

describe("card domain", () => {
  describe("createDeck", () => {
    it("has exactly 52 cards", () => {
      expect(createDeck()).toHaveLength(52);
    });

    it("has no duplicate cards", () => {
      const deck = createDeck();
      const unique = new Set(deck.map(key));
      expect(unique.size).toBe(52);
    });

    it("covers all 4 suits and 13 ranks", () => {
      const deck = createDeck();
      for (const suit of ALL_SUITS) {
        for (const rank of ALL_RANKS) {
          expect(deck.some((c) => c.suit === suit && c.rank === rank)).toBe(true);
        }
      }
    });
  });

  describe("rankValue (ace high)", () => {
    it("maps number ranks to their integer value", () => {
      expect(rankValue("2")).toBe(2);
      expect(rankValue("10")).toBe(10);
    });

    it("maps face cards and ace high", () => {
      expect(rankValue("J")).toBe(11);
      expect(rankValue("Q")).toBe(12);
      expect(rankValue("K")).toBe(13);
      expect(rankValue("A")).toBe(14);
    });

    it("is strictly increasing across the defined order", () => {
      const values = ALL_RANKS.filter((r) => r !== "A").map(rankValue);
      // 2..K in ascending order
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i]!).toBeGreaterThan(values[i - 1]!);
      }
      // ace is the highest
      expect(rankValue("A")).toBeGreaterThan(rankValue("K"));
    });
  });

  describe("compareCards", () => {
    const card = (suit: Suit, rank: Rank): Card => ({ suit, rank });

    it("returns negative when a ranks lower than b", () => {
      expect(compareCards(card("spades", "2"), card("hearts", "K"))).toBeLessThan(0);
    });

    it("returns positive when a ranks higher than b", () => {
      expect(compareCards(card("clubs", "A"), card("diamonds", "10"))).toBeGreaterThan(0);
    });

    it("returns 0 when ranks are equal regardless of suit", () => {
      expect(compareCards(card("spades", "7"), card("hearts", "7"))).toBe(0);
    });
  });
});
