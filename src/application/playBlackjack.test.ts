import { describe, expect, it } from "vitest";
import { createDeck, type Card, type Rank, type Suit } from "../domain/card";
import type { RandomSource } from "./dealCards";
import { playBlackjackRound } from "./playBlackjack";

// createDeck() 순서: spades A,2,...,K, hearts ..., diamonds, clubs (52장).
// playBlackjackRound는 shuffle된 덱에서 player=idx0,2 / dealer=idx1,3, draw=idx4.. 로 진행한다.

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const sameCard = (a: Card, b: Card): boolean =>
  a.suit === b.suit && a.rank === b.rank;
const key = (c: Card): string => `${c.suit}-${c.rank}`;

/**
 * front 카드를 덱의 앞에 두고 나머지는 createDeck 순서로 채운 52장 순열을 만든다.
 * front에 중복이 있거나 표준 덱에 없는 카드가 있으면 throw.
 */
const buildTargetDeck = (front: Card[]): Card[] => {
  const deck = createDeck();
  const used = new Set(front.map(key));
  if (used.size !== front.length) throw new Error("front에 중복 카드가 있다");
  for (const c of front) {
    if (!deck.some((d) => sameCard(d, c))) throw new Error(`표준 덱에 없는 카드: ${key(c)}`);
  }
  const rest = deck.filter((d) => !used.has(key(d)));
  return [...front, ...rest];
};

/**
 * shuffle(createDeck(), rng)가 정확히 target(52장 순열)을 내도록 하는 결정적 스텁 rng를 만든다.
 * shuffle은 i=51..1에 대해 j=nextInt(i+1)로 work[i]↔work[j]를 교환하므로,
 * 항등 덱에서 시작해 각 i 단계에서 target[i]의 현재 위치 j를 nextInt(i+1)로 돌려주면 된다.
 */
const rngForTarget = (target: Card[]): RandomSource => {
  const work = createDeck();
  const byMax = new Map<number, number>();
  for (let i = work.length - 1; i >= 1; i--) {
    let j = -1;
    for (let k = 0; k <= i; k++) {
      if (sameCard(work[k]!, target[i]!)) {
        j = k;
        break;
      }
    }
    if (j < 0) throw new Error(`target[${i}] (${key(target[i]!)})가 작업 덱에 없다`);
    byMax.set(i + 1, j);
    const tmp = work[i]!;
    work[i] = work[j]!;
    work[j] = tmp;
  }
  return {
    nextInt: (m) => {
      const j = byMax.get(m);
      if (j === undefined) throw new Error(`예상치 못한 nextInt(${m})`);
      return j;
    },
  };
};

describe("playBlackjackRound", () => {
  it("플레이어 버스트 → dealer 승 (딜러는 진행하지 않음)", () => {
    // player: 10♠(0), 6♥(2) = 16 → 히트, K♠(4) → 26 버스트.
    // dealer: 9♠(1), 8♠(3) = 17 (플레이어 버스트라 미진행).
    const target = buildTargetDeck([
      card("spades", "10"),
      card("spades", "9"),
      card("hearts", "6"),
      card("spades", "8"),
      card("spades", "K"),
    ]);
    const result = playBlackjackRound(rngForTarget(target));
    expect(result.outcome).toBe("dealer");
    expect(result.playerHand).toEqual([
      card("spades", "10"),
      card("hearts", "6"),
      card("spades", "K"),
    ]);
    // 딜러는 진행하지 않아 초기 2장 그대로다.
    expect(result.dealerHand).toEqual([card("spades", "9"), card("spades", "8")]);
  });

  it("딜러 버스트 → player 승", () => {
    // player: 10♠(0), 9♠(2) = 19 → 스탠드.
    // dealer: 10♥(1), 6♥(3) = 16 → 히트, K♠(4) → 26 버스트.
    const target = buildTargetDeck([
      card("spades", "10"),
      card("hearts", "10"),
      card("spades", "9"),
      card("hearts", "6"),
      card("spades", "K"),
    ]);
    const result = playBlackjackRound(rngForTarget(target));
    expect(result.outcome).toBe("player");
    expect(result.playerHand).toEqual([card("spades", "10"), card("spades", "9")]);
    expect(result.dealerHand).toEqual([
      card("hearts", "10"),
      card("hearts", "6"),
      card("spades", "K"),
    ]);
  });

  it("양쪽 내추럴 블랙잭 → push", () => {
    // player: A♠(0), K♠(2) = 21 BJ. dealer: A♥(1), K♥(3) = 21 BJ.
    const target = buildTargetDeck([
      card("spades", "A"),
      card("hearts", "A"),
      card("spades", "K"),
      card("hearts", "K"),
    ]);
    const result = playBlackjackRound(rngForTarget(target));
    expect(result.outcome).toBe("push");
    expect(result.playerHand).toEqual([card("spades", "A"), card("spades", "K")]);
    expect(result.dealerHand).toEqual([card("hearts", "A"), card("hearts", "K")]);
  });

  it("한쪽만 내추럴 블랙잭 → 그쪽(player) 승", () => {
    // player: A♠(0), K♠(2) = 21 BJ. dealer: 10♥(1), 7♥(3) = 17 스탠드(블랙잭 아님).
    const target = buildTargetDeck([
      card("spades", "A"),
      card("hearts", "10"),
      card("spades", "K"),
      card("hearts", "7"),
    ]);
    const result = playBlackjackRound(rngForTarget(target));
    expect(result.outcome).toBe("player");
    expect(result.playerHand).toEqual([card("spades", "A"), card("spades", "K")]);
    expect(result.dealerHand).toEqual([card("hearts", "10"), card("hearts", "7")]);
  });

  it("total 동률 → push", () => {
    // player: 10♠(0), 8♠(2) = 18. dealer: 10♥(1), 8♥(3) = 18. 둘 다 스탠드, 블랙잭 아님.
    const target = buildTargetDeck([
      card("spades", "10"),
      card("hearts", "10"),
      card("spades", "8"),
      card("hearts", "8"),
    ]);
    const result = playBlackjackRound(rngForTarget(target));
    expect(result.outcome).toBe("push");
    expect(result.playerHand).toEqual([card("spades", "10"), card("spades", "8")]);
    expect(result.dealerHand).toEqual([card("hearts", "10"), card("hearts", "8")]);
  });

  it("동일 rng 시퀀스면 항상 동일 결과(결정적)", () => {
    const front = [
      card("spades", "10"),
      card("hearts", "10"),
      card("spades", "9"),
      card("hearts", "6"),
      card("spades", "K"),
    ];
    const target = buildTargetDeck(front);
    const a = playBlackjackRound(rngForTarget(target));
    const b = playBlackjackRound(rngForTarget(target));
    expect(a).toEqual(b);
  });
});
