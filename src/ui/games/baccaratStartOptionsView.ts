// Presentation helpers for the Baccarat (바카라) 시작 옵션(베팅 측 선택) 폼. Pure functions only —
// 베팅 선택지(플레이어/뱅커/타이)·기본값·임의 입력 정규화·베팅 기준 정산을 React/DOM에서 분리해
// 단위 테스트 가능하게 한다. 타블로/끗수 판정은 domain/application(playBaccaratRound)을 재사용하고
// 여기서 재구현하지 않는다. 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).
import type { BaccaratOutcome } from "../../application/playBaccaratRound";
import type { WinSide } from "../records";

/** 플레이어가 고를 수 있는 베팅 측. punto banco의 세 가지 표준 베팅. */
export type BaccaratBet = "player" | "banker" | "tie";

/** 베팅 측 기본값(기존 동작과 동일하게 플레이어 베팅으로 고정 시작). */
export const DEFAULT_BACCARAT_BET: BaccaratBet = "player";

/**
 * 베팅 선택 옵션(라벨 포함). 색 비의존: 텍스트(플레이어/뱅커/타이) + 배당으로 구분한다.
 * 표시 순서는 플레이어 → 뱅커 → 타이.
 */
export function baccaratBetOptions(): { value: BaccaratBet; label: string }[] {
  return [
    { value: "player", label: "플레이어 (1:1)" },
    { value: "banker", label: "뱅커 (1:1)" },
    { value: "tie", label: "타이 (8:1)" },
  ];
}

/**
 * 임의 입력을 안전한 베팅 측으로 정규화한다(순수·결정적, 입력 불변).
 * - "player"/"banker"/"tie"가 아니면 DEFAULT_BACCARAT_BET로 대체.
 */
export function normalizeBaccaratBet(input: unknown): BaccaratBet {
  if (input === "player" || input === "banker" || input === "tie") {
    return input;
  }
  return DEFAULT_BACCARAT_BET;
}

/**
 * 선택한 베팅 측과 한 판 타블로 결과로 정산해 전적 저장용 WinSide를 만든다(나 기준: a=적중/b=빗나감).
 * - 타이가 나오면 플레이어·뱅커 베팅은 무효 환원(푸시) → "draw".
 * - 타이가 나오면 타이 베팅은 적중 → "a".
 * - 타이가 아니면 베팅 측과 승자 측이 같으면 적중("a"), 다르면 빗나감("b"). 타이 베팅은 항상 빗나감.
 */
export function baccaratBetResult(bet: BaccaratBet, outcome: BaccaratOutcome): WinSide {
  if (outcome === "tie") {
    return bet === "tie" ? "a" : "draw";
  }
  return outcome === bet ? "a" : "b";
}

/** 베팅 정산 결과를 한국어 레이블로(색 비의존, 기호+텍스트). 푸시(타이 시 환원)도 명시한다. */
export function baccaratBetOutcomeLabel(bet: BaccaratBet, outcome: BaccaratOutcome): string {
  const result = baccaratBetResult(bet, outcome);
  if (result === "a") {
    return "🎉 베팅 적중! 승리";
  }
  if (result === "b") {
    return "😢 베팅 빗나감 — 패배";
  }
  return "🤝 타이 — 베팅 무효 환원(푸시)";
}
