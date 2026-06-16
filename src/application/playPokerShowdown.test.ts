import { describe, expect, it } from "vitest";
import { createDeck, type Card, type Rank, type Suit } from "../domain/card";
import { findPokerWinners } from "../domain/pokerHand";
import { playPokerShowdown } from "./playPokerShowdown";
import type { RandomSource } from "./dealCards";

// createDeck() 순서: spades A,2,...,K, hearts A,..., diamonds, clubs (52장).
// shuffle은 i=length-1..1 에 대해 j=rng.nextInt(i+1)로 result[i]↔result[j]를 교환한다.
// deal(shuffled, players, 5)은 라운드로빈 분배이므로 hands[p][round]=shuffled[round*players+p].

/** nextInt(m) → m-1(=i): 모든 교환이 no-op → 셔플 결과는 항등(createDeck 순서 유지). */
const identityRng = (): RandomSource => ({ nextInt: (m) => m - 1 });

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const key = (c: Card): string => `${c.suit}-${c.rank}`;
const sameCard = (a: Card, b: Card): boolean => a.suit === b.suit && a.rank === b.rank;

/**
 * shuffle(createDeck(), rng)가 정확히 target(52장 순열)을 내도록 하는 결정적 스텁 rng를 만든다.
 * shuffle은 i=51..1에 대해 j=nextInt(i+1)로 work[i]↔work[j]를 교환하므로,
 * 항등 덱에서 시작해 각 i 단계에서 target[i]의 현재 위치 j를 nextInt(i+1)로 돌려주면 된다.
 * (i 단계 이후 위치 i는 더 건드려지지 않으므로 target[i]가 그대로 고정된다.)
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

/** target의 앞 10장을 지정하고 나머지는 createDeck 순서로 채운 52장 순열을 만든다. */
const targetWithTop10 = (top10: Card[]): Card[] => {
  const used = new Set(top10.map(key));
  const rest = createDeck().filter((c) => !used.has(key(c)));
  return [...top10, ...rest];
};

describe("playPokerShowdown", () => {
  it("결정성: 동일 rng 시퀀스 → 동일 결과", () => {
    expect(playPokerShowdown(identityRng(), 4)).toEqual(
      playPokerShowdown(identityRng(), 4),
    );
  });

  it("각 플레이어가 정확히 5장을 받고, 핸드 전체에 카드 중복이 없다", () => {
    for (const players of [2, 3, 5, 10]) {
      const { hands } = playPokerShowdown(identityRng(), players);
      expect(hands).toHaveLength(players);
      const seen = new Set<string>();
      for (const hand of hands) {
        expect(hand).toHaveLength(5);
        for (const c of hand) seen.add(key(c));
      }
      // 5장 × players명이 모두 서로 다른 카드여야 한다(중복 분배 없음).
      expect(seen.size).toBe(players * 5);
    }
  });

  it("winners는 findPokerWinners(hands)와 일치한다", () => {
    for (const players of [2, 3, 5, 10]) {
      const { hands, winners } = playPokerShowdown(identityRng(), players);
      expect(winners).toEqual(findPokerWinners(hands));
    }
  });

  it("스플릿: 두 플레이어가 같은 랭크의 스트레이트 플러시(로열) → 공동 우승 2명", () => {
    // 2명 분배에서 p0=짝수 인덱스, p1=홀수 인덱스를 받는다.
    // p0는 spades A-K-Q-J-10, p1은 hearts A-K-Q-J-10 → 같은 랭크의 로열 플러시 → 동률.
    const target = targetWithTop10([
      card("spades", "A"),
      card("hearts", "A"),
      card("spades", "K"),
      card("hearts", "K"),
      card("spades", "Q"),
      card("hearts", "Q"),
      card("spades", "J"),
      card("hearts", "J"),
      card("spades", "10"),
      card("hearts", "10"),
    ]);
    const { hands, winners } = playPokerShowdown(rngForTarget(target), 2);
    expect(hands[0]).toEqual([
      card("spades", "A"),
      card("spades", "K"),
      card("spades", "Q"),
      card("spades", "J"),
      card("spades", "10"),
    ]);
    expect(hands[1]).toEqual([
      card("hearts", "A"),
      card("hearts", "K"),
      card("hearts", "Q"),
      card("hearts", "J"),
      card("hearts", "10"),
    ]);
    expect(winners).toEqual([0, 1]);
    expect(winners.length).toBeGreaterThanOrEqual(2);
    // 도메인 판정과도 일치해야 한다.
    expect(winners).toEqual(findPokerWinners(hands));
  });

  it("단독 우승: 한 플레이어만 강한 핸드를 가지면 winners 길이 1", () => {
    // p0=spades A-K-Q-J-10(로열), p1=hearts 2-3-4-5-7(노페어) → p0 단독.
    const target = targetWithTop10([
      card("spades", "A"),
      card("hearts", "2"),
      card("spades", "K"),
      card("hearts", "3"),
      card("spades", "Q"),
      card("hearts", "4"),
      card("spades", "J"),
      card("hearts", "5"),
      card("spades", "10"),
      card("hearts", "7"),
    ]);
    const { winners } = playPokerShowdown(rngForTarget(target), 2);
    expect(winners).toEqual([0]);
  });

  it("players < 2 이면 throw (쇼다운은 최소 2명)", () => {
    expect(() => playPokerShowdown(identityRng(), 1)).toThrow();
    expect(() => playPokerShowdown(identityRng(), 0)).toThrow();
    expect(() => playPokerShowdown(identityRng(), -3)).toThrow();
  });

  it("정수가 아닌 players는 throw", () => {
    expect(() => playPokerShowdown(identityRng(), 2.5)).toThrow();
  });

  it("players > 10 이면 카드 부족으로 throw", () => {
    expect(() => playPokerShowdown(identityRng(), 11)).toThrow();
  });

  it("불변: 한 판 진행 후에도 createDeck()는 동일한 정렬 덱을 반환한다(공유 상태 미변형)", () => {
    const before = createDeck();
    playPokerShowdown(identityRng(), 4);
    expect(createDeck()).toEqual(before);
  });
});
