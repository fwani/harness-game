import { describe, expect, it } from "vitest";
import { createDeck } from "../domain/card";
import { playHighCardRound } from "./playHighCard";
import type { RandomSource } from "./dealCards";

// createDeck() 순서: spades A,2,3,...,K, hearts A,... → deck[0]=spades A, deck[1]=spades 2, deck[2]=spades 3, deck[13]=hearts A.
// shuffle은 i=length-1..1 에 대해 j=rng.nextInt(i+1)로 result[i]↔result[j]를 교환한다.
// 분배는 deal(shuffled, 2, 1)이므로 a=shuffled[0], b=shuffled[1].

/** 항상 같은 값을 돌려주는 rng. */
const constRng = (value: number): RandomSource => ({ nextInt: () => value });

/** nextInt(m) → m-1 (=i): 모든 교환이 자기 자신과의 no-op → 셔플 결과는 항등(원래 순서 유지). */
const identityRng = (): RandomSource => ({ nextInt: (m) => m - 1 });

/**
 * 항등 rng와 거의 같지만 i=13(m=14)일 때만 j=1을 반환한다.
 * 그 결과 result[1]에 deck[13](hearts A)가 들어가 top2 = spades A, hearts A (같은 랭크) → draw.
 */
const drawRng = (): RandomSource => ({ nextInt: (m) => (m === 14 ? 1 : m - 1) });

describe("playHighCardRound", () => {
  it("A 승: top2 = spades A(14), spades 2(2) → 'first'", () => {
    const r = playHighCardRound(identityRng());
    expect(r.a).toEqual({ suit: "spades", rank: "A" });
    expect(r.b).toEqual({ suit: "spades", rank: "2" });
    expect(r.result).toBe("first");
  });

  it("B 승: top2 = spades 2(2), spades 3(3) → 'second'", () => {
    const r = playHighCardRound(constRng(0));
    expect(r.a).toEqual({ suit: "spades", rank: "2" });
    expect(r.b).toEqual({ suit: "spades", rank: "3" });
    expect(r.result).toBe("second");
  });

  it("무승부: 같은 랭크(spades A, hearts A) → 'draw'", () => {
    const r = playHighCardRound(drawRng());
    expect(r.a).toEqual({ suit: "spades", rank: "A" });
    expect(r.b).toEqual({ suit: "hearts", rank: "A" });
    expect(r.a.rank).toBe(r.b.rank);
    expect(r.result).toBe("draw");
  });

  it("결정성: 동일 rng 시퀀스 → 동일 결과", () => {
    expect(playHighCardRound(constRng(0))).toEqual(playHighCardRound(constRng(0)));
    expect(playHighCardRound(identityRng())).toEqual(playHighCardRound(identityRng()));
  });

  it("불변: 한 판 진행 후에도 createDeck()는 동일한 정렬 덱을 반환한다(공유 상태 미변형)", () => {
    const before = createDeck();
    playHighCardRound(constRng(0));
    expect(createDeck()).toEqual(before);
    expect(before[0]).toEqual({ suit: "spades", rank: "A" });
  });
});
