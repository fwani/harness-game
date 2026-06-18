import { describe, expect, it } from "vitest";
import {
  playOneCardCpuTurn,
  reshuffleIfNeeded,
  startOneCardGame,
} from "./playOneCard";
import {
  createOneCardGame,
  findOneCardWinner,
  topDiscard,
  type OneCardState,
} from "../domain/oneCard";
import type { Card } from "../domain/card";
import type { RandomSource } from "./dealCards";

/** 항상 0을 반환하는 결정적 rng(Fisher–Yates를 완전히 결정적으로 만든다). */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

/** 미리 정한 값을 순서대로 반환하는 결정적 rng(소진되면 되감음). */
class SequenceRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const v = this.values[this.i % this.values.length]!;
    this.i += 1;
    return v;
  }
}

/** 미리 정한 값을 maxExclusive로 나눈 나머지로 반환하는 결정적 rng(항상 범위 안, 소진되면 되감음). */
class ModRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const v = this.values[this.i % this.values.length]!;
    this.i += 1;
    return v % maxExclusive;
  }
}

function countCards(state: OneCardState): number {
  const inHands = state.hands.reduce((sum, hand) => sum + hand.length, 0);
  return inHands + state.drawPile.length + state.discardPile.length;
}

describe("startOneCardGame", () => {
  it("playerCount명에게 handSize장씩 분배하고 버림더미 1장·나머지 드로우더미로 둔다", () => {
    const state = startOneCardGame(2, 5, new ZeroRandom());
    expect(state.hands).toHaveLength(2);
    expect(state.hands[0]).toHaveLength(5);
    expect(state.hands[1]).toHaveLength(5);
    expect(state.discardPile).toHaveLength(1);
    expect(state.drawPile).toHaveLength(52 - 2 * 5 - 1);
    expect(state.currentPlayer).toBe(0);
  });

  it("덱 52장이 손패·버림더미·드로우더미에 빠짐없이 분배된다(중복·분실 없음)", () => {
    const state = startOneCardGame(3, 7, new ZeroRandom());
    expect(countCards(state)).toBe(52);
    // 모든 카드가 유일해야 한다.
    const all: Card[] = [
      ...state.hands.flat(),
      ...state.drawPile,
      ...state.discardPile,
    ];
    const keys = new Set(all.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it("같은 random 시퀀스·같은 입력이면 결정적으로 동일한 결과", () => {
    const a = startOneCardGame(2, 5, new ModRandom([3, 1, 4, 1, 5, 9, 2, 6]));
    const b = startOneCardGame(2, 5, new ModRandom([3, 1, 4, 1, 5, 9, 2, 6]));
    expect(a).toEqual(b);
  });

  it("playerCount가 2 미만이면 throw", () => {
    expect(() => startOneCardGame(1, 5, new ZeroRandom())).toThrow();
  });

  it("handSize가 1 미만이면 throw", () => {
    expect(() => startOneCardGame(2, 0, new ZeroRandom())).toThrow();
  });

  it("버림더미 1장 포함 카드가 부족하면 throw", () => {
    // 6명 * 9장 + 1 = 55 > 52
    expect(() => startOneCardGame(6, 9, new ZeroRandom())).toThrow();
  });
});

describe("reshuffleIfNeeded", () => {
  it("드로우더미에 카드가 남아 있으면 state를 그대로 반환한다", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [{ suit: "hearts", rank: "2" }],
      ],
      [{ suit: "clubs", rank: "9" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    expect(reshuffleIfNeeded(state, new ZeroRandom())).toBe(state);
  });

  it("드로우더미가 비면 버림더미 맨 위 1장만 남기고 나머지를 재셔플해 되돌린다", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [{ suit: "hearts", rank: "2" }],
      ],
      [],
      [
        { suit: "diamonds", rank: "3" },
        { suit: "clubs", rank: "7" },
        { suit: "spades", rank: "A" }, // 맨 위
      ],
      0,
    );
    const next = reshuffleIfNeeded(state, new ZeroRandom());
    // 맨 위 카드는 버림더미에 1장만 남는다.
    expect(next.discardPile).toHaveLength(1);
    expect(topDiscard(next)).toEqual({ suit: "spades", rank: "A" });
    // 나머지 2장이 드로우더미로 돌아간다.
    expect(next.drawPile).toHaveLength(2);
    const drawKeys = new Set(next.drawPile.map((c) => `${c.suit}-${c.rank}`));
    expect(drawKeys).toEqual(new Set(["diamonds-3", "clubs-7"]));
  });

  it("재셔플 후에도 뽑을 카드가 없으면(버림더미 1장뿐) state를 그대로 반환한다", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [{ suit: "hearts", rank: "2" }],
      ],
      [],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    expect(reshuffleIfNeeded(state, new ZeroRandom())).toBe(state);
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [{ suit: "hearts", rank: "2" }],
      ],
      [],
      [
        { suit: "diamonds", rank: "3" },
        { suit: "spades", rank: "A" },
      ],
      0,
    );
    const snapshot = JSON.stringify(state);
    reshuffleIfNeeded(state, new ZeroRandom());
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("playOneCardCpuTurn", () => {
  it("낼 수 있으면 합법 카드를 내고(play) 손패에서 제거·턴을 넘긴다", () => {
    const state = createOneCardGame(
      [
        [
          { suit: "spades", rank: "5" }, // top(spades A)과 무늬 일치 → 합법
          { suit: "clubs", rank: "2" }, // 불법
        ],
        [{ suit: "hearts", rank: "9" }],
      ],
      [{ suit: "diamonds", rank: "4" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    const result = playOneCardCpuTurn(state, new ZeroRandom());
    expect(result.action).toEqual({
      kind: "play",
      card: { suit: "spades", rank: "5" },
    });
    expect(result.state.hands[0]).toEqual([{ suit: "clubs", rank: "2" }]);
    expect(topDiscard(result.state)).toEqual({ suit: "spades", rank: "5" });
    expect(result.state.currentPlayer).toBe(1);
  });

  it("낼 게 없으면 드로우더미에서 한 장 뽑는다(draw)", () => {
    const state = createOneCardGame(
      [
        [
          { suit: "hearts", rank: "2" },
          { suit: "clubs", rank: "3" },
        ],
        [{ suit: "hearts", rank: "9" }],
      ],
      [{ suit: "diamonds", rank: "7" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    const result = playOneCardCpuTurn(state, new ZeroRandom());
    expect(result.action).toEqual({
      kind: "draw",
      card: { suit: "diamonds", rank: "7" },
    });
    expect(result.state.hands[0]).toContainEqual({ suit: "diamonds", rank: "7" });
    expect(result.state.hands[0]).toHaveLength(3);
    expect(result.state.drawPile).toHaveLength(0);
    expect(result.state.currentPlayer).toBe(1);
  });

  it("낼 게 없고 드로우더미가 비면 재셔플 후 한 장 뽑는다(draw)", () => {
    const state = createOneCardGame(
      [
        [
          { suit: "hearts", rank: "2" },
          { suit: "clubs", rank: "3" },
        ],
        [{ suit: "hearts", rank: "9" }],
      ],
      [],
      [
        { suit: "diamonds", rank: "5" }, // 재셔플 대상
        { suit: "spades", rank: "A" }, // 맨 위 → 남는다
      ],
      0,
    );
    const result = playOneCardCpuTurn(state, new ZeroRandom());
    expect(result.action).toEqual({
      kind: "draw",
      card: { suit: "diamonds", rank: "5" },
    });
    expect(result.state.hands[0]).toContainEqual({ suit: "diamonds", rank: "5" });
    expect(topDiscard(result.state)).toEqual({ suit: "spades", rank: "A" });
    expect(result.state.currentPlayer).toBe(1);
  });

  it("재셔플 후에도 뽑을 카드가 없으면 pass(상태 그대로)", () => {
    const state = createOneCardGame(
      [
        [{ suit: "hearts", rank: "2" }],
        [{ suit: "hearts", rank: "9" }],
      ],
      [],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    const result = playOneCardCpuTurn(state, new ZeroRandom());
    expect(result.action).toEqual({ kind: "pass" });
    expect(result.state).toBe(state);
  });

  it("이미 승자가 있는 상태에서 호출되면 throw", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [], // 손패 빈 승자
      ],
      [{ suit: "diamonds", rank: "4" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    expect(findOneCardWinner(state)).toBe(1);
    expect(() => playOneCardCpuTurn(state, new ZeroRandom())).toThrow();
  });

  it("여러 합법 수 중 random.nextInt 인덱스로 결정적으로 고른다", () => {
    const state = createOneCardGame(
      [
        [
          { suit: "spades", rank: "5" }, // 합법(무늬)
          { suit: "hearts", rank: "A" }, // 합법(숫자)
        ],
        [{ suit: "clubs", rank: "9" }],
      ],
      [{ suit: "diamonds", rank: "4" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    // 인덱스 1을 고르면 hearts A를 낸다.
    const result = playOneCardCpuTurn(state, new SequenceRandom([1]));
    expect(result.action).toEqual({
      kind: "play",
      card: { suit: "hearts", rank: "A" },
    });
    expect(result.state.hands[0]).toEqual([{ suit: "spades", rank: "5" }]);
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = createOneCardGame(
      [
        [{ suit: "spades", rank: "5" }],
        [{ suit: "hearts", rank: "9" }],
      ],
      [{ suit: "diamonds", rank: "4" }],
      [{ suit: "spades", rank: "A" }],
      0,
    );
    const snapshot = JSON.stringify(state);
    playOneCardCpuTurn(state, new ZeroRandom());
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
