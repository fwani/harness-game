// Presentation helpers for the Baccarat (바카라) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 판정(끗수/타블로)은
// domain/application을 재사용하며 여기서 재구현하지 않는다.
import type { BaccaratOutcome } from "../../application/playBaccaratRound";
import type { WinSide } from "../records";

/** 바카라 결과를 전적 저장용 승자 측으로 매핑한다: player=a, banker=b, tie=draw. */
export function baccaratWinSide(outcome: BaccaratOutcome): WinSide {
  if (outcome === "player") {
    return "a";
  }
  if (outcome === "banker") {
    return "b";
  }
  return "draw";
}

/** 한 판 결과를 한국어 승패 레이블로(나=player 기준). 색에 의존하지 않도록 텍스트로 표기. */
export function baccaratOutcomeLabel(outcome: BaccaratOutcome): string {
  if (outcome === "player") {
    return "🎉 승리!";
  }
  if (outcome === "banker") {
    return "😢 패배";
  }
  return "🤝 무승부";
}
