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

  it("합이 10의 배수면 0끗(망통) (1월+9월 → 0끗)", () => {
    expect(evaluateSutdaHand(card(1), card(9))).toEqual<SutdaHandRank>({
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
