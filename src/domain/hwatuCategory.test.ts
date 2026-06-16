import { describe, it, expect } from "vitest";
import { createHwatuDeck, type HwatuCard } from "./hwatu";
import {
  classifyHwatuCard,
  countHwatuByCategory,
  type HwatuCategory,
} from "./hwatuCategory";

describe("classifyHwatuCard - 화투 카드 광/열끗/띠/피 분류", () => {
  it("덱 전체(48장)의 분류별 개수가 광=5/열끗=9/띠=10/피=24 와 일치한다", () => {
    const counts: Record<HwatuCategory, number> = {
      광: 0,
      열끗: 0,
      띠: 0,
      피: 0,
    };
    for (const card of createHwatuDeck()) {
      counts[classifyHwatuCard(card)] += 1;
    }
    expect(counts).toEqual({ 광: 5, 열끗: 9, 띠: 10, 피: 24 });
    expect(counts.광 + counts.열끗 + counts.띠 + counts.피).toBe(48);
  });

  it("대표 카드의 분류가 정확하다", () => {
    expect(classifyHwatuCard({ month: 1, index: 0 })).toBe("광");
    expect(classifyHwatuCard({ month: 12, index: 2 })).toBe("띠");
    expect(classifyHwatuCard({ month: 11, index: 1 })).toBe("피");
    expect(classifyHwatuCard({ month: 8, index: 1 })).toBe("열끗");
  });

  it("유효하지 않은 카드면 throw 한다", () => {
    expect(() => classifyHwatuCard({ month: 13, index: 0 })).toThrow();
    expect(() => classifyHwatuCard({ month: 1, index: 9 })).toThrow();
  });

  it("입력 카드를 변형하지 않는다(불변)", () => {
    const card: HwatuCard = { month: 8, index: 1 };
    classifyHwatuCard(card);
    expect(card).toEqual({ month: 8, index: 1 });
  });
});

describe("countHwatuByCategory - 분류별 집계", () => {
  it("빈 배열이면 모두 0(네 키 모두 포함)", () => {
    expect(countHwatuByCategory([])).toEqual({ 광: 0, 열끗: 0, 띠: 0, 피: 0 });
  });

  it("덱 전체를 집계하면 광=5/열끗=9/띠=10/피=24", () => {
    expect(countHwatuByCategory(createHwatuDeck())).toEqual({
      광: 5,
      열끗: 9,
      띠: 10,
      피: 24,
    });
  });

  it("일부 카드를 집계하면 항상 네 키를 모두 포함한다(0 포함)", () => {
    const cards: HwatuCard[] = [
      { month: 1, index: 0 }, // 광
      { month: 1, index: 1 }, // 띠
      { month: 1, index: 2 }, // 피
    ];
    expect(countHwatuByCategory(cards)).toEqual({
      광: 1,
      열끗: 0,
      띠: 1,
      피: 1,
    });
  });

  it("유효하지 않은 카드가 섞이면 throw 한다", () => {
    expect(() =>
      countHwatuByCategory([{ month: 1, index: 0 }, { month: 13, index: 0 }]),
    ).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const cards: HwatuCard[] = [
      { month: 1, index: 0 },
      { month: 8, index: 1 },
    ];
    const snapshot = JSON.parse(JSON.stringify(cards));
    countHwatuByCategory(cards);
    expect(cards).toEqual(snapshot);
  });
});
