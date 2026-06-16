import { describe, it, expect } from "vitest";
import type { HwatuCard } from "./hwatu";
import { classifyDan, scoreTti } from "./goStopTti";

// 표준 분류표상 띠 카드: 1~7·9·10월은 index 1, 12월은 index 2.
const TTI = (month: number): HwatuCard => ({
  month,
  index: month === 12 ? 2 : 1,
});

// 단(段) 구성 띠
const HONGDAN = [TTI(1), TTI(2), TTI(3)]; // 홍단: 1·2·3월
const CHEONGDAN = [TTI(6), TTI(9), TTI(10)]; // 청단: 6·9·10월
const CHODAN = [TTI(4), TTI(5), TTI(7)]; // 초단: 4·5·7월

// 띠가 아닌 대표 카드(광/열끗/피)
const NON_TTI: HwatuCard[] = [
  { month: 1, index: 0 }, // 광
  { month: 8, index: 1 }, // 열끗
  { month: 11, index: 1 }, // 피
];

describe("scoreTti - 고스톱 띠(단) 점수", () => {
  it("빈 배열은 0점", () => {
    expect(scoreTti([])).toBe(0);
  });

  it("띠 4장 이하(단 미완성)는 0점", () => {
    expect(scoreTti([TTI(1), TTI(2), TTI(4), TTI(5)])).toBe(0);
  });

  it("홍단 3장 = 3점", () => {
    expect(scoreTti(HONGDAN)).toBe(3);
  });

  it("청단 3장 = 3점", () => {
    expect(scoreTti(CHEONGDAN)).toBe(3);
  });

  it("초단 3장 = 3점", () => {
    expect(scoreTti(CHODAN)).toBe(3);
  });

  it("단 2장만(홍단 2장)은 0점(단 보너스 없음)", () => {
    expect(scoreTti([TTI(1), TTI(2)])).toBe(0);
  });

  it("띠 장수 보너스: 5장=1점, 6장=2점, 7장=3점", () => {
    // 단을 완성하지 않도록 월을 고른다: {1,2,4,6,9,12} 는 어느 단도 미완성.
    expect(scoreTti([TTI(1), TTI(2), TTI(4), TTI(6), TTI(9)])).toBe(1);
    expect(scoreTti([TTI(1), TTI(2), TTI(4), TTI(6), TTI(9), TTI(12)])).toBe(2);
    // 7장째는 1월 띠 중복(월 추가 없음 → 단 여전히 미완성), 장수만 +1
    expect(
      scoreTti([TTI(1), TTI(2), TTI(4), TTI(6), TTI(9), TTI(12), TTI(1)]),
    ).toBe(3);
  });

  it("단 + 장수 합산: 홍단 3장 포함 띠 5장 = 4점", () => {
    // 홍단(1,2,3) + 단 미완성 띠 2장(4,12) = 띠 5장
    expect(scoreTti([...HONGDAN, TTI(4), TTI(12)])).toBe(4);
  });

  it("여러 단 + 장수 합산: 홍단·청단 6장 = 3+3+2 = 8점", () => {
    // 홍단(1,2,3) + 청단(6,9,10) = 띠 6장 → 단 6점 + 장수 2점
    expect(scoreTti([...HONGDAN, ...CHEONGDAN])).toBe(8);
  });

  it("띠 아닌 카드(광/열끗/피)가 섞여도 무시한다", () => {
    expect(scoreTti([...HONGDAN, ...NON_TTI])).toBe(3);
  });

  it("같은 카드 중복은 장수에 그대로 합산된다", () => {
    // 1월 띠 5장(중복) → 단 미완성, 장수만 1점
    const dup = [TTI(1), TTI(1), TTI(1), TTI(1), TTI(1)];
    expect(scoreTti(dup)).toBe(1);
  });

  it("유효하지 않은 카드가 섞이면 throw 한다", () => {
    expect(() => scoreTti([TTI(1), { month: 13, index: 1 }])).toThrow();
    expect(() => scoreTti([{ month: 1, index: 9 }])).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const cards: HwatuCard[] = [...HONGDAN, TTI(12)];
    const snapshot = cards.map((c) => ({ ...c }));
    scoreTti(cards);
    expect(cards).toEqual(snapshot);
  });
});

describe("classifyDan - 띠 카드의 단(段) 판정", () => {
  it("1월 띠 → 홍단", () => {
    expect(classifyDan(TTI(1))).toBe("홍단");
  });

  it("9월 띠 → 청단", () => {
    expect(classifyDan(TTI(9))).toBe("청단");
  });

  it("7월 띠 → 초단", () => {
    expect(classifyDan(TTI(7))).toBe("초단");
  });

  it("12월 띠 → null(어느 단에도 속하지 않음)", () => {
    expect(classifyDan(TTI(12))).toBeNull();
  });

  it("띠가 아닌 카드 → null", () => {
    expect(classifyDan({ month: 1, index: 0 })).toBeNull(); // 광
    expect(classifyDan({ month: 8, index: 1 })).toBeNull(); // 열끗
    expect(classifyDan({ month: 11, index: 1 })).toBeNull(); // 피
  });

  it("유효하지 않은 카드는 throw 한다", () => {
    expect(() => classifyDan({ month: 0, index: 0 })).toThrow();
  });
});
