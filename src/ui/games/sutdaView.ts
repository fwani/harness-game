// Presentation helpers for the Sutda (섯다) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 등급(땡/특수패/끗) 판정과
// 승패 결정은 domain/application(evaluateSutdaHand/compareSutdaHands/playSutdaRound)을 재사용하며
// 여기서 재구현하지 않는다. 색에 의존하지 않도록 모두 텍스트 레이블로 표기한다.
import type { SutdaCategory, SutdaHandRank } from "../../domain/sutda";
import type { WinSide } from "../records";

/** 섯다 카테고리를 한국어 레이블로 매핑한다: ddaeng→땡, special→특수패, kkut→끗. */
const CATEGORY_LABEL: Record<SutdaCategory, string> = {
  ddaeng: "땡",
  special: "특수패",
  kkut: "끗",
};

/** 카테고리만 한국어로(예: "땡"). */
export function sutdaCategoryLabel(category: SutdaCategory): string {
  return CATEGORY_LABEL[category];
}

/**
 * 손패 등급을 사람이 읽을 한국어 레이블로(카테고리+value 병행).
 * - 땡: `${value}땡`(예: 10땡)
 * - 끗: `${value}끗`(예: 9끗, 0은 망통)
 * - 특수패: `특수패(강도 ${value})`
 */
export function sutdaRankLabel(rank: SutdaHandRank): string {
  if (rank.category === "ddaeng") {
    return `${rank.value}땡`;
  }
  if (rank.category === "kkut") {
    return `${rank.value}끗`;
  }
  return `특수패(강도 ${rank.value})`;
}

/**
 * 한 판 결과(나=a 기준)를 한국어 승패 레이블로. playSutdaRound의 result는 이미 WinSide와 동일.
 * 색에 의존하지 않도록 텍스트로 표기한다.
 */
export function sutdaOutcomeLabel(result: WinSide): string {
  if (result === "a") {
    return "🎉 승리!";
  }
  if (result === "b") {
    return "😢 패배";
  }
  return "🤝 무승부";
}
