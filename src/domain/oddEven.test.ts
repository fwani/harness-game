import { describe, it, expect } from "vitest";
import { parityOf, isWin } from "./oddEven";

describe("oddEven domain", () => {
  it("classifies parity", () => {
    expect(parityOf(2)).toBe("even");
    expect(parityOf(3)).toBe("odd");
    expect(parityOf(0)).toBe("even");
  });

  it("decides a win", () => {
    expect(isWin("odd", 3)).toBe(true);
    expect(isWin("even", 3)).toBe(false);
    expect(isWin("even", 4)).toBe(true);
  });

  it("rejects non-integers", () => {
    expect(() => parityOf(1.5)).toThrow();
  });
});
