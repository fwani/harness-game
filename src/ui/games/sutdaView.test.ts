import { describe, it, expect } from "vitest";
import { sutdaCategoryLabel, sutdaRankLabel, sutdaOutcomeLabel } from "./sutdaView";
import { playSutdaRound } from "../../application/playSutdaRound";
import type { RandomSource } from "../../application/dealCards";

/** 결정적 RandomSource 스텁: 항상 0을 반환(셔플이 교환을 생략 → 덱 순서 유지). */
function stubRng(): RandomSource {
  return {
    nextInt() {
      return 0;
    },
  };
}

describe("sutdaView helpers", () => {
  it("sutdaCategoryLabel은 각 카테고리를 한국어로 매핑한다", () => {
    expect(sutdaCategoryLabel("ddaeng")).toBe("땡");
    expect(sutdaCategoryLabel("special")).toBe("특수패");
    expect(sutdaCategoryLabel("kkut")).toBe("끗");
  });

  it("sutdaRankLabel은 카테고리+value를 텍스트로 표기한다", () => {
    expect(sutdaRankLabel({ category: "ddaeng", value: 10 })).toBe("10땡");
    expect(sutdaRankLabel({ category: "kkut", value: 9 })).toBe("9끗");
    expect(sutdaRankLabel({ category: "kkut", value: 0 })).toBe("0끗");
    expect(sutdaRankLabel({ category: "special", value: 6 })).toContain("특수패");
  });

  it("sutdaOutcomeLabel은 a→승리, b→패배, draw→무승부로 표기한다", () => {
    expect(sutdaOutcomeLabel("a")).toContain("승리");
    expect(sutdaOutcomeLabel("b")).toContain("패배");
    expect(sutdaOutcomeLabel("draw")).toContain("무승부");
  });

  it("결정적 rng로 진행한 한 판이 양측 2장·등급·WinSide 결과를 낸다", () => {
    const result = playSutdaRound(stubRng());
    expect(result.a).toHaveLength(2);
    expect(result.b).toHaveLength(2);
    expect(["ddaeng", "special", "kkut"]).toContain(result.aRank.category);
    expect(["ddaeng", "special", "kkut"]).toContain(result.bRank.category);
    expect(["a", "b", "draw"]).toContain(result.result);
    // 결과 레이블이 비어 있지 않음(화면 표기 보장).
    expect(sutdaRankLabel(result.aRank).length).toBeGreaterThan(0);
    expect(sutdaOutcomeLabel(result.result).length).toBeGreaterThan(0);
  });
});
