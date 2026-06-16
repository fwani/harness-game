import { describe, it, expect } from "vitest";
import { shuffle, deal, type RandomSource } from "./dealCards";
import { createDeck, type Card } from "../domain/card";

/** 미리 정한 인덱스 시퀀스를 차례로 반환하는 결정적 스텁. */
function stubRng(sequence: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      if (i >= sequence.length) throw new Error("stub sequence exhausted");
      return sequence[i++]!;
    },
  };
}

const c = (rank: Card["rank"]): Card => ({ suit: "spades", rank });

describe("shuffle", () => {
  it("결정적 시퀀스에 대해 예측 순서와 일치한다", () => {
    const cards: Card[] = [c("A"), c("2"), c("3"), c("4")];
    // i=3 -> j=1, i=2 -> j=0, i=1 -> j=0 (각 단계 교환)
    // 시작 [A,2,3,4]
    // i=3,j=1: swap idx3,idx1 -> [A,4,3,2]
    // i=2,j=0: swap idx2,idx0 -> [3,4,A,2]
    // i=1,j=0: swap idx1,idx0 -> [4,3,A,2]
    const result = shuffle(cards, stubRng([1, 0, 0]));
    expect(result).toEqual([c("4"), c("3"), c("A"), c("2")]);
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const cards: Card[] = [c("A"), c("2"), c("3")];
    const snapshot = [...cards];
    shuffle(cards, stubRng([0, 0]));
    expect(cards).toEqual(snapshot);
  });

  it("같은 카드 집합(길이·구성)을 유지한다", () => {
    const deck = createDeck();
    // 항상 0을 반환 -> 유효한 인덱스, 결과는 순열
    const result = shuffle(deck, stubRng(Array(deck.length).fill(0)));
    expect(result.length).toBe(deck.length);
    expect([...result].sort(cmp)).toEqual([...deck].sort(cmp));
  });

  it("길이 0/1 배열은 그대로 반환한다", () => {
    expect(shuffle([], stubRng([]))).toEqual([]);
    expect(shuffle([c("A")], stubRng([]))).toEqual([c("A")]);
  });

  it("RandomSource가 범위 밖 인덱스를 반환하면 throw", () => {
    expect(() => shuffle([c("A"), c("2")], stubRng([5]))).toThrow();
  });
});

describe("deal", () => {
  it("players명에게 perPlayer장씩 라운드로빈으로 분배한다", () => {
    const deck: Card[] = [
      c("A"),
      c("2"),
      c("3"),
      c("4"),
      c("5"),
      c("6"),
      c("7"),
    ];
    const { hands, rest } = deal(deck, 2, 3);
    expect(hands).toHaveLength(2);
    // 라운드로빈: p0 <- 0,2,4 / p1 <- 1,3,5
    expect(hands[0]).toEqual([c("A"), c("3"), c("5")]);
    expect(hands[1]).toEqual([c("2"), c("4"), c("6")]);
    expect(rest).toEqual([c("7")]);
    expect(rest).toHaveLength(deck.length - 2 * 3);
  });

  it("perPlayer=0 이면 빈 손패와 전체 rest", () => {
    const deck = createDeck();
    const { hands, rest } = deal(deck, 4, 0);
    expect(hands).toEqual([[], [], [], []]);
    expect(rest).toHaveLength(deck.length);
  });

  it("입력 deck을 변형하지 않는다(불변)", () => {
    const deck = createDeck();
    const snapshot = [...deck];
    deal(deck, 2, 5);
    expect(deck).toEqual(snapshot);
  });

  it("players < 1 이면 throw", () => {
    expect(() => deal(createDeck(), 0, 1)).toThrow();
  });

  it("perPlayer < 0 이면 throw", () => {
    expect(() => deal(createDeck(), 2, -1)).toThrow();
  });

  it("정수가 아니면 throw", () => {
    expect(() => deal(createDeck(), 2.5, 1)).toThrow();
    expect(() => deal(createDeck(), 2, 1.5)).toThrow();
  });

  it("카드가 부족하면 throw", () => {
    expect(() => deal([c("A"), c("2")], 2, 2)).toThrow();
  });
});

function cmp(a: Card, b: Card): number {
  return `${a.suit}${a.rank}` < `${b.suit}${b.rank}` ? -1 : 1;
}
