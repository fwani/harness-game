// Presentation helpers for the Baccarat (바카라) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 판정(끗수/타블로)은
// domain/application을 재사용하며 여기서 재구현하지 않는다. 베팅 측 선택·정산은
// baccaratStartOptionsView.ts를 참조한다.
import type { BaccaratOutcome } from "../../application/playBaccaratRound";

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
