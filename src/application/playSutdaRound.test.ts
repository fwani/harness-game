import { describe, expect, it } from "vitest";
import { createHwatuDeck, type HwatuCard } from "../domain/hwatu";
import { playSutdaRound } from "./playSutdaRound";
import type { RandomSource } from "./dealCards";

// 섯다 덱(40장): createHwatuDeck()(48장)에서 month 1~10만 남긴 것. month 오름차순, 그 안 index 오름차순.
// shuffle은 i=39..1에 대해 j=rng.nextInt(i+1)로 work[i]↔work[j]를 교환한다.
// deal(shuffled, 2, 2)는 라운드로빈: A = shuffled[0]·shuffled[2], B = shuffled[1]·shuffled[3].
const sutdaDeck = (): HwatuCard[] =>
  createHwatuDeck().filter((c) => c.month >= 1 && c.month <= 10);

const C = (month: number, index: number): HwatuCard => ({ month, index });
const sameCard = (a: HwatuCard, b: HwatuCard): boolean =>
  a.month === b.month && a.index === b.index;

/** 항등 셔플: nextInt(m) → m-1 이면 모든 교환이 no-op → 덱 순서 유지(createSutdaDeck 순서). */
const identityRng = (): RandomSource => ({ nextInt: (m) => m - 1 });

/**
 * shuffle(sutdaDeck(), rng)가 정확히 target(40장 순열)을 내도록 하는 결정적 rng 스텁.
 * 항등 덱에서 시작해 각 i 단계에서 target[i]의 현재 위치 j를 nextInt(i+1)로 돌려주면,
 * i 단계 이후 위치 i는 더 건드려지지 않으므로 target[i]가 그대로 고정된다.
 */
const rngForTarget = (target: HwatuCard[]): RandomSource => {
  const work = sutdaDeck();
  const byMax = new Map<number, number>();
  for (let i = work.length - 1; i >= 1; i--) {
    let j = -1;
    for (let k = 0; k <= i; k++) {
      if (sameCard(work[k]!, target[i]!)) {
        j = k;
        break;
      }
    }
    if (j < 0) throw new Error(`target[${i}] (${target[i]!.month}-${target[i]!.index})가 덱에 없다`);
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

/** 앞 4장(= A0, B0, A1, B1 순)을 지정하고 나머지는 sutdaDeck 순서로 채운 40장 순열을 만든다. */
const targetWithFirst4 = (
  a0: HwatuCard,
  b0: HwatuCard,
  a1: HwatuCard,
  b1: HwatuCard,
): HwatuCard[] => {
  const first = [a0, b0, a1, b1];
  const rest = sutdaDeck().filter((c) => !first.some((f) => sameCard(f, c)));
  return [...first, ...rest];
};

describe("playSutdaRound", () => {
  it("셔플·분배가 기존 dealCards 규약과 일치한다(A=shuffled[0,2], B=shuffled[1,3])", () => {
    const deck = sutdaDeck();
    const result = playSutdaRound(identityRng());

    expect(result.a).toEqual([deck[0], deck[2]]);
    expect(result.b).toEqual([deck[1], deck[3]]);
  });

  it("결정적 rng로 고정된 손패와 등급이 나온다", () => {
    // 항등 셔플: A=[{1,0},{1,2}](1땡), B=[{1,1},{1,3}](1땡).
    const result = playSutdaRound(identityRng());

    expect(result.a).toEqual([C(1, 0), C(1, 2)]);
    expect(result.b).toEqual([C(1, 1), C(1, 3)]);
    expect(result.aRank).toEqual({ category: "ddaeng", value: 1 });
    expect(result.bRank).toEqual({ category: "ddaeng", value: 1 });
  });

  it("동급(같은 1땡)이면 draw", () => {
    const result = playSutdaRound(identityRng());
    expect(result.result).toBe("draw");
  });

  it("땡 > 끗: A가 땡이면 A 승", () => {
    // A0={3,0}, A1={3,1} → 3땡. B0={1,0}, B1={2,0} → (1+2)%10=3 끗.
    const target = targetWithFirst4(C(3, 0), C(1, 0), C(3, 1), C(2, 0));
    const result = playSutdaRound(rngForTarget(target));

    expect(result.a).toEqual([C(3, 0), C(3, 1)]);
    expect(result.b).toEqual([C(1, 0), C(2, 0)]);
    expect(result.aRank).toEqual({ category: "ddaeng", value: 3 });
    expect(result.bRank).toEqual({ category: "kkut", value: 3 });
    expect(result.result).toBe("a");
  });

  it("땡 > 끗: B가 땡이면 B 승", () => {
    // A0={1,0}, A1={2,0} → (1+2)%10=3 끗. B0={3,0}, B1={3,1} → 3땡.
    const target = targetWithFirst4(C(1, 0), C(3, 0), C(2, 0), C(3, 1));
    const result = playSutdaRound(rngForTarget(target));

    expect(result.aRank).toEqual({ category: "kkut", value: 3 });
    expect(result.bRank).toEqual({ category: "ddaeng", value: 3 });
    expect(result.result).toBe("b");
  });

  it("같은 끗이면 value가 큰 쪽이 승", () => {
    // A0={3,0}, A1={6,0} → (3+6)%10=9 끗. B0={1,0}, B1={2,0} → 3 끗. A 승.
    const target = targetWithFirst4(C(3, 0), C(1, 0), C(6, 0), C(2, 0));
    const result = playSutdaRound(rngForTarget(target));

    expect(result.aRank).toEqual({ category: "kkut", value: 9 });
    expect(result.bRank).toEqual({ category: "kkut", value: 3 });
    expect(result.result).toBe("a");
  });

  it("같은 끗 value면 draw", () => {
    // A0={1,0}, A1={4,0} → 5 끗. B0={2,0}, B1={3,0} → 5 끗. draw.
    const target = targetWithFirst4(C(1, 0), C(2, 0), C(4, 0), C(3, 0));
    const result = playSutdaRound(rngForTarget(target));

    expect(result.aRank).toEqual({ category: "kkut", value: 5 });
    expect(result.bRank).toEqual({ category: "kkut", value: 5 });
    expect(result.result).toBe("draw");
  });

  it("같은 rng 시퀀스면 항상 동일 결과(결정적, rng만으로 결정)", () => {
    const r1 = playSutdaRound(identityRng());
    const r2 = playSutdaRound(identityRng());
    expect(r1).toEqual(r2);
  });

  it("섯다 덱은 month 1~10만 사용한다(11·12월 제외) — 분배된 모든 카드가 1~10", () => {
    const target = targetWithFirst4(C(3, 0), C(1, 0), C(6, 0), C(2, 0));
    const result = playSutdaRound(rngForTarget(target));
    for (const card of [...result.a, ...result.b]) {
      expect(card.month).toBeGreaterThanOrEqual(1);
      expect(card.month).toBeLessThanOrEqual(10);
    }
  });
});
