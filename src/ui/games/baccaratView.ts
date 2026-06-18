// Presentation helpers for the Baccarat (바카라) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 판정(끗수/타블로)은
// domain/application을 재사용하며 여기서 재구현하지 않는다. 베팅 측 선택·정산은
// baccaratStartOptionsView.ts를 참조한다.
import type { Card } from "../../domain/card";
import type {
  BaccaratOutcome,
  BaccaratRoundResult,
} from "../../application/playBaccaratRound";

/**
 * 한 판 타블로 결과(끗수 비교)를 중립 텍스트로 표기한다. 베팅 적중 여부와 무관한 '핸드 결과'이며,
 * 색에 의존하지 않도록 텍스트로만 구분한다. 베팅 기준 승패는 baccaratBetOutcomeLabel을 쓴다.
 */
export function baccaratOutcomeLabel(outcome: BaccaratOutcome): string {
  if (outcome === "player") {
    return "플레이어 승";
  }
  if (outcome === "banker") {
    return "뱅커 승";
  }
  return "타이";
}

/**
 * 딜링을 한 번에 점프시키지 않고 한 단계씩 공개하기 위한 reveal step.
 * - deal: 초기 2장씩 번갈아(플레이어→뱅커→플레이어→뱅커) 한 장씩.
 * - third: 세 번째 카드(해당 측이 실제로 뽑았을 때만, 표준 punto banco 순서로 플레이어→뱅커).
 * - result: 끗수·핸드 승자·정산을 마지막에 공개.
 */
export type BaccaratRevealStep =
  | { kind: "deal"; side: "player" | "banker"; cardIndex: number }
  | { kind: "third"; side: "player" | "banker"; cardIndex: number }
  | { kind: "result" };

/**
 * 한 판 결과(손패 길이)에서 표준 punto banco 딜링 공개 순서를 결정적으로 유도한다.
 * 도메인 규칙(누가 세 번째 카드를 받는지)은 손패 길이에 이미 반영돼 있으므로 여기서 재구현하지 않는다.
 * 항상 초기 4장(deal) → (있으면)플레이어 3rd → (있으면)뱅커 3rd → result 순서다.
 */
export function baccaratRevealSteps(
  result: BaccaratRoundResult,
): BaccaratRevealStep[] {
  const steps: BaccaratRevealStep[] = [
    { kind: "deal", side: "player", cardIndex: 0 },
    { kind: "deal", side: "banker", cardIndex: 0 },
    { kind: "deal", side: "player", cardIndex: 1 },
    { kind: "deal", side: "banker", cardIndex: 1 },
  ];
  if (result.playerHand.length >= 3) {
    steps.push({ kind: "third", side: "player", cardIndex: 2 });
  }
  if (result.bankerHand.length >= 3) {
    steps.push({ kind: "third", side: "banker", cardIndex: 2 });
  }
  steps.push({ kind: "result" });
  return steps;
}

/** 단계별로 "지금까지 공개된" 손패와 결과 공개 여부. UI가 도메인 손패를 직접 slice 하지 않게 한다. */
export interface BaccaratRevealedHands {
  /** 지금까지 공개된 플레이어 카드(원본 손패의 앞부분 부분집합). */
  playerHand: Card[];
  /** 지금까지 공개된 뱅커 카드(원본 손패의 앞부분 부분집합). */
  bankerHand: Card[];
  /** 마지막 result step까지 도달해 끗수·승자·정산을 공개할 수 있는지. */
  resultRevealed: boolean;
}

/**
 * steps 중 앞에서 revealedCount개가 공개됐다고 할 때, 그 시점에 보여줄 손패 부분집합을 계산한다.
 * revealedCount는 0(아무것도 안 보임) ~ steps.length(전부 공개) 범위로 클램프된다.
 */
export function baccaratRevealedThrough(
  result: BaccaratRoundResult,
  steps: BaccaratRevealStep[],
  revealedCount: number,
): BaccaratRevealedHands {
  const count = Math.max(0, Math.min(revealedCount, steps.length));
  let playerCards = 0;
  let bankerCards = 0;
  let resultRevealed = false;
  for (let i = 0; i < count; i += 1) {
    const step = steps[i]!;
    if (step.kind === "result") {
      resultRevealed = true;
    } else if (step.side === "player") {
      playerCards += 1;
    } else {
      bankerCards += 1;
    }
  }
  return {
    playerHand: result.playerHand.slice(0, playerCards),
    bankerHand: result.bankerHand.slice(0, bankerCards),
    resultRevealed,
  };
}

/** 공개 중인 단계를 색에 의존하지 않는 텍스트로 안내한다(aria-live 표시용). */
export function baccaratRevealStatusLabel(step: BaccaratRevealStep): string {
  if (step.kind === "result") {
    return "결과 공개 중";
  }
  const sideLabel = step.side === "player" ? "플레이어" : "뱅커";
  if (step.kind === "third") {
    return `${sideLabel} 세 번째 카드 공개 중`;
  }
  return `${sideLabel} 카드 공개 중`;
}
