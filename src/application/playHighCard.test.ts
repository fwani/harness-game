import { describe, it, expect } from "vitest";
import { playHighCardRound } from "./playHighCard";
import { createDeck } from "../domain/card";
import { rankValue } from "../domain/highCard";
import type { RandomSource } from "./dealCards";

// shuffle을 무력화하는 항등 RNG: nextInt(n) = n-1 → Fisher–Yates 교환이 제자리.
// 따라서 deck은 createDeck() 순서 그대로 유지된다(첫 두 장: A♠, 2♠).
const identityRng: RandomSource = { nextInt: (maxExclusive) => maxExclusive - 1 };

describe("playHighCardRound", () => {
  it("덱 위 두 장을 뽑아 a 기준으로 비교한다", () => {
    const deck = createDeck();
    const result = playHighCardRound(identityRng);
    expect(result.a).toEqual(deck[0]);
    expect(result.b).toEqual(deck[1]);
    // A(14) vs 2(2) → a 승.
    expect(rankValue(result.a.rank)).toBeGreaterThan(rankValue(result.b.rank));
    expect(result.result).toBe("first");
  });

  it("두 장은 서로 다른 카드다", () => {
    const { a, b } = playHighCardRound(identityRng);
    expect(a).not.toEqual(b);
  });
});
