import { describe, it, expect } from "vitest";
import { HwatuCard } from "./hwatu";
import { applyGoStopBak } from "./goStopBak";

// 표준 분류표 기준 광(光) 카드 — index 0 의 광들(앞 3장은 비광 아님).
const GWANG: HwatuCard[] = [
  { month: 1, index: 0 },
  { month: 3, index: 0 },
  { month: 8, index: 0 },
];

// 표준 분류표 기준 피(皮) 카드 24장(중복 없음).
const PI: HwatuCard[] = [
  { month: 1, index: 2 },
  { month: 1, index: 3 },
  { month: 2, index: 2 },
  { month: 2, index: 3 },
  { month: 3, index: 2 },
  { month: 3, index: 3 },
  { month: 4, index: 2 },
  { month: 4, index: 3 },
  { month: 5, index: 2 },
  { month: 5, index: 3 },
  { month: 6, index: 2 },
  { month: 6, index: 3 },
  { month: 7, index: 2 },
  { month: 7, index: 3 },
  { month: 8, index: 2 },
  { month: 8, index: 3 },
  { month: 9, index: 2 },
  { month: 9, index: 3 },
  { month: 10, index: 2 },
  { month: 10, index: 3 },
  { month: 11, index: 1 },
  { month: 11, index: 2 },
  { month: 11, index: 3 },
  { month: 12, index: 3 },
];

/** 피 카드 n장(앞에서부터). */
function pi(n: number): HwatuCard[] {
  return PI.slice(0, n);
}

// 홍단(1·2·3월 띠) 3장 → 띠 점수 3점, 광·피 점수 없음.
const HONGDAN: HwatuCard[] = [
  { month: 1, index: 1 },
  { month: 2, index: 1 },
  { month: 3, index: 1 },
];

describe("applyGoStopBak", () => {
  it("박 없음(승자 광/피 점수 없음) → multiplier 1, total = base", () => {
    // 승자: 홍단 3장(base 3, 광/피 점수 없음)
    const result = applyGoStopBak(HONGDAN, pi(3));
    expect(result.base).toBe(3);
    expect(result.flags).toEqual({ gwangbak: false, pibak: false });
    expect(result.multiplier).toBe(1);
    expect(result.total).toBe(3);
  });

  it("광박만 성립(승자 광 3장, 패자 광 0장) → ×2", () => {
    // 승자: 광 3장 → scoreGwang 3, base 3. 패자: 피만(광 0장)
    const result = applyGoStopBak(GWANG, pi(5));
    expect(result.base).toBe(3);
    expect(result.flags).toEqual({ gwangbak: true, pibak: false });
    expect(result.multiplier).toBe(2);
    expect(result.total).toBe(6);
  });

  it("피박만 성립(승자 피 10장, 패자 피 7장 미만) → ×2", () => {
    // 승자: 피 10장 → scorePi 1, base 1. 패자: 피 6장(<7)
    const result = applyGoStopBak(pi(10), pi(6));
    expect(result.base).toBe(1);
    expect(result.flags).toEqual({ gwangbak: false, pibak: true });
    expect(result.multiplier).toBe(2);
    expect(result.total).toBe(2);
  });

  it("광박+피박 동시 → ×4", () => {
    // 승자: 광 3장 + 피 10장 → scoreGwang 3 + scorePi 1, base 4.
    const winner = [...GWANG, ...pi(10)];
    // 패자: 광 0장, 피 0장
    const result = applyGoStopBak(winner, HONGDAN);
    expect(result.base).toBe(4);
    expect(result.flags).toEqual({ gwangbak: true, pibak: true });
    expect(result.multiplier).toBe(4);
    expect(result.total).toBe(16);
  });

  it("패자가 광·피를 충분히 먹으면 박이 깨진다(광 1장+ / 피 7장+) → 해당 박 false", () => {
    const winner = [...GWANG, ...pi(10)];
    // 패자: 광 1장 + 피 7장 → 광박/피박 모두 false
    const loser = [{ month: 11, index: 0 } as HwatuCard, ...pi(7)];
    const result = applyGoStopBak(winner, loser);
    expect(result.base).toBe(4);
    expect(result.flags).toEqual({ gwangbak: false, pibak: false });
    expect(result.multiplier).toBe(1);
    expect(result.total).toBe(4);
  });

  it("피박 경계: 패자 피가 정확히 7장이면 피박 false, 6장이면 true", () => {
    const sevenLoser = applyGoStopBak(pi(10), pi(7));
    expect(sevenLoser.flags.pibak).toBe(false);

    const sixLoser = applyGoStopBak(pi(10), pi(6));
    expect(sixLoser.flags.pibak).toBe(true);
  });

  it("승자 광 2장(광 점수 0)이면 패자 광 0장이라도 광박 false", () => {
    const winner: HwatuCard[] = [
      { month: 1, index: 0 },
      { month: 3, index: 0 },
    ];
    const result = applyGoStopBak(winner, pi(3));
    expect(result.flags.gwangbak).toBe(false);
  });

  it("base 0이면 박이 떠도 total 0(0 × 배수 = 0)", () => {
    // 승자가 점수 카드가 없으면 base 0, 박 플래그도 false → total 0
    const result = applyGoStopBak(HONGDAN.slice(0, 1), []);
    expect(result.base).toBe(0);
    expect(result.total).toBe(0);
  });

  it("빈 배열 경계: 양쪽 모두 빈 배열 → base 0, 박 없음, total 0", () => {
    const result = applyGoStopBak([], []);
    expect(result).toEqual({
      base: 0,
      multiplier: 1,
      flags: { gwangbak: false, pibak: false },
      total: 0,
    });
  });

  it("입력 배열/원소를 변형하지 않는다", () => {
    const winner = [...GWANG, ...pi(10)];
    const loser = [...pi(5)];
    const winnerCopy = winner.map((c) => ({ ...c }));
    const loserCopy = loser.map((c) => ({ ...c }));

    applyGoStopBak(winner, loser);

    expect(winner).toEqual(winnerCopy);
    expect(loser).toEqual(loserCopy);
  });

  it("유효하지 않은 카드는 위임 함수에서 throw", () => {
    const bad: HwatuCard[] = [{ month: 13, index: 0 }];
    expect(() => applyGoStopBak(bad, [])).toThrow();
    expect(() => applyGoStopBak([], bad)).toThrow();
  });
});
