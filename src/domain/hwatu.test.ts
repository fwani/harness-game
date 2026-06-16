import { describe, it, expect } from "vitest";
import {
  createHwatuDeck,
  isValidHwatuCard,
  isSameMonth,
  type HwatuCard,
} from "./hwatu";

describe("createHwatuDeck - 48장 화투 덱", () => {
  it("정확히 48장을 반환한다", () => {
    expect(createHwatuDeck()).toHaveLength(48);
  });

  it("(month, index) 조합이 중복 없이 한 번씩 등장한다(12개월 각 4장)", () => {
    const deck = createHwatuDeck();
    const keys = new Set(deck.map((c) => `${c.month}-${c.index}`));
    expect(keys.size).toBe(48);
    for (let month = 1; month <= 12; month++) {
      for (let index = 0; index <= 3; index++) {
        expect(keys.has(`${month}-${index}`)).toBe(true);
      }
    }
  });

  it("모든 카드가 유효하다", () => {
    expect(createHwatuDeck().every(isValidHwatuCard)).toBe(true);
  });

  it("month 오름차순, 그 안에서 index 오름차순으로 정렬된다", () => {
    const deck = createHwatuDeck();
    const expected: HwatuCard[] = [];
    for (let month = 1; month <= 12; month++) {
      for (let index = 0; index <= 3; index++) {
        expected.push({ month, index });
      }
    }
    expect(deck).toEqual(expected);
  });

  it("호출마다 새로운 배열을 반환한다(공유 상태 없음)", () => {
    expect(createHwatuDeck()).not.toBe(createHwatuDeck());
  });
});

describe("isSameMonth - 같은 달 비교", () => {
  it("같은 달이면 true(index 무시)", () => {
    expect(isSameMonth({ month: 5, index: 0 }, { month: 5, index: 3 })).toBe(
      true,
    );
  });

  it("다른 달이면 false", () => {
    expect(isSameMonth({ month: 5, index: 0 }, { month: 6, index: 0 })).toBe(
      false,
    );
  });

  it("입력을 변형하지 않는다(불변)", () => {
    const a: HwatuCard = { month: 3, index: 1 };
    const b: HwatuCard = { month: 3, index: 2 };
    isSameMonth(a, b);
    expect(a).toEqual({ month: 3, index: 1 });
    expect(b).toEqual({ month: 3, index: 2 });
  });
});

describe("isValidHwatuCard - 경계값 검증", () => {
  it("유효한 카드는 true", () => {
    expect(isValidHwatuCard({ month: 1, index: 0 })).toBe(true);
    expect(isValidHwatuCard({ month: 12, index: 3 })).toBe(true);
  });

  it("month 경계 밖이면 false", () => {
    expect(isValidHwatuCard({ month: 0, index: 0 })).toBe(false);
    expect(isValidHwatuCard({ month: 13, index: 0 })).toBe(false);
  });

  it("index 경계 밖이면 false", () => {
    expect(isValidHwatuCard({ month: 1, index: -1 })).toBe(false);
    expect(isValidHwatuCard({ month: 1, index: 4 })).toBe(false);
  });

  it("비정수면 false", () => {
    expect(isValidHwatuCard({ month: 1.5, index: 0 })).toBe(false);
    expect(isValidHwatuCard({ month: 1, index: 2.5 })).toBe(false);
    expect(isValidHwatuCard({ month: NaN, index: 0 })).toBe(false);
    expect(isValidHwatuCard({ month: 1, index: NaN })).toBe(false);
  });
});
