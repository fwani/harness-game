import { describe, it, expect } from "vitest";
import { dieFace, diceOutcomeLabel, formatDiceCategory } from "./diceView";
import { playDiceRound } from "../../application/playDiceRound";
import { playDiceCategoryRound } from "../../application/playDiceCategoryRound";
import { sumDice } from "../../domain/dice";
import { evaluateDiceRoll, type DiceCategory } from "../../domain/diceCategory";
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

describe("formatDiceCategory (족보 라벨)", () => {
  // 9개 카테고리를 실제로 만드는 5개 주사위 예시. evaluateDiceRoll로 판정해
  // 매핑이 도메인 판정과 일치하는지(라벨 재구현이 아님) 검증한다.
  const cases: { dice: number[]; category: DiceCategory; label: string }[] = [
    { dice: [4, 4, 4, 4, 4], category: "yacht", label: "야추" },
    { dice: [2, 2, 2, 2, 5], category: "fourOfAKind", label: "포카드" },
    { dice: [3, 3, 3, 6, 6], category: "fullHouse", label: "풀하우스" },
    { dice: [1, 2, 3, 4, 5], category: "largeStraight", label: "라지 스트레이트" },
    { dice: [1, 2, 3, 4, 4], category: "smallStraight", label: "스몰 스트레이트" },
    { dice: [5, 5, 5, 2, 3], category: "threeOfAKind", label: "트리플" },
    { dice: [2, 2, 4, 4, 6], category: "twoPair", label: "투페어" },
    { dice: [6, 6, 1, 3, 5], category: "onePair", label: "원페어" },
    { dice: [1, 3, 5, 2, 6], category: "highDice", label: "노페어" },
  ];

  it("9개 카테고리 전부 한국어 라벨로 매핑한다", () => {
    for (const { dice, category, label } of cases) {
      const rank = evaluateDiceRoll(dice);
      expect(rank.category).toBe(category); // 도메인 판정 전제 확인
      expect(formatDiceCategory(rank)).toBe(label);
    }
  });
});

// 굴림 순서: A 5개(모두 6=야추), 그다음 B 5개(1,1,3,5,2=원페어; 연속 4개 없음).
const CATEGORY_DICE_FIXTURE = [6, 6, 6, 6, 6, 1, 1, 3, 5, 2];

describe("playDiceCategoryRound + view (족보 모드)", () => {
  it("강한 족보(야추)가 약한 족보를 이기고 승패 문구가 일관된다", () => {
    let calls = 0;
    const stub: RandomSource = {
      // 굴림 순서: A 5개 먼저(모두 6=야추), 그다음 B 5개(1,1,2,3,4=원페어).
      nextInt: () => {
        const value = CATEGORY_DICE_FIXTURE[calls]!;
        calls += 1;
        return value - 1; // nextInt(6)+1 = value
      },
    };
    const round = playDiceCategoryRound(stub, 5);
    expect(round.aRank.category).toBe("yacht");
    expect(round.bRank.category).toBe("onePair");
    expect(round.result).toBe("a");
    expect(formatDiceCategory(round.aRank)).toBe("야추");
    expect(formatDiceCategory(round.bRank)).toBe("원페어");
    expect(diceOutcomeLabel(round.result)).toContain("승리");
  });
});
