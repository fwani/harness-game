import { describe, it, expect } from "vitest";
import {
  baccaratOutcomeLabel,
  baccaratRevealSteps,
  baccaratRevealedThrough,
  baccaratRevealStatusLabel,
} from "./baccaratView";
import {
  playBaccaratRound,
  type BaccaratRoundResult,
} from "../../application/playBaccaratRound";
import type { Card } from "../../domain/card";
import type { RandomSource } from "../../application/dealCards";

/** 테스트용 카드 더미(suit/rank는 reveal 순서 검증에 무관). */
function card(rank: Card["rank"], suit: Card["suit"] = "spades"): Card {
  return { rank, suit };
}

/** 손패 길이만 의미 있는 결과 더미를 만든다(reveal 순서는 손패 길이에서 유도되므로). */
function resultWith(
  playerLen: number,
  bankerLen: number,
): BaccaratRoundResult {
  const ranks: Card["rank"][] = ["A", "2", "3"];
  return {
    playerHand: ranks.slice(0, playerLen).map((r) => card(r, "hearts")),
    bankerHand: ranks.slice(0, bankerLen).map((r) => card(r, "clubs")),
    playerScore: 0,
    bankerScore: 0,
    outcome: "tie",
  };
}

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

describe("baccaratRevealSteps", () => {
  it("내추럴 종료(양측 2장)는 초기 4장 + result = 5단계다", () => {
    const steps = baccaratRevealSteps(resultWith(2, 2));
    expect(steps).toEqual([
      { kind: "deal", side: "player", cardIndex: 0 },
      { kind: "deal", side: "banker", cardIndex: 0 },
      { kind: "deal", side: "player", cardIndex: 1 },
      { kind: "deal", side: "banker", cardIndex: 1 },
      { kind: "result" },
    ]);
  });

  it("플레이어만 3rd(플레이어 3장·뱅커 2장)는 플레이어 third 1개가 추가된다", () => {
    const steps = baccaratRevealSteps(resultWith(3, 2));
    expect(steps).toHaveLength(6);
    expect(steps[4]).toEqual({ kind: "third", side: "player", cardIndex: 2 });
    expect(steps[5]).toEqual({ kind: "result" });
    expect(steps.some((s) => s.kind === "third" && s.side === "banker")).toBe(
      false,
    );
  });

  it("양측 3rd(양측 3장)는 플레이어→뱅커 third 순서로 7단계다", () => {
    const steps = baccaratRevealSteps(resultWith(3, 3));
    expect(steps).toHaveLength(7);
    expect(steps[4]).toEqual({ kind: "third", side: "player", cardIndex: 2 });
    expect(steps[5]).toEqual({ kind: "third", side: "banker", cardIndex: 2 });
    expect(steps[6]).toEqual({ kind: "result" });
  });

  it("뱅커만 3rd(플레이어 2장·뱅커 3장)도 뱅커 third를 result 앞에 둔다", () => {
    const steps = baccaratRevealSteps(resultWith(2, 3));
    expect(steps).toHaveLength(6);
    expect(steps[4]).toEqual({ kind: "third", side: "banker", cardIndex: 2 });
    expect(steps[5]).toEqual({ kind: "result" });
  });
});

describe("baccaratRevealedThrough", () => {
  const result = resultWith(3, 3);
  const steps = baccaratRevealSteps(result);

  it("0단계에서는 아무 카드도 결과도 공개되지 않는다", () => {
    const r = baccaratRevealedThrough(result, steps, 0);
    expect(r.playerHand).toHaveLength(0);
    expect(r.bankerHand).toHaveLength(0);
    expect(r.resultRevealed).toBe(false);
  });

  it("초기 4장 공개 후엔 양측 2장씩·결과 미공개다", () => {
    const r = baccaratRevealedThrough(result, steps, 4);
    expect(r.playerHand).toHaveLength(2);
    expect(r.bankerHand).toHaveLength(2);
    expect(r.resultRevealed).toBe(false);
  });

  it("플레이어 third까지 공개되면 플레이어만 3장이 된다", () => {
    const r = baccaratRevealedThrough(result, steps, 5);
    expect(r.playerHand).toHaveLength(3);
    expect(r.bankerHand).toHaveLength(2);
    expect(r.resultRevealed).toBe(false);
  });

  it("전부 공개되면 양측 최종 손패 + 결과 공개다", () => {
    const r = baccaratRevealedThrough(result, steps, steps.length);
    expect(r.playerHand).toEqual(result.playerHand);
    expect(r.bankerHand).toEqual(result.bankerHand);
    expect(r.resultRevealed).toBe(true);
  });

  it("revealedCount는 범위를 벗어나도 클램프된다", () => {
    const over = baccaratRevealedThrough(result, steps, 99);
    expect(over.resultRevealed).toBe(true);
    expect(over.playerHand).toHaveLength(3);
    const under = baccaratRevealedThrough(result, steps, -5);
    expect(under.playerHand).toHaveLength(0);
    expect(under.resultRevealed).toBe(false);
  });
});

describe("baccaratRevealStatusLabel", () => {
  it("측·단계별 공개 안내 텍스트를 만든다", () => {
    expect(
      baccaratRevealStatusLabel({ kind: "deal", side: "player", cardIndex: 0 }),
    ).toBe("플레이어 카드 공개 중");
    expect(
      baccaratRevealStatusLabel({ kind: "deal", side: "banker", cardIndex: 1 }),
    ).toBe("뱅커 카드 공개 중");
    expect(
      baccaratRevealStatusLabel({ kind: "third", side: "banker", cardIndex: 2 }),
    ).toBe("뱅커 세 번째 카드 공개 중");
    expect(baccaratRevealStatusLabel({ kind: "result" })).toBe("결과 공개 중");
  });
});
