import { describe, it, expect } from "vitest";
import { evaluateYutThrow } from "./yut";

describe("evaluateYutThrow - 윷놀이 던짐 결과 판정", () => {
  it("배 0개(모두 등) → 모(5칸, 한 번 더)", () => {
    expect(evaluateYutThrow([false, false, false, false])).toEqual({
      result: "mo",
      steps: 5,
      extraThrow: true,
    });
  });

  it("배 1개 → 도(1칸, 추가 없음)", () => {
    expect(evaluateYutThrow([true, false, false, false])).toEqual({
      result: "do",
      steps: 1,
      extraThrow: false,
    });
  });

  it("배 2개 → 개(2칸, 추가 없음)", () => {
    expect(evaluateYutThrow([true, true, false, false])).toEqual({
      result: "gae",
      steps: 2,
      extraThrow: false,
    });
  });

  it("배 3개 → 걸(3칸, 추가 없음)", () => {
    expect(evaluateYutThrow([true, true, true, false])).toEqual({
      result: "geol",
      steps: 3,
      extraThrow: false,
    });
  });

  it("배 4개(모두 배) → 윷(4칸, 한 번 더)", () => {
    expect(evaluateYutThrow([true, true, true, true])).toEqual({
      result: "yut",
      steps: 4,
      extraThrow: true,
    });
  });

  it("배의 개수만 보고 판정한다(위치 무관)", () => {
    expect(evaluateYutThrow([false, true, false, false]).result).toBe("do");
    expect(evaluateYutThrow([false, false, true, true]).result).toBe("gae");
    expect(evaluateYutThrow([false, true, true, true]).result).toBe("geol");
  });

  it("배열 길이가 4가 아니면 throw 한다", () => {
    expect(() => evaluateYutThrow([])).toThrow();
    expect(() => evaluateYutThrow([true, false, false])).toThrow();
    expect(() => evaluateYutThrow([true, false, false, false, false])).toThrow();
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const sticks = [true, false, true, false];
    const snapshot = [...sticks];
    evaluateYutThrow(sticks);
    expect(sticks).toEqual(snapshot);
  });
});
