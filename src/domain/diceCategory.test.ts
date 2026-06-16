import { describe, it, expect } from "vitest";
import {
  evaluateDiceRoll,
  compareDiceCategory,
  type DiceCategory,
} from "./diceCategory";

describe("evaluateDiceRoll - 족보 판정", () => {
  const cases: Array<{ name: string; dice: number[]; category: DiceCategory }> = [
    { name: "야추(5개 동일)", dice: [4, 4, 4, 4, 4], category: "yacht" },
    { name: "포카드(4개 동일)", dice: [2, 2, 2, 2, 5], category: "fourOfAKind" },
    { name: "풀하우스(3+2)", dice: [3, 3, 3, 6, 6], category: "fullHouse" },
    { name: "라지 스트레이트(1-5)", dice: [1, 2, 3, 4, 5], category: "largeStraight" },
    { name: "라지 스트레이트(2-6)", dice: [2, 3, 4, 5, 6], category: "largeStraight" },
    { name: "스몰 스트레이트(1-2-3-4 + 6)", dice: [1, 2, 3, 4, 6], category: "smallStraight" },
    { name: "스몰 스트레이트(3-4-5-6 + 1)", dice: [1, 3, 4, 5, 6], category: "smallStraight" },
    { name: "트리플(3개 동일)", dice: [5, 5, 5, 2, 4], category: "threeOfAKind" },
    { name: "투페어", dice: [2, 2, 5, 5, 1], category: "twoPair" },
    { name: "원페어", dice: [6, 6, 1, 3, 4], category: "onePair" },
    { name: "하이다이스(아무 족보 없음)", dice: [1, 2, 3, 5, 6], category: "highDice" },
  ];

  for (const { name, dice, category } of cases) {
    it(name, () => {
      expect(evaluateDiceRoll(dice).category).toBe(category);
    });
  }

  it("strength는 카테고리 순위를 반영한다(yacht가 가장 큼)", () => {
    const order: DiceCategory[] = [
      "yacht",
      "fourOfAKind",
      "fullHouse",
      "largeStraight",
      "smallStraight",
      "threeOfAKind",
      "twoPair",
      "onePair",
      "highDice",
    ];
    const samples: Record<DiceCategory, number[]> = {
      yacht: [3, 3, 3, 3, 3],
      fourOfAKind: [3, 3, 3, 3, 1],
      fullHouse: [3, 3, 3, 1, 1],
      largeStraight: [1, 2, 3, 4, 5],
      smallStraight: [1, 2, 3, 4, 6],
      threeOfAKind: [3, 3, 3, 1, 6],
      twoPair: [3, 3, 1, 1, 6],
      onePair: [3, 3, 1, 2, 6],
      highDice: [1, 2, 3, 5, 6],
    };
    const strengths = order.map((c) => evaluateDiceRoll(samples[c]).strength);
    // 순위가 높을수록(=배열 앞일수록) strength가 엄격히 커야 한다.
    for (let i = 1; i < strengths.length; i++) {
      expect(strengths[i - 1]!).toBeGreaterThan(strengths[i]!);
    }
  });

  it("sum은 눈 합계를 반영한다", () => {
    expect(evaluateDiceRoll([1, 2, 3, 4, 5]).sum).toBe(15);
    expect(evaluateDiceRoll([6, 6, 6, 6, 6]).sum).toBe(30);
  });
});

describe("evaluateDiceRoll - 경계 케이스", () => {
  it("풀하우스는 트리플+페어이며 투페어와 구분된다", () => {
    expect(evaluateDiceRoll([2, 2, 2, 5, 5]).category).toBe("fullHouse");
    expect(evaluateDiceRoll([2, 2, 5, 5, 3]).category).toBe("twoPair");
  });

  it("페어가 있어도 4연속을 포함하면 스몰 스트레이트가 우선한다", () => {
    // 2-3-4-5 연속 + 5 페어 → onePair가 아니라 smallStraight.
    expect(evaluateDiceRoll([2, 3, 4, 5, 5]).category).toBe("smallStraight");
  });

  it("라지 스트레이트는 스몰 스트레이트보다 강하다", () => {
    expect(evaluateDiceRoll([1, 2, 3, 4, 5]).category).toBe("largeStraight");
    expect(evaluateDiceRoll([1, 2, 3, 4, 6]).category).toBe("smallStraight");
  });

  it("3연속만으로는 스트레이트가 아니다(하이다이스)", () => {
    expect(evaluateDiceRoll([1, 2, 3, 5, 6]).category).toBe("highDice");
  });
});

describe("evaluateDiceRoll - 입력 검증/불변성", () => {
  it("정확히 5개가 아니면 throw", () => {
    expect(() => evaluateDiceRoll([1, 2, 3, 4])).toThrow();
    expect(() => evaluateDiceRoll([1, 2, 3, 4, 5, 6])).toThrow();
    expect(() => evaluateDiceRoll([])).toThrow();
  });

  it("1~6 범위를 벗어나거나 정수가 아니면 throw", () => {
    expect(() => evaluateDiceRoll([0, 2, 3, 4, 5])).toThrow();
    expect(() => evaluateDiceRoll([1, 2, 3, 4, 7])).toThrow();
    expect(() => evaluateDiceRoll([1, 2, 3, 4, 2.5])).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const dice = [5, 2, 4, 1, 3];
    const copy = [...dice];
    evaluateDiceRoll(dice);
    expect(dice).toEqual(copy);
  });
});

describe("compareDiceCategory - 비교", () => {
  it("강한 족보가 이긴다(strength 우선)", () => {
    // fullHouse(합17) vs fourOfAKind(합9): 강도로 b 우세.
    expect(compareDiceCategory([5, 5, 5, 1, 1], [2, 2, 2, 2, 1])).toBe("b");
    expect(compareDiceCategory([2, 2, 2, 2, 1], [5, 5, 5, 1, 1])).toBe("a");
  });

  it("같은 강도면 합으로 가린다", () => {
    // 둘 다 원페어. a 합=6+6+5+4+3? -> 페어 동일 강도, 합 비교.
    const a = [6, 6, 5, 4, 3]; // onePair, sum 24
    const b = [2, 2, 5, 4, 3]; // onePair, sum 16
    expect(compareDiceCategory(a, b)).toBe("a");
    expect(compareDiceCategory(b, a)).toBe("b");
  });

  it("강도·합이 모두 같으면 draw", () => {
    expect(compareDiceCategory([6, 6, 1, 2, 3], [6, 6, 3, 2, 1])).toBe("draw");
    expect(compareDiceCategory([4, 4, 4, 4, 4], [4, 4, 4, 4, 4])).toBe("draw");
  });

  it("잘못된 입력이면 throw", () => {
    expect(() => compareDiceCategory([1, 2, 3], [1, 2, 3, 4, 5])).toThrow();
    expect(() => compareDiceCategory([1, 2, 3, 4, 5], [1, 2, 3, 4, 8])).toThrow();
  });

  it("입력 배열들을 변형하지 않는다", () => {
    const a = [3, 1, 2, 5, 4];
    const b = [6, 6, 6, 1, 1];
    const ca = [...a];
    const cb = [...b];
    compareDiceCategory(a, b);
    expect(a).toEqual(ca);
    expect(b).toEqual(cb);
  });
});
