import { describe, it, expect } from "vitest";
import { applyGoBonus } from "./goStopGo";

describe("applyGoBonus", () => {
  it("goCount 0이면 total === base, bonus 0, multiplier 1", () => {
    const r = applyGoBonus(7, 0);
    expect(r).toEqual({
      base: 7,
      goCount: 0,
      bonus: 0,
      multiplier: 1,
      total: 7,
    });
  });

  it("goCount 1이면 bonus 1, multiplier 1, total === base + 1", () => {
    const r = applyGoBonus(7, 1);
    expect(r.bonus).toBe(1);
    expect(r.multiplier).toBe(1);
    expect(r.total).toBe(8);
  });

  it("goCount 2이면 bonus 2, multiplier 1, total === base + 2", () => {
    const r = applyGoBonus(7, 2);
    expect(r.bonus).toBe(2);
    expect(r.multiplier).toBe(1);
    expect(r.total).toBe(9);
  });

  it("goCount 3이면 bonus 3, multiplier 2, total === (base + 3) * 2", () => {
    const r = applyGoBonus(7, 3);
    expect(r.bonus).toBe(3);
    expect(r.multiplier).toBe(2);
    expect(r.total).toBe((7 + 3) * 2);
  });

  it("goCount 4이면 multiplier 4", () => {
    const r = applyGoBonus(7, 4);
    expect(r.bonus).toBe(4);
    expect(r.multiplier).toBe(4);
    expect(r.total).toBe((7 + 4) * 4);
  });

  it("goCount 5이면 multiplier 8 (3고부터 ×2 누적)", () => {
    expect(applyGoBonus(10, 5).multiplier).toBe(8);
  });

  it("base 0 경계에서도 규칙대로 계산한다", () => {
    expect(applyGoBonus(0, 0)).toMatchObject({ bonus: 0, multiplier: 1, total: 0 });
    expect(applyGoBonus(0, 3)).toMatchObject({ bonus: 3, multiplier: 2, total: 6 });
  });

  it("입력값을 그대로 반영한다 (base/goCount passthrough)", () => {
    const r = applyGoBonus(12, 4);
    expect(r.base).toBe(12);
    expect(r.goCount).toBe(4);
  });

  it("base가 음수면 throw", () => {
    expect(() => applyGoBonus(-1, 0)).toThrow();
  });

  it("base가 비정수면 throw", () => {
    expect(() => applyGoBonus(3.5, 0)).toThrow();
  });

  it("goCount가 음수면 throw", () => {
    expect(() => applyGoBonus(7, -1)).toThrow();
  });

  it("goCount가 비정수면 throw", () => {
    expect(() => applyGoBonus(7, 1.5)).toThrow();
  });

  it("base/goCount가 NaN이면 throw", () => {
    expect(() => applyGoBonus(Number.NaN, 0)).toThrow();
    expect(() => applyGoBonus(7, Number.NaN)).toThrow();
  });
});
