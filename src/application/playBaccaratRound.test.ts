import { describe, expect, it } from "vitest";
import { createDeck, type Card, type Rank, type Suit } from "../domain/card";
import type { RandomSource } from "./dealCards";
import { playBaccaratRound } from "./playBaccaratRound";

// createDeck() 순서: spades A,2,...,K, hearts ..., diamonds, clubs (52장).
// playBaccaratRound는 shuffle된 덱에서 player=idx0,2 / banker=idx1,3, draw=idx4.. 로 진행한다.

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

describe("playBaccaratRound", () => {
  it("플레이어 내추럴(9) → 양쪽 추가 카드 없이 즉시 비교, player 승", () => {
    // player: 9♠(0), 10♠(2) = 9 내추럴. banker: 5♥(1), 2♥(3) = 7.
    const target = buildTargetDeck([
      card("spades", "9"),
      card("hearts", "5"),
      card("spades", "10"),
      card("hearts", "2"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("player");
    expect(result.playerScore).toBe(9);
    expect(result.bankerScore).toBe(7);
    // 내추럴이라 양쪽 모두 2장 그대로.
    expect(result.playerHand).toEqual([card("spades", "9"), card("spades", "10")]);
    expect(result.bankerHand).toEqual([card("hearts", "5"), card("hearts", "2")]);
  });

  it("뱅커 내추럴(9) → 양쪽 추가 카드 없이 즉시 비교, banker 승", () => {
    // player: 5♠(0), 2♠(2) = 7. banker: 9♥(1), 10♥(3) = 9 내추럴.
    const target = buildTargetDeck([
      card("spades", "5"),
      card("hearts", "9"),
      card("spades", "2"),
      card("hearts", "10"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("banker");
    expect(result.playerScore).toBe(7);
    expect(result.bankerScore).toBe(9);
    expect(result.playerHand).toEqual([card("spades", "5"), card("spades", "2")]);
    expect(result.bankerHand).toEqual([card("hearts", "9"), card("hearts", "10")]);
  });

  it("플레이어 스탠드(6) → 뱅커 0~5면 드로우", () => {
    // player: 6♠(0), K♠(2) = 6 스탠드. banker: 3♥(1), 2♥(3) = 5 → 드로우.
    // 세 번째: 3♦(draw0) → 뱅커 5+3=8.
    const target = buildTargetDeck([
      card("spades", "6"),
      card("hearts", "3"),
      card("spades", "K"),
      card("hearts", "2"),
      card("diamonds", "3"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("banker");
    expect(result.playerScore).toBe(6);
    expect(result.bankerScore).toBe(8);
    expect(result.playerHand).toEqual([card("spades", "6"), card("spades", "K")]);
    expect(result.bankerHand).toEqual([
      card("hearts", "3"),
      card("hearts", "2"),
      card("diamonds", "3"),
    ]);
  });

  it("플레이어 세 번째 카드 p3=8 + 뱅커 3 → 뱅커 스탠드", () => {
    // player: A♠(0), 3♠(2) = 4 → 드로우, 세 번째 8♦(draw0, p3=8) → 4+8=12→2.
    // banker: 2♥(1), A♥(3) = 3, p3=8이므로 스탠드 → 3.
    const target = buildTargetDeck([
      card("spades", "A"),
      card("hearts", "2"),
      card("spades", "3"),
      card("hearts", "A"),
      card("diamonds", "8"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("banker");
    expect(result.playerScore).toBe(2);
    expect(result.bankerScore).toBe(3);
    // 플레이어는 세 번째 카드를 받아 3장, 뱅커는 스탠드해 2장.
    expect(result.playerHand).toEqual([
      card("spades", "A"),
      card("spades", "3"),
      card("diamonds", "8"),
    ]);
    expect(result.bankerHand).toEqual([card("hearts", "2"), card("hearts", "A")]);
  });

  it("플레이어 세 번째 카드 p3=6 + 뱅커 6 → 뱅커 드로우", () => {
    // player: A♠(0), 4♠(2) = 5 → 드로우, 세 번째 6♦(draw0, p3=6) → 5+6=11→1.
    // banker: 2♥(1), 4♥(3) = 6, p3=6이므로 드로우 → 2♦(draw1) → 6+2=8.
    const target = buildTargetDeck([
      card("spades", "A"),
      card("hearts", "2"),
      card("spades", "4"),
      card("hearts", "4"),
      card("diamonds", "6"),
      card("diamonds", "2"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("banker");
    expect(result.playerScore).toBe(1);
    expect(result.bankerScore).toBe(8);
    expect(result.playerHand).toEqual([
      card("spades", "A"),
      card("spades", "4"),
      card("diamonds", "6"),
    ]);
    expect(result.bankerHand).toEqual([
      card("hearts", "2"),
      card("hearts", "4"),
      card("diamonds", "2"),
    ]);
  });

  it("최종 끗수 동률 → tie", () => {
    // player: 5♠(0), 2♠(2) = 7 스탠드. banker: 4♥(1), 3♥(3) = 7 스탠드. 7=7 → tie.
    const target = buildTargetDeck([
      card("spades", "5"),
      card("hearts", "4"),
      card("spades", "2"),
      card("hearts", "3"),
    ]);
    const result = playBaccaratRound(rngForTarget(target));
    expect(result.outcome).toBe("tie");
    expect(result.playerScore).toBe(7);
    expect(result.bankerScore).toBe(7);
    expect(result.playerHand).toHaveLength(2);
    expect(result.bankerHand).toHaveLength(2);
  });

  it("동일 rng 시퀀스면 항상 동일 결과(결정적)", () => {
    const front = [
      card("spades", "A"),
      card("hearts", "2"),
      card("spades", "4"),
      card("hearts", "4"),
      card("diamonds", "6"),
      card("diamonds", "2"),
    ];
    const target = buildTargetDeck(front);
    const a = playBaccaratRound(rngForTarget(target));
    const b = playBaccaratRound(rngForTarget(target));
    expect(a).toEqual(b);
  });

  it("반환 손패는 독립 배열이라 변형해도 다음 진행에 영향 없다(비파괴)", () => {
    const front = [
      card("spades", "6"),
      card("hearts", "3"),
      card("spades", "K"),
      card("hearts", "2"),
      card("diamonds", "3"),
    ];
    const target = buildTargetDeck(front);
    const first = playBaccaratRound(rngForTarget(target));
    // 반환된 손패를 임의로 변형해도 동일 rng의 새 진행은 영향을 받지 않아야 한다.
    first.playerHand.push(card("clubs", "K"));
    first.bankerHand.length = 0;
    const second = playBaccaratRound(rngForTarget(target));
    expect(second.playerHand).toEqual([card("spades", "6"), card("spades", "K")]);
    expect(second.bankerHand).toEqual([
      card("hearts", "3"),
      card("hearts", "2"),
      card("diamonds", "3"),
    ]);
  });

  it("score는 0~9 범위, 손패는 2~3장, outcome은 player/banker/tie", () => {
    const fronts: Card[][] = [
      [card("spades", "9"), card("hearts", "5"), card("spades", "10"), card("hearts", "2")],
      [card("spades", "A"), card("hearts", "2"), card("spades", "4"), card("hearts", "4"), card("diamonds", "6"), card("diamonds", "2")],
      [card("spades", "5"), card("hearts", "4"), card("spades", "2"), card("hearts", "3")],
    ];
    for (const front of fronts) {
      const r = playBaccaratRound(rngForTarget(buildTargetDeck(front)));
      expect(r.playerScore).toBeGreaterThanOrEqual(0);
      expect(r.playerScore).toBeLessThanOrEqual(9);
      expect(r.bankerScore).toBeGreaterThanOrEqual(0);
      expect(r.bankerScore).toBeLessThanOrEqual(9);
      expect(r.playerHand.length).toBeGreaterThanOrEqual(2);
      expect(r.playerHand.length).toBeLessThanOrEqual(3);
      expect(r.bankerHand.length).toBeGreaterThanOrEqual(2);
      expect(r.bankerHand.length).toBeLessThanOrEqual(3);
      expect(["player", "banker", "tie"]).toContain(r.outcome);
    }
  });
});
