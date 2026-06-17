import { describe, it, expect } from "vitest";
import { baccaratWinSide, baccaratOutcomeLabel } from "./baccaratView";
import { playBaccaratRound } from "../../application/playBaccaratRound";
import type { RandomSource } from "../../application/dealCards";

/** 결정적 RandomSource 스텁: 항상 0을 반환(셔플이 교환을 생략 → 덱 순서 유지). */
function stubRng(): RandomSource {
  return {
    nextInt() {
      return 0;
    },
  };
}

describe("baccaratView helpers", () => {
  it("baccaratWinSide는 player→a, banker→b, tie→draw로 매핑한다", () => {
    expect(baccaratWinSide("player")).toBe("a");
    expect(baccaratWinSide("banker")).toBe("b");
    expect(baccaratWinSide("tie")).toBe("draw");
  });

  it("baccaratOutcomeLabel은 각 결과를 한국어 텍스트로 표기한다", () => {
    expect(baccaratOutcomeLabel("player")).toContain("승리");
    expect(baccaratOutcomeLabel("banker")).toContain("패배");
    expect(baccaratOutcomeLabel("tie")).toContain("무승부");
  });

  it("결정적 rng로 진행한 한 판의 outcome이 WinSide로 매핑된다", () => {
    const result = playBaccaratRound(stubRng());
    expect(result.playerHand.length).toBeGreaterThanOrEqual(2);
    expect(result.bankerHand.length).toBeGreaterThanOrEqual(2);
    expect(result.playerScore).toBeGreaterThanOrEqual(0);
    expect(result.playerScore).toBeLessThanOrEqual(9);
    expect(["a", "b", "draw"]).toContain(baccaratWinSide(result.outcome));
  });
});
