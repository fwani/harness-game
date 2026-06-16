import { describe, it, expect } from "vitest";
import { MathRandomSource } from "./mathRandomSource";

describe("MathRandomSource", () => {
  it("0 <= x < maxExclusive 범위의 정수를 반환한다", () => {
    const rng = new MathRandomSource();
    for (let i = 0; i < 1000; i++) {
      const x = rng.nextInt(10);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(10);
    }
  });

  it("maxExclusive = 1 이면 항상 0", () => {
    const rng = new MathRandomSource();
    expect(rng.nextInt(1)).toBe(0);
  });

  it("maxExclusive < 1 이면 throw", () => {
    const rng = new MathRandomSource();
    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(-3)).toThrow();
  });

  it("maxExclusive가 정수가 아니면 throw", () => {
    const rng = new MathRandomSource();
    expect(() => rng.nextInt(2.5)).toThrow();
  });
});
