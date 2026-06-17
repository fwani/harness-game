import { describe, it, expect } from "vitest";
import {
  formatGoStopFinalScore,
  describeGoStopOutcome,
  describeHwatuCard,
  buildGoStopScoreBreakdown,
} from "./goStopView";
import type { GoStopFinalScore } from "../../domain/goStopBak";
import type { GoStopShowdownResult } from "../../application/settleGoStopShowdown";

function finalScore(over: Partial<GoStopFinalScore> = {}): GoStopFinalScore {
  return {
    base: 3,
    multiplier: 1,
    flags: { gwangbak: false, pibak: false },
    total: 3,
    ...over,
  };
}

describe("formatGoStopFinalScore", () => {
  it("base/multiplier/total을 그대로 전달한다", () => {
    const d = formatGoStopFinalScore(finalScore({ base: 5, multiplier: 4, total: 20 }));
    expect(d.base).toBe(5);
    expect(d.multiplier).toBe(4);
    expect(d.total).toBe(20);
  });

  it("플래그가 없으면 빈 라벨 배열을 반환한다", () => {
    const d = formatGoStopFinalScore(finalScore());
    expect(d.flagLabels).toEqual([]);
  });

  it("광박 플래그를 '광박' 라벨로 변환한다", () => {
    const d = formatGoStopFinalScore(
      finalScore({ flags: { gwangbak: true, pibak: false } }),
    );
    expect(d.flagLabels).toEqual(["광박"]);
  });

  it("피박 플래그를 '피박' 라벨로 변환한다", () => {
    const d = formatGoStopFinalScore(
      finalScore({ flags: { gwangbak: false, pibak: true } }),
    );
    expect(d.flagLabels).toEqual(["피박"]);
  });

  it("광박·피박이 모두 적용되면 광박, 피박 순으로 라벨을 만든다", () => {
    const d = formatGoStopFinalScore(
      finalScore({ flags: { gwangbak: true, pibak: true } }),
    );
    expect(d.flagLabels).toEqual(["광박", "피박"]);
  });
});

describe("describeHwatuCard", () => {
  it("광 카드를 '월 + 광'으로 표시한다", () => {
    const d = describeHwatuCard({ month: 1, index: 0 });
    expect(d.category).toBe("광");
    expect(d.month).toBe(1);
    expect(d.label).toBe("1월 광");
  });

  it("열끗/띠/피 분류를 각각 텍스트로 병기한다", () => {
    expect(describeHwatuCard({ month: 2, index: 0 }).label).toBe("2월 열끗");
    expect(describeHwatuCard({ month: 1, index: 1 }).label).toBe("1월 띠");
    expect(describeHwatuCard({ month: 1, index: 2 }).label).toBe("1월 피");
  });

  it("유효하지 않은 카드는 throw한다", () => {
    expect(() => describeHwatuCard({ month: 13, index: 0 })).toThrow();
  });
});

describe("buildGoStopScoreBreakdown", () => {
  it("카드 0점·5고를 분해해 고 배수(×8)를 드러낸다 (QA #269 재현)", () => {
    // 피 2장(<10) → 카드 점수 0. 5고 → 보너스 +5, 배수 ×8. 박 없음.
    const captured = [
      { month: 1, index: 2 },
      { month: 1, index: 3 },
    ];
    const finalScore: GoStopFinalScore = {
      base: 40,
      multiplier: 1,
      flags: { gwangbak: false, pibak: false },
      total: 40,
    };
    const b = buildGoStopScoreBreakdown(captured, 5, finalScore);
    expect(b.gwang).toBe(0);
    expect(b.yeol).toBe(0);
    expect(b.tti).toBe(0);
    expect(b.pi).toBe(0);
    expect(b.cardTotal).toBe(0);
    expect(b.goBonus).toBe(5);
    expect(b.goMultiplier).toBe(8);
    expect(b.bakMultiplier).toBe(1);
    expect(b.flagLabels).toEqual([]);
    expect(b.total).toBe(40);
    // 불변식: (cardTotal + goBonus) × goMultiplier × bakMultiplier === total
    expect((b.cardTotal + b.goBonus) * b.goMultiplier * b.bakMultiplier).toBe(b.total);
  });

  it("0~2고는 고 배수 ×1이고 고 보너스만 가산한다", () => {
    const captured = [{ month: 1, index: 2 }];
    const finalScore: GoStopFinalScore = {
      base: 0,
      multiplier: 1,
      flags: { gwangbak: false, pibak: false },
      total: 0,
    };
    const b = buildGoStopScoreBreakdown(captured, 0, finalScore);
    expect(b.goBonus).toBe(0);
    expect(b.goMultiplier).toBe(1);
  });

  it("카드 점수·박 배수·박 라벨을 함께 분해한다", () => {
    // 광 3장(비광 제외) → 광 3점. 3고 → 보너스 +3, 배수 ×2. 광박 → 박 배수 ×2.
    const captured = [
      { month: 1, index: 0 },
      { month: 3, index: 0 },
      { month: 8, index: 0 },
    ];
    const finalScore: GoStopFinalScore = {
      base: 12,
      multiplier: 2,
      flags: { gwangbak: true, pibak: false },
      total: 24,
    };
    const b = buildGoStopScoreBreakdown(captured, 3, finalScore);
    expect(b.gwang).toBe(3);
    expect(b.cardTotal).toBe(3);
    expect(b.goBonus).toBe(3);
    expect(b.goMultiplier).toBe(2);
    expect(b.bakMultiplier).toBe(2);
    expect(b.flagLabels).toEqual(["광박"]);
    expect(b.total).toBe(24);
    expect((b.cardTotal + b.goBonus) * b.goMultiplier * b.bakMultiplier).toBe(b.total);
  });
});

describe("describeGoStopOutcome", () => {
  const result = (winner: GoStopShowdownResult["winner"]): GoStopShowdownResult => ({
    a: finalScore(),
    b: finalScore(),
    winner,
  });

  it("내 쪽(a)이 이기면 승리 문구", () => {
    expect(describeGoStopOutcome(result("a"), "a")).toContain("승리");
  });

  it("상대가 이기면 패배 문구", () => {
    expect(describeGoStopOutcome(result("b"), "a")).toContain("패배");
  });

  it("무승부면 무승부 문구", () => {
    expect(describeGoStopOutcome(result("draw"), "a")).toContain("무승부");
  });

  it("b 관점에서도 승패가 뒤집혀 해석된다", () => {
    expect(describeGoStopOutcome(result("b"), "b")).toContain("승리");
    expect(describeGoStopOutcome(result("a"), "b")).toContain("패배");
  });
});
