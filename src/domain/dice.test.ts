import { describe, it, expect } from "vitest";
import { sumDice, compareDiceRolls } from "./dice";

describe("sumDice", () => {
  it("주사위 눈들을 합산한다", () => {
    expect(sumDice([1])).toBe(1);
    expect(sumDice([1, 2, 3])).toBe(6);
    expect(sumDice([6, 6])).toBe(12);
  });

  it("빈 배열이면 throw", () => {
    expect(() => sumDice([])).toThrow(/sumDice/);
  });

  it("1~6 범위 밖이면 throw", () => {
    expect(() => sumDice([0])).toThrow(/sumDice/);
    expect(() => sumDice([7])).toThrow(/sumDice/);
    expect(() => sumDice([1, 2, -3])).toThrow(/sumDice/);
  });

  it("정수가 아니면 throw", () => {
    expect(() => sumDice([1.5])).toThrow(/sumDice/);
    expect(() => sumDice([NaN])).toThrow(/sumDice/);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const dice = [3, 4, 5];
    const snapshot = [...dice];
    sumDice(dice);
    expect(dice).toEqual(snapshot);
  });
});

describe("compareDiceRolls", () => {
  it("a 합이 크면 'a'", () => {
    expect(compareDiceRolls([6, 6], [1, 2])).toBe("a");
  });

  it("b 합이 크면 'b'", () => {
    expect(compareDiceRolls([1, 1], [3, 4])).toBe("b");
  });

  it("합이 같으면 'draw'", () => {
    expect(compareDiceRolls([3, 4], [2, 5])).toBe("draw");
    expect(compareDiceRolls([6], [6])).toBe("draw");
  });

  it("각 입력에 sumDice 검증 규칙을 적용한다", () => {
    expect(() => compareDiceRolls([], [1])).toThrow(/sumDice/);
    expect(() => compareDiceRolls([1], [7])).toThrow(/sumDice/);
    expect(() => compareDiceRolls([1.5], [2])).toThrow(/sumDice/);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const a = [2, 3];
    const b = [4, 1];
    const aSnapshot = [...a];
    const bSnapshot = [...b];
    compareDiceRolls(a, b);
    expect(a).toEqual(aSnapshot);
    expect(b).toEqual(bSnapshot);
  });
});
