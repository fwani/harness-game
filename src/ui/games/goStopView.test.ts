import { describe, it, expect } from "vitest";
import { formatGoStopFinalScore, describeGoStopOutcome } from "./goStopView";
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
