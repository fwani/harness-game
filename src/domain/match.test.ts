import { describe, expect, it } from "vitest";
import { playMatch, type RoundOutcome } from "./match";

describe("playMatch", () => {
  it("throws when targetWins is less than 1", () => {
    expect(() => playMatch([], 0)).toThrow();
    expect(() => playMatch([], -1)).toThrow();
  });

  it("throws when targetWins is not an integer", () => {
    expect(() => playMatch([], 1.5)).toThrow();
    expect(() => playMatch([], Number.NaN)).toThrow();
  });

  it("returns an empty status for an empty round sequence", () => {
    expect(playMatch([], 3)).toEqual({
      winsA: 0,
      winsB: 0,
      draws: 0,
      decided: false,
      winner: null,
    });
  });

  it("declares a the winner once a reaches targetWins first", () => {
    expect(playMatch(["a", "b", "a", "a"], 3)).toEqual({
      winsA: 3,
      winsB: 1,
      draws: 0,
      decided: true,
      winner: "a",
    });
  });

  it("declares b the winner symmetrically", () => {
    expect(playMatch(["b", "a", "b", "b"], 3)).toEqual({
      winsA: 1,
      winsB: 3,
      draws: 0,
      decided: true,
      winner: "b",
    });
  });

  it("counts draws separately without affecting either side's wins", () => {
    expect(playMatch(["draw", "a", "draw", "b"], 3)).toEqual({
      winsA: 1,
      winsB: 1,
      draws: 2,
      decided: false,
      winner: null,
    });
  });

  it("ignores rounds played after the match is already decided", () => {
    const decidedThenMore = playMatch(["a", "a", "b", "a", "b"], 2);
    expect(decidedThenMore).toEqual({
      winsA: 2,
      winsB: 0,
      draws: 0,
      decided: true,
      winner: "a",
    });
  });

  it("wins with targetWins of 1 on the very first decisive round", () => {
    expect(playMatch(["draw", "b", "a"], 1)).toEqual({
      winsA: 0,
      winsB: 1,
      draws: 1,
      decided: true,
      winner: "b",
    });
  });

  it("is deterministic: identical input yields identical output", () => {
    const rounds: RoundOutcome[] = ["a", "draw", "b", "a", "a"];
    expect(playMatch(rounds, 3)).toEqual(playMatch(rounds, 3));
  });

  it("does not mutate the input array", () => {
    const rounds: RoundOutcome[] = ["a", "b", "a", "a"];
    const snapshot = [...rounds];
    playMatch(rounds, 3);
    expect(rounds).toEqual(snapshot);
  });
});
