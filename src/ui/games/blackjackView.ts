// Presentation helpers for the Blackjack (블랙잭) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 규칙(손패 합계/승패)은
// domain/application을 재사용하며 여기서 재구현하지 않는다.
import type { Card } from "../../domain/card";
import { evaluateBlackjackHand } from "../../domain/blackjack";
import type { BlackjackOutcome } from "../../application/playBlackjack";
import type { WinSide } from "../records";

/** 블랙잭 결과를 전적 저장용 승자 측으로 매핑한다: 플레이어=a, 딜러=b, 푸시=draw. */
export function blackjackWinSide(outcome: BlackjackOutcome): WinSide {
  if (outcome === "player") return "a";
  if (outcome === "dealer") return "b";
  return "draw";
}

/**
 * 손패 합계를 화면용 라벨로 만든다. 버스트면 "버스트(합)", 내추럴이면 "블랙잭", 그 외엔 합계 숫자.
 * 합 계산은 domain evaluateBlackjackHand에 위임한다(재구현 금지).
 */
export function handTotalLabel(cards: Card[]): string {
  const value = evaluateBlackjackHand(cards);
  if (value.isBust) return `버스트(${value.total})`;
  if (value.isBlackjack) return "블랙잭";
  return String(value.total);
}
