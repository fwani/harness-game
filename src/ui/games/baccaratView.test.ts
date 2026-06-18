import { describe, it, expect } from "vitest";
import { baccaratOutcomeLabel } from "./baccaratView";
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
  it("baccaratOutcomeLabel은 핸드 결과를 중립 텍스트로 표기한다", () => {
    expect(baccaratOutcomeLabel("player")).toBe("플레이어 승");
    expect(baccaratOutcomeLabel("banker")).toBe("뱅커 승");
    expect(baccaratOutcomeLabel("tie")).toBe("타이");
  });

  it("결정적 rng로 진행한 한 판의 끗수·손패가 유효 범위 안이다", () => {
    const result = playBaccaratRound(stubRng());
    expect(result.playerHand.length).toBeGreaterThanOrEqual(2);
    expect(result.bankerHand.length).toBeGreaterThanOrEqual(2);
    expect(result.playerScore).toBeGreaterThanOrEqual(0);
    expect(result.playerScore).toBeLessThanOrEqual(9);
    expect(["player", "banker", "tie"]).toContain(result.outcome);
  });
});
