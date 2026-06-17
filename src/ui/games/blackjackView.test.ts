import { describe, it, expect } from "vitest";
import { blackjackWinSide, handTotalLabel } from "./blackjackView";
import { playBlackjackRound } from "../../application/playBlackjack";
import type { RandomSource } from "../../application/dealCards";
import type { Card } from "../../domain/card";

describe("blackjackView helpers", () => {
  it("blackjackWinSide는 player→a, dealer→b, push→draw로 매핑한다", () => {
    expect(blackjackWinSide("player")).toBe("a");
    expect(blackjackWinSide("dealer")).toBe("b");
    expect(blackjackWinSide("push")).toBe("draw");
  });

  it("handTotalLabel은 일반 합·블랙잭·버스트를 라벨로 구분한다", () => {
    const normal: Card[] = [
      { suit: "spades", rank: "10" },
      { suit: "hearts", rank: "7" },
    ];
    expect(handTotalLabel(normal)).toBe("17");

    const blackjack: Card[] = [
      { suit: "spades", rank: "A" },
      { suit: "clubs", rank: "K" },
    ];
    expect(handTotalLabel(blackjack)).toBe("블랙잭");

    const bust: Card[] = [
      { suit: "spades", rank: "10" },
      { suit: "hearts", rank: "8" },
      { suit: "clubs", rank: "5" },
    ];
    expect(handTotalLabel(bust)).toBe("버스트(23)");
  });

  it("결정적 RandomSource로 한 판이 안정적으로 진행되고 라벨/승자 매핑이 일관된다", () => {
    // 셔플을 항상 j=0으로 만들어(노스왑) 결정적 덱을 만든다.
    const stub: RandomSource = { nextInt: () => 0 };
    const round = playBlackjackRound(stub);

    expect(round.playerHand.length).toBeGreaterThanOrEqual(2);
    expect(round.dealerHand.length).toBeGreaterThanOrEqual(2);
    expect(["player", "dealer", "push"]).toContain(round.outcome);
    // 같은 rng면 같은 결과(결정적).
    expect(playBlackjackRound(stub).outcome).toBe(round.outcome);
    // 매핑 헬퍼는 항상 유효한 WinSide를 낸다.
    expect(["a", "b", "draw"]).toContain(blackjackWinSide(round.outcome));
    // 라벨 헬퍼는 실제 손패에 대해 비어있지 않은 문자열을 낸다.
    expect(handTotalLabel(round.playerHand).length).toBeGreaterThan(0);
  });
});
