import { describe, it, expect } from "vitest";
import { pokerCategoryLabel, winnersToWinSide, pokerOutcomeLabel } from "./pokerView";
import { PokerHandCategory } from "../../domain/pokerHand";
import { playPokerShowdown } from "../../application/playPokerShowdown";
import type { RandomSource } from "../../application/dealCards";

/** 결정적 RandomSource 스텁: 항상 0을 반환(셔플이 교환을 생략 → 덱 순서 유지). */
function stubRng(): RandomSource {
  return {
    nextInt() {
      return 0;
    },
  };
}

describe("pokerView helpers", () => {
  it("pokerCategoryLabel은 각 족보를 한국어로 매핑한다", () => {
    expect(pokerCategoryLabel(PokerHandCategory.HighCard)).toBe("하이카드");
    expect(pokerCategoryLabel(PokerHandCategory.OnePair)).toBe("원페어");
    expect(pokerCategoryLabel(PokerHandCategory.TwoPair)).toBe("투페어");
    expect(pokerCategoryLabel(PokerHandCategory.ThreeOfAKind)).toBe("트리플");
    expect(pokerCategoryLabel(PokerHandCategory.Straight)).toBe("스트레이트");
    expect(pokerCategoryLabel(PokerHandCategory.Flush)).toBe("플러시");
    expect(pokerCategoryLabel(PokerHandCategory.FullHouse)).toBe("풀하우스");
    expect(pokerCategoryLabel(PokerHandCategory.FourOfAKind)).toBe("포카드");
    expect(pokerCategoryLabel(PokerHandCategory.StraightFlush)).toBe("스트레이트 플러시");
  });

  it("winnersToWinSide는 [0]→a, [1]→b, [0,1]→draw로 매핑한다", () => {
    expect(winnersToWinSide([0])).toBe("a");
    expect(winnersToWinSide([1])).toBe("b");
    expect(winnersToWinSide([0, 1])).toBe("draw");
  });

  it("winnersToWinSide는 비정상 입력(빈 배열)을 draw로 안전 처리한다", () => {
    expect(winnersToWinSide([])).toBe("draw");
  });

  it("pokerOutcomeLabel은 승리/패배/무승부를 텍스트로 표기한다", () => {
    expect(pokerOutcomeLabel([0])).toContain("승리");
    expect(pokerOutcomeLabel([1])).toContain("패배");
    expect(pokerOutcomeLabel([0, 1])).toContain("무승부");
  });

  it("결정적 rng로 진행한 한 판이 양측 5장 손패·승자를 낸다", () => {
    const result = playPokerShowdown(stubRng(), 2);
    expect(result.hands).toHaveLength(2);
    expect(result.hands[0]).toHaveLength(5);
    expect(result.hands[1]).toHaveLength(5);
    expect(result.winners.length).toBeGreaterThan(0);
    // winners는 0/1 인덱스만 포함하고 WinSide로 매핑 가능해야 한다.
    for (const w of result.winners) expect([0, 1]).toContain(w);
    expect(["a", "b", "draw"]).toContain(winnersToWinSide(result.winners));
  });
});
