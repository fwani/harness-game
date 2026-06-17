// Presentation helpers for the Poker (포커) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 족보 판정과 승자 결정은
// domain/application(evaluatePokerHand/findPokerWinners/playPokerShowdown)을 재사용하며 여기서
// 재구현하지 않는다. 색에 의존하지 않도록 모두 텍스트 레이블로 표기한다.
import { PokerHandCategory } from "../../domain/pokerHand";
import type { WinSide } from "../records";

/** 족보 카테고리를 한국어 레이블로 매핑한다(약→강). */
const CATEGORY_LABEL: Record<PokerHandCategory, string> = {
  [PokerHandCategory.HighCard]: "하이카드",
  [PokerHandCategory.OnePair]: "원페어",
  [PokerHandCategory.TwoPair]: "투페어",
  [PokerHandCategory.ThreeOfAKind]: "트리플",
  [PokerHandCategory.Straight]: "스트레이트",
  [PokerHandCategory.Flush]: "플러시",
  [PokerHandCategory.FullHouse]: "풀하우스",
  [PokerHandCategory.FourOfAKind]: "포카드",
  [PokerHandCategory.StraightFlush]: "스트레이트 플러시",
};

/** 족보 카테고리를 사람이 읽을 한국어로(예: 풀하우스). */
export function pokerCategoryLabel(category: PokerHandCategory): string {
  return CATEGORY_LABEL[category];
}

/**
 * playPokerShowdown(2명)의 winners 배열을 나(0)=a 기준 WinSide로 매핑한다.
 * - [0]    → "a"(나 승리)
 * - [1]    → "b"(CPU 승리)
 * - [0, 1] → "draw"(무승부, 스플릿)
 * 그 외(빈 배열 등 비정상)는 안전하게 "draw"로 처리한다.
 */
export function winnersToWinSide(winners: number[]): WinSide {
  const hasMe = winners.includes(0);
  const hasCpu = winners.includes(1);
  if (hasMe && !hasCpu) return "a";
  if (hasCpu && !hasMe) return "b";
  return "draw";
}

/** 승패 결과(나=a 기준)를 한국어 레이블로. 색에 의존하지 않도록 텍스트로 표기한다. */
export function pokerOutcomeLabel(winners: number[]): string {
  const side = winnersToWinSide(winners);
  if (side === "a") return "🎉 승리!";
  if (side === "b") return "😢 패배";
  return "🤝 무승부";
}
