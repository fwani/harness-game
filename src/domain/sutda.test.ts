import { describe, it, expect } from "vitest";
import {
  evaluateSutdaHand,
  compareSutdaHands,
  type SutdaHandRank,
} from "./sutda";
import type { HwatuCard } from "./hwatu";

/** month/index로 화투 카드를 만드는 테스트 헬퍼. */
function card(month: number, index = 0): HwatuCard {
  return { month, index };
}

describe("evaluateSutdaHand - 땡/끗 판정", () => {
  it("같은 월이면 땡, value=month (10·10 → 장땡)", () => {
    expect(evaluateSutdaHand(card(10, 0), card(10, 1))).toEqual<SutdaHandRank>({
      category: "ddaeng",
      value: 10,
    });
  });

  it("같은 월이면 땡, 1땡(가장 약한 땡)", () => {
    expect(evaluateSutdaHand(card(1, 0), card(1, 2))).toEqual<SutdaHandRank>({
      category: "ddaeng",
      value: 1,
    });
  });

  it("다른 월이면 끗, value=(합 mod 10) (4월+5월 → 9끗 갑오)", () => {
    expect(evaluateSutdaHand(card(4), card(5))).toEqual<SutdaHandRank>({
      category: "kkut",
      value: 9,
    });
  });

  it("합이 10의 배수면 0끗(망통) (2월+8월 → 0끗, 특수패 아님)", () => {
    expect(evaluateSutdaHand(card(2), card(8))).toEqual<SutdaHandRank>({
      category: "kkut",
      value: 0,
    });
  });

  it("끗 값은 (a.month + b.month) % 10 이다 (7월+8월 → 5끗)", () => {
    expect(evaluateSutdaHand(card(7), card(8)).value).toBe(5);
  });

  it("판정은 index를 무시하고 month만 본다", () => {
    expect(evaluateSutdaHand(card(3, 0), card(3, 3)).category).toBe("ddaeng");
    expect(evaluateSutdaHand(card(2, 1), card(6, 2)).value).toBe(8);
  });

  it("입력 카드를 변형하지 않는다(불변)", () => {
    const a = card(4, 1);
    const b = card(5, 2);
    evaluateSutdaHand(a, b);
    expect(a).toEqual({ month: 4, index: 1 });
    expect(b).toEqual({ month: 5, index: 2 });
  });

  it("month가 1~10 밖이면 throw (0, 11, 12)", () => {
    expect(() => evaluateSutdaHand(card(0), card(5))).toThrow();
    expect(() => evaluateSutdaHand(card(5), card(11))).toThrow();
    expect(() => evaluateSutdaHand(card(12), card(3))).toThrow();
  });

  it("month가 정수가 아니거나 유한수가 아니면 throw", () => {
    expect(() => evaluateSutdaHand(card(4.5), card(5))).toThrow();
    expect(() => evaluateSutdaHand(card(NaN), card(5))).toThrow();
  });
});

describe("compareSutdaHands - 우열 비교", () => {
  const ddaeng = (value: number): SutdaHandRank => ({ category: "ddaeng", value });
  const kkut = (value: number): SutdaHandRank => ({ category: "kkut", value });

  it("땡은 모든 끗보다 강하다(가장 약한 1땡 > 가장 강한 9끗)", () => {
    expect(compareSutdaHands(ddaeng(1), kkut(9))).toBeGreaterThan(0);
    expect(compareSutdaHands(kkut(9), ddaeng(1))).toBeLessThan(0);
  });

  it("더 큰 땡이 더 작은 땡보다 강하다(10땡 > 1땡)", () => {
    expect(compareSutdaHands(ddaeng(10), ddaeng(1))).toBeGreaterThan(0);
    expect(compareSutdaHands(ddaeng(1), ddaeng(10))).toBeLessThan(0);
  });

  it("더 큰 끗이 더 작은 끗보다 강하다(9끗 > 0끗)", () => {
    expect(compareSutdaHands(kkut(9), kkut(0))).toBeGreaterThan(0);
    expect(compareSutdaHands(kkut(0), kkut(9))).toBeLessThan(0);
  });

  it("완전 동급이면 0 (같은 땡, 같은 끗)", () => {
    expect(compareSutdaHands(ddaeng(7), ddaeng(7))).toBe(0);
    expect(compareSutdaHands(kkut(3), kkut(3))).toBe(0);
  });

  it("evaluateSutdaHand 결과로 끝수를 가린다(장땡이 갑오를 이긴다)", () => {
    const jangttaeng = evaluateSutdaHand(card(10, 0), card(10, 1));
    const gabo = evaluateSutdaHand(card(4), card(5));
    expect(compareSutdaHands(jangttaeng, gabo)).toBeGreaterThan(0);
  });
});

