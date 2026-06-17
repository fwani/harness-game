import { describe, expect, it } from "vitest";
import {
  generateSingleEliminationFirstRound,
  advanceSingleEliminationRound,
  type BracketPairing,
} from "../../domain/singleElimination";
import {
  isRoundDecided,
  pairingKey,
  roundLabel,
  validateBracketPlayers,
  winnersInOrder,
} from "./singleEliminationView";

describe("validateBracketPlayers", () => {
  it("trims, drops blanks, and returns the cleaned list", () => {
    const result = validateBracketPlayers([" 가 ", "나", "", "  "]);
    expect(result).toEqual({ ok: true, players: ["가", "나"] });
  });

  it("rejects fewer than two players with a Korean reason", () => {
    const result = validateBracketPlayers(["가", "  "]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("2명");
    }
  });

  it("rejects duplicate names with a Korean reason", () => {
    const result = validateBracketPlayers(["가", "나", "가"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("중복");
    }
  });

  it("does not mutate the input array", () => {
    const input = [" 가 ", "나"];
    validateBracketPlayers(input);
    expect(input).toEqual([" 가 ", "나"]);
  });
});

describe("roundLabel", () => {
  it("labels the last round as 결승 and the previous as 준결승", () => {
    // 4명 → 2라운드: 준결승, 결승.
    expect(roundLabel(0, 2)).toBe("준결승");
    expect(roundLabel(1, 2)).toBe("결승");
  });

  it("labels earlier rounds by participant count (강)", () => {
    // 8명 → 3라운드: 8강, 준결승, 결승.
    expect(roundLabel(0, 3)).toBe("8강");
    expect(roundLabel(1, 3)).toBe("준결승");
    expect(roundLabel(2, 3)).toBe("결승");
    // 16명 → 4라운드: 16강, 8강, 준결승, 결승.
    expect(roundLabel(0, 4)).toBe("16강");
    expect(roundLabel(1, 4)).toBe("8강");
  });

  it("labels a single-round bracket as 결승", () => {
    expect(roundLabel(0, 1)).toBe("결승");
  });

  it("falls back to N라운드 on out-of-range input", () => {
    expect(roundLabel(0, 0)).toBe("1라운드");
    expect(roundLabel(2, 1)).toBe("3라운드");
  });
});

describe("isRoundDecided", () => {
  it("returns true once every real match has a valid winner", () => {
    const round: BracketPairing[] = [
      { a: "가", b: "나" },
      { a: "다", b: "라" },
    ];
    expect(isRoundDecided(round, { 가: "가" })).toBe(false);
    expect(isRoundDecided(round, { 가: "가", 다: "라" })).toBe(true);
  });

  it("treats bye matches as auto-decided", () => {
    const round: BracketPairing[] = [
      { a: "가", b: null },
      { a: "다", b: "라" },
    ];
    expect(isRoundDecided(round, { 다: "다" })).toBe(true);
  });

  it("rejects a winner that is not a participant of the match", () => {
    const round: BracketPairing[] = [{ a: "가", b: "나" }];
    expect(isRoundDecided(round, { 가: "다" })).toBe(false);
  });

  it("returns false for an empty round", () => {
    expect(isRoundDecided([], {})).toBe(false);
  });
});

describe("winnersInOrder", () => {
  it("auto-advances byes and reads picks for real matches in order", () => {
    const round: BracketPairing[] = [
      { a: "가", b: null },
      { a: "다", b: "라" },
    ];
    expect(winnersInOrder(round, { 다: "라" })).toEqual(["가", "라"]);
  });

  it("yields null for an undecided real match", () => {
    const round: BracketPairing[] = [{ a: "가", b: "나" }];
    expect(winnersInOrder(round, {})).toEqual([null]);
  });

  it("feeds advanceSingleEliminationRound to a champion", () => {
    // 3명: 1번 시드 부전승 + 2 vs 3 → 다음 라운드 → 우승.
    const first = generateSingleEliminationFirstRound(["가", "나", "다"]);
    const firstWinners = winnersInOrder(first, { 나: "다" });
    const second = advanceSingleEliminationRound(first, firstWinners);
    // 결승: 가(부전승) vs 다.
    expect(second).toEqual([{ a: "가", b: "다" }]);
    const secondWinners = winnersInOrder(second, { 가: "가" });
    const champion = advanceSingleEliminationRound(second, secondWinners);
    expect(champion).toEqual([]);
  });
});

describe("pairingKey", () => {
  it("uses the top seat as the stable key", () => {
    expect(pairingKey({ a: "가", b: "나" })).toBe("가");
    expect(pairingKey({ a: "다", b: null })).toBe("다");
  });
});
