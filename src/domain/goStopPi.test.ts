import { describe, it, expect } from "vitest";
import type { HwatuCard } from "./hwatu";
import { scorePi } from "./goStopPi";

// 표준 분류표상 피 카드: 대부분의 월에서 index 2·3 이 피다(예외: 11월은 1·2·3, 12월은 3).
// 월 1~6 의 index 2·3 만 골라도 서로 다른 피 카드 12장을 만들 수 있다.
function distinctPi(n: number): HwatuCard[] {
  const cards: HwatuCard[] = [];
  for (let month = 1; cards.length < n && month <= 6; month++) {
    for (const index of [2, 3]) {
      if (cards.length >= n) break;
      cards.push({ month, index });
    }
  }
  if (cards.length < n) {
    throw new Error(`distinctPi: ${n}장을 만들 수 없음`);
  }
  return cards;
}

// 피가 아닌 대표 카드(광/열끗/띠)
const NON_PI: HwatuCard[] = [
  { month: 1, index: 0 }, // 광
  { month: 2, index: 0 }, // 열끗
  { month: 1, index: 1 }, // 띠
];

describe("scorePi - 고스톱 피(皮) 점수", () => {
  it("빈 배열은 0점", () => {
    expect(scorePi([])).toBe(0);
  });

  it("피 9장 이하는 0점", () => {
    expect(scorePi(distinctPi(9))).toBe(0);
  });

  it("피 장수 보너스: 10장=1점, 11장=2점, 12장=3점", () => {
    expect(scorePi(distinctPi(10))).toBe(1);
    expect(scorePi(distinctPi(11))).toBe(2);
    expect(scorePi(distinctPi(12))).toBe(3);
  });

  it("피가 아닌 카드(광/열끗/띠)가 섞여도 피만 집계한다", () => {
    expect(scorePi([...distinctPi(10), ...NON_PI])).toBe(1);
  });

  it("광/열끗/띠만 있고 피 0장이면 0점", () => {
    expect(scorePi(NON_PI)).toBe(0);
  });

  it("같은 피 카드 중복은 장수에 그대로 합산된다(동일 피 10장 = 1점)", () => {
    const dup: HwatuCard[] = Array.from({ length: 10 }, () => ({
      month: 1,
      index: 2,
    }));
    expect(scorePi(dup)).toBe(1);
  });

  it("유효하지 않은 카드가 섞이면 throw 한다", () => {
    expect(() => scorePi([...distinctPi(10), { month: 13, index: 0 }])).toThrow();
    expect(() => scorePi([{ month: 1, index: 9 }])).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const cards: HwatuCard[] = [...distinctPi(10), ...NON_PI];
    const snapshot = cards.map((c) => ({ ...c }));
    scorePi(cards);
    expect(cards).toEqual(snapshot);
    expect(cards.length).toBe(snapshot.length);
  });
});
