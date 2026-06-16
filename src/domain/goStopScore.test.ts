import { describe, it, expect } from "vitest";
import type { HwatuCard } from "./hwatu";
import { isBiGwang, scoreGwang } from "./goStopScore";

// 표준 분류표상 광(光) 5장: 1·3·8·11·12월의 index 0. 12월 광이 비광(雨光).
const GWANG_1: HwatuCard = { month: 1, index: 0 };
const GWANG_3: HwatuCard = { month: 3, index: 0 };
const GWANG_8: HwatuCard = { month: 8, index: 0 };
const GWANG_11: HwatuCard = { month: 11, index: 0 };
const BI_GWANG: HwatuCard = { month: 12, index: 0 };

// 광이 아닌 대표 카드(열끗/띠/피)
const NON_GWANG: HwatuCard[] = [
  { month: 8, index: 1 }, // 열끗
  { month: 1, index: 1 }, // 띠
  { month: 11, index: 1 }, // 피
];

describe("scoreGwang - 고스톱 광(光) 점수", () => {
  it("빈 배열은 0점", () => {
    expect(scoreGwang([])).toBe(0);
  });

  it("광 0~2장은 0점", () => {
    expect(scoreGwang(NON_GWANG)).toBe(0);
    expect(scoreGwang([GWANG_1])).toBe(0);
    expect(scoreGwang([GWANG_1, GWANG_3])).toBe(0);
    expect(scoreGwang([BI_GWANG, GWANG_1])).toBe(0);
  });

  it("3광(비광 미포함)은 3점", () => {
    expect(scoreGwang([GWANG_1, GWANG_3, GWANG_8])).toBe(3);
  });

  it("3광(비광 포함)은 2점", () => {
    expect(scoreGwang([GWANG_1, GWANG_3, BI_GWANG])).toBe(2);
  });

  it("4광은 4점(비광 포함 여부 무관)", () => {
    expect(scoreGwang([GWANG_1, GWANG_3, GWANG_8, GWANG_11])).toBe(4);
    expect(scoreGwang([GWANG_1, GWANG_3, GWANG_8, BI_GWANG])).toBe(4);
  });

  it("5광은 15점", () => {
    expect(scoreGwang([GWANG_1, GWANG_3, GWANG_8, GWANG_11, BI_GWANG])).toBe(15);
  });

  it("광 외 카드(열끗/띠/피)가 섞여도 무시한다", () => {
    expect(scoreGwang([GWANG_1, GWANG_3, GWANG_8, ...NON_GWANG])).toBe(3);
    expect(scoreGwang([...NON_GWANG, GWANG_1, BI_GWANG, GWANG_8])).toBe(2);
  });

  it("유효하지 않은 카드가 섞이면 throw 한다", () => {
    expect(() => scoreGwang([GWANG_1, { month: 13, index: 0 }])).toThrow();
    expect(() => scoreGwang([{ month: 1, index: 9 }])).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const cards: HwatuCard[] = [
      { month: 1, index: 0 },
      { month: 3, index: 0 },
      { month: 12, index: 0 },
    ];
    const snapshot = cards.map((c) => ({ ...c }));
    scoreGwang(cards);
    expect(cards).toEqual(snapshot);
  });
});

describe("isBiGwang - 비광(雨光) 판정", () => {
  it("12월 광(month 12, index 0)만 비광이다", () => {
    expect(isBiGwang(BI_GWANG)).toBe(true);
  });

  it("다른 광 카드는 비광이 아니다", () => {
    expect(isBiGwang(GWANG_1)).toBe(false);
    expect(isBiGwang(GWANG_11)).toBe(false);
  });

  it("광이 아닌 카드는 비광이 아니다", () => {
    expect(isBiGwang({ month: 12, index: 2 })).toBe(false); // 12월 띠
    expect(isBiGwang({ month: 8, index: 1 })).toBe(false); // 열끗
  });

  it("유효하지 않은 카드는 throw 한다", () => {
    expect(() => isBiGwang({ month: 0, index: 0 })).toThrow();
  });
});
