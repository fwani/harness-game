import { describe, it, expect } from "vitest";
import type { HwatuCard } from "./hwatu";
import { isGodoriCard, scoreYeol } from "./goStopYeol";

// 표준 분류표상 열끗 카드: 8·12월은 index 1, 그 외(2·4·5·6·7·9·10월)는 index 0.
const YEOL = (month: number): HwatuCard => ({
  month,
  index: month === 8 || month === 12 ? 1 : 0,
});

// 고도리: 2·4·8월 열끗
const GODORI = [YEOL(2), YEOL(4), YEOL(8)];

// 열끗이 아닌 대표 카드(광/띠/피)
const NON_YEOL: HwatuCard[] = [
  { month: 1, index: 0 }, // 광
  { month: 1, index: 1 }, // 띠
  { month: 11, index: 1 }, // 피
];

describe("scoreYeol - 고스톱 열끗 점수", () => {
  it("빈 배열은 0점", () => {
    expect(scoreYeol([])).toBe(0);
  });

  it("열끗 4장 이하는 0점", () => {
    expect(scoreYeol([YEOL(5), YEOL(6), YEOL(7), YEOL(9)])).toBe(0);
  });

  it("열끗 장수 보너스: 5장=1점, 6장=2점, 7장=3점", () => {
    // 고도리(2·4·8)를 완성하지 않도록 월을 고른다: {5,6,7,9,10,12} 는 고도리 미완성.
    expect(scoreYeol([YEOL(5), YEOL(6), YEOL(7), YEOL(9), YEOL(10)])).toBe(1);
    expect(
      scoreYeol([YEOL(5), YEOL(6), YEOL(7), YEOL(9), YEOL(10), YEOL(12)]),
    ).toBe(2);
    // 7장째는 5월 열끗 중복(월 추가 없음 → 고도리 여전히 미완성), 장수만 +1
    expect(
      scoreYeol([
        YEOL(5),
        YEOL(6),
        YEOL(7),
        YEOL(9),
        YEOL(10),
        YEOL(12),
        YEOL(5),
      ]),
    ).toBe(3);
  });

  it("고도리 3장만(열끗 3장) = 5점", () => {
    // 열끗 3장 → 장수 보너스 없음, 고도리 보너스만 5점
    expect(scoreYeol(GODORI)).toBe(5);
  });

  it("고도리 2장은 보너스 없음", () => {
    expect(scoreYeol([YEOL(2), YEOL(4)])).toBe(0);
  });

  it("장수 + 고도리 합산: 고도리 3장 포함 열끗 5장 = 6점", () => {
    // 고도리(2,4,8) + 열끗 2장(5,6) = 열끗 5장 → 장수 1점 + 고도리 5점
    expect(scoreYeol([...GODORI, YEOL(5), YEOL(6)])).toBe(6);
  });

  it("열끗 아닌 카드(광/띠/피)가 섞여도 무시한다", () => {
    expect(scoreYeol([...GODORI, ...NON_YEOL])).toBe(5);
  });

  it("같은 카드 중복은 장수에 그대로 합산된다", () => {
    // 5월 열끗 5장(중복) → 고도리 미완성, 장수만 1점
    const dup = [YEOL(5), YEOL(5), YEOL(5), YEOL(5), YEOL(5)];
    expect(scoreYeol(dup)).toBe(1);
  });

  it("유효하지 않은 카드가 섞이면 throw 한다", () => {
    expect(() => scoreYeol([YEOL(2), { month: 13, index: 0 }])).toThrow();
    expect(() => scoreYeol([{ month: 2, index: 9 }])).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const cards: HwatuCard[] = [...GODORI, YEOL(5)];
    const snapshot = cards.map((c) => ({ ...c }));
    scoreYeol(cards);
    expect(cards).toEqual(snapshot);
  });
});

describe("isGodoriCard - 고도리 구성패 판정", () => {
  it("2월 열끗 → true", () => {
    expect(isGodoriCard(YEOL(2))).toBe(true);
  });

  it("8월 열끗 → true", () => {
    expect(isGodoriCard(YEOL(8))).toBe(true);
  });

  it("12월 열끗 → false(고도리 월 아님)", () => {
    expect(isGodoriCard(YEOL(12))).toBe(false);
  });

  it("열끗이 아닌 카드 → false", () => {
    expect(isGodoriCard({ month: 1, index: 0 })).toBe(false); // 광
    expect(isGodoriCard({ month: 1, index: 1 })).toBe(false); // 띠
    expect(isGodoriCard({ month: 11, index: 1 })).toBe(false); // 피
  });

  it("유효하지 않은 카드는 throw 한다", () => {
    expect(() => isGodoriCard({ month: 0, index: 0 })).toThrow();
  });
});