describe("evaluateSutdaHand - 특수패(멍텅구리 끗) 판정", () => {
  // [이름, [월a, 월b], 내부 강도]
  const SPECIALS: ReadonlyArray<readonly [string, readonly [number, number], number]> = [
    ["알리", [1, 2], 6],
    ["독사", [1, 4], 5],
    ["구삥", [1, 9], 4],
    ["장삥", [1, 10], 3],
    ["장사", [4, 10], 2],
    ["세륙", [4, 6], 1],
  ];

  it.each(SPECIALS)("%s(%j)는 category=special, value=%i (월 순서 무관)", (_name, [m1, m2], strength) => {
    expect(evaluateSutdaHand(card(m1), card(m2))).toEqual<SutdaHandRank>({
      category: "special",
      value: strength,
    });
    // 월 순서를 뒤집어도 동일
    expect(evaluateSutdaHand(card(m2), card(m1))).toEqual<SutdaHandRank>({
      category: "special",
      value: strength,
    });
  });

  it("특수패는 index를 무시하고 month만 본다", () => {
    expect(evaluateSutdaHand(card(1, 0), card(2, 3))).toEqual<SutdaHandRank>({
      category: "special",
      value: 6,
    });
  });

  it("특수패 판정 시 입력 카드를 변형하지 않는다(불변)", () => {
    const a = card(4, 1);
    const b = card(6, 2);
    evaluateSutdaHand(a, b);
    expect(a).toEqual({ month: 4, index: 1 });
    expect(b).toEqual({ month: 6, index: 2 });
  });

  it("특수패가 아닌 끗 조합은 기존대로 kkut, value=(a+b)%10 (회귀 방지)", () => {
    // 2·8(망통), 3·5(8끗), 7·8(5끗) — 특수패 테이블에 없는 조합
    expect(evaluateSutdaHand(card(2), card(8))).toEqual<SutdaHandRank>({ category: "kkut", value: 0 });
    expect(evaluateSutdaHand(card(3), card(5))).toEqual<SutdaHandRank>({ category: "kkut", value: 8 });
    expect(evaluateSutdaHand(card(7), card(8))).toEqual<SutdaHandRank>({ category: "kkut", value: 5 });
  });

  it("같은 월은 특수패보다 우선해 여전히 ddaeng이다 (회귀 방지)", () => {
    expect(evaluateSutdaHand(card(1, 0), card(1, 1)).category).toBe("ddaeng");
    expect(evaluateSutdaHand(card(4, 0), card(4, 1)).category).toBe("ddaeng");
  });
});

describe("compareSutdaHands - 위계(땡 > 특수패 > 끗) 및 특수패 내부 우열", () => {
  it("특수패 내부 우열: 알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙", () => {
    const ali = evaluateSutdaHand(card(1), card(2));
    const doksa = evaluateSutdaHand(card(1), card(4));
    const gubbing = evaluateSutdaHand(card(1), card(9));
    const jangbbing = evaluateSutdaHand(card(1), card(10));
    const jangsa = evaluateSutdaHand(card(4), card(10));
    const seryuk = evaluateSutdaHand(card(4), card(6));
    expect(compareSutdaHands(ali, doksa)).toBeGreaterThan(0);
    expect(compareSutdaHands(doksa, gubbing)).toBeGreaterThan(0);
    expect(compareSutdaHands(gubbing, jangbbing)).toBeGreaterThan(0);
    expect(compareSutdaHands(jangbbing, jangsa)).toBeGreaterThan(0);
    expect(compareSutdaHands(jangsa, seryuk)).toBeGreaterThan(0);
  });

  it("가장 약한 땡(1땡)도 가장 강한 특수패(알리)보다 강하다", () => {
    const ddaeng1 = evaluateSutdaHand(card(1, 0), card(1, 1));
    const ali = evaluateSutdaHand(card(1), card(2));
    expect(compareSutdaHands(ddaeng1, ali)).toBeGreaterThan(0);
    expect(compareSutdaHands(ali, ddaeng1)).toBeLessThan(0);
  });

  it("가장 약한 특수패(세륙)도 가장 강한 끗(9끗)보다 강하다", () => {
    const seryuk = evaluateSutdaHand(card(4), card(6));
    const gabo = evaluateSutdaHand(card(4), card(5)); // 9끗
    expect(compareSutdaHands(seryuk, gabo)).toBeGreaterThan(0);
    expect(compareSutdaHands(gabo, seryuk)).toBeLessThan(0);
  });

  it("같은 특수패끼리는 동급(0)이다", () => {
    const ali1 = evaluateSutdaHand(card(1, 0), card(2, 0));
    const ali2 = evaluateSutdaHand(card(1, 1), card(2, 1));
    expect(compareSutdaHands(ali1, ali2)).toBe(0);
  });
});
