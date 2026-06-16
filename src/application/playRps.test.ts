import { describe, it, expect } from "vitest";
import { playRpsRound, type HandSource } from "./playRps";
import { type Hand } from "../domain/rps";

/** 미리 정한 손을 그대로 내는 결정적 스텁. */
const fixed = (hand: Hand): HandSource => ({ choose: () => hand });

describe("playRps application", () => {
  it("returns a-win when A beats B", () => {
    const result = playRpsRound(fixed("rock"), fixed("scissors"));
    expect(result).toEqual({ a: "rock", b: "scissors", result: "a-win" });
  });

  it("returns b-win when B beats A", () => {
    const result = playRpsRound(fixed("rock"), fixed("paper"));
    expect(result).toEqual({ a: "rock", b: "paper", result: "b-win" });
  });

  it("returns draw on the same hand", () => {
    const result = playRpsRound(fixed("paper"), fixed("paper"));
    expect(result).toEqual({ a: "paper", b: "paper", result: "draw" });
  });

  it("reflects each source's chosen hand", () => {
    const result = playRpsRound(fixed("scissors"), fixed("rock"));
    expect(result.a).toBe("scissors");
    expect(result.b).toBe("rock");
  });
});
