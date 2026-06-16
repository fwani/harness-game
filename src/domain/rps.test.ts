import { describe, it, expect } from "vitest";
import { judge, type Hand } from "./rps";

describe("rps domain", () => {
  it("a wins on the three winning combinations", () => {
    expect(judge("rock", "scissors")).toBe("a-win");
    expect(judge("scissors", "paper")).toBe("a-win");
    expect(judge("paper", "rock")).toBe("a-win");
  });

  it("b wins on the three losing combinations", () => {
    expect(judge("scissors", "rock")).toBe("b-win");
    expect(judge("paper", "scissors")).toBe("b-win");
    expect(judge("rock", "paper")).toBe("b-win");
  });

  it("draws when both play the same hand", () => {
    const hands: Hand[] = ["rock", "paper", "scissors"];
    for (const hand of hands) {
      expect(judge(hand, hand)).toBe("draw");
    }
  });
});
