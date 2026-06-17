import { describe, it, expect } from "vitest";
import { dieFace, diceOutcomeLabel } from "./diceView";
import { playDiceRound } from "../../application/playDiceRound";
import { sumDice } from "../../domain/dice";
import type { RandomSource } from "../../application/dealCards";

describe("diceView helpers", () => {
  it("dieFace는 1..6을 유니코드 주사위 면으로 매핑한다", () => {
    expect(dieFace(1)).toBe("⚀");
    expect(dieFace(6)).toBe("⚅");
  });

  it("dieFace는 범위를 벗어나면 throw한다", () => {
    expect(() => dieFace(0)).toThrow();
    expect(() => dieFace(7)).toThrow();
    expect(() => dieFace(2.5)).toThrow();
  });

  it("diceOutcomeLabel은 a=승리, b=패배, draw=무승부를 라벨로 구분한다", () => {
    expect(diceOutcomeLabel("a")).toContain("승리");
    expect(diceOutcomeLabel("b")).toContain("패배");
    expect(diceOutcomeLabel("draw")).toContain("무승부");
  });

  it("결정적 RandomSource로 양측 눈·합계·승패가 일관되게 도출된다", () => {
    // A는 항상 6, B는 항상 1을 굴리도록 두 측을 구분하는 스텁.
    let calls = 0;
    const stub: RandomSource = {
      // 굴림 순서: A의 주사위들 먼저, 그다음 B의 주사위들.
      nextInt: () => {
        const aTurn = calls < 2; // diceCount=2: 처음 2번이 A.
        calls += 1;
        return aTurn ? 5 : 0; // nextInt(6)+1 → A=6, B=1.
      },
    };
    const round = playDiceRound(2, stub);

    expect(round.a).toEqual([6, 6]);
    expect(round.b).toEqual([1, 1]);
    expect(sumDice(round.a)).toBe(12);
    expect(sumDice(round.b)).toBe(2);
    // A 합이 더 크므로 승리(=a). result는 곧 WinSide.
    expect(round.result).toBe("a");
    expect(diceOutcomeLabel(round.result)).toContain("승리");
    // 모든 눈은 유효한 주사위 면으로 렌더링 가능.
    for (const v of [...round.a, ...round.b]) {
      expect(dieFace(v).length).toBeGreaterThan(0);
    }
  });

  it("동점이면 draw를 낸다", () => {
    const stub: RandomSource = { nextInt: () => 2 }; // 항상 3.
    const round = playDiceRound(3, stub);
    expect(round.result).toBe("draw");
    expect(diceOutcomeLabel(round.result)).toContain("무승부");
  });
});
