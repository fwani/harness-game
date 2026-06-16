// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 경쟁 ELO 레이팅 계산. 한 판 결과로 양측 실력 점수가 오르내린다.
// 난수·시간·식별자 생성 없이 입력만으로 결정적이며, 입력값을 변형하지 않는다.

import type { Outcome } from "./gameRecord";

/**
 * A 관점의 기대 승률(0~1). 표준 로지스틱 식: 1 / (1 + 10^((ratingB - ratingA) / 400)).
 * expectedScore(a, b) + expectedScore(b, a) === 1 이 성립한다.
 * - ratingA/ratingB가 유한수가 아니면 throw.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  if (!Number.isFinite(ratingA) || !Number.isFinite(ratingB)) {
    throw new Error("expectedScore requires finite ratings");
  }
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloUpdate {
  /** 갱신된 A 레이팅(정수, Math.round). */
  ratingA: number;
  /** 갱신된 B 레이팅(정수, Math.round). */
  ratingB: number;
}

/**
 * 한 판 결과(outcome는 A 관점: win=A승, loss=A패, draw=무승부)로 두 레이팅을 갱신한다.
 * scoreA = win→1 / draw→0.5 / loss→0, scoreB = 1 - scoreA.
 * newRatingA = ratingA + K * (scoreA - expectedScore(ratingA, ratingB)), B도 대칭.
 * 결과는 Math.round로 정수화한다. kFactor 기본값 32.
 * - ratingA/ratingB가 유한수가 아니면 throw.
 * - kFactor가 0 이하이거나 유한수가 아니면 throw.
 * - outcome이 "win" | "loss" | "draw" 외 값이면 throw.
 */
export function updateElo(
  ratingA: number,
  ratingB: number,
  outcome: Outcome,
  kFactor = 32,
): EloUpdate {
  if (!Number.isFinite(ratingA) || !Number.isFinite(ratingB)) {
    throw new Error("updateElo requires finite ratings");
  }
  if (!Number.isFinite(kFactor) || kFactor <= 0) {
    throw new Error("updateElo requires a positive finite kFactor");
  }

  let scoreA: number;
  if (outcome === "win") {
    scoreA = 1;
  } else if (outcome === "loss") {
    scoreA = 0;
  } else if (outcome === "draw") {
    scoreA = 0.5;
  } else {
    throw new Error('updateElo requires outcome of "win" | "loss" | "draw"');
  }
  const scoreB = 1 - scoreA;

  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);

  return {
    ratingA: Math.round(ratingA + kFactor * (scoreA - expectedA)),
    ratingB: Math.round(ratingB + kFactor * (scoreB - expectedB)),
  };
}
