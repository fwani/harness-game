// Presentation helper: 도메인/애플리케이션 고스톱 결과를 한국어 표시 모델로 변환만 한다.
// 점수 규칙은 재구현하지 않는다(domain goStopBak / application settleGoStopShowdown 결과를 변환).
import type { HwatuCard } from "../../domain/hwatu";
import type { GoStopFinalScore } from "../../domain/goStopBak";
import type { GoStopShowdownResult } from "../../application/settleGoStopShowdown";
import { classifyHwatuCard, type HwatuCategory } from "../../domain/hwatuCategory";
import { scoreGoStopHand } from "../../domain/goStopTotal";
import { applyGoBonus } from "../../domain/goStopGo";

/** 화면에 표시하기 좋은 형태로 변환한 한 플레이어의 최종 점수. */
export interface GoStopScoreDisplay {
  /** 광/열끗/띠/피 합산 기본 점수(고 보너스 반영 후 값). */
  base: number;
  /** 박(광박/피박)으로 적용된 배수(1·2·4). */
  multiplier: number;
  /** 최종 점수(base * multiplier). */
  total: number;
  /** 적용된 박 플래그의 한국어 라벨(없으면 빈 배열). */
  flagLabels: string[];
}

/**
 * 도메인 GoStopFinalScore를 화면 표시 모델로 변환한다(불변·결정적).
 * flags.gwangbak → "광박", flags.pibak → "피박" 순으로 라벨을 만든다.
 */
export function formatGoStopFinalScore(score: GoStopFinalScore): GoStopScoreDisplay {
  const flagLabels: string[] = [];
  if (score.flags.gwangbak) {
    flagLabels.push("광박");
  }
  if (score.flags.pibak) {
    flagLabels.push("피박");
  }
  return {
    base: score.base,
    multiplier: score.multiplier,
    total: score.total,
    flagLabels,
  };
}

/** 따낸 카드 칩 한 장의 표시 모델(월 + 분류). 색이 아닌 텍스트로 종류를 병기한다(접근성). */
export interface HwatuChipDisplay {
  /** 월(1~12) */
  month: number;
  /** 고스톱 분류(광/열끗/띠/피) */
  category: HwatuCategory;
  /** 칩 라벨 — `${month}월 ${category}` */
  label: string;
}

/**
 * 화투 카드 한 장을 칩 표시 모델로 변환한다(불변·결정적).
 * - 분류는 도메인 classifyHwatuCard에 위임(규칙 복제 없음).
 * - 색 단서에 의존하지 않도록 종류(광/열끗/띠/피)를 텍스트로 병기한다.
 * - 유효하지 않은 카드면 classifyHwatuCard가 throw.
 */
export function describeHwatuCard(card: HwatuCard): HwatuChipDisplay {
  const category = classifyHwatuCard(card);
  return { month: card.month, category, label: `${card.month}월 ${category}` };
}

/**
 * 한 플레이어 최종 점수의 산출 근거 분해(화면 표시용).
 * 카드 기본 점수(광/열끗/띠/피) → 고 보너스(+N) → 고 배수(×M) → 박 배수(×K) → 최종.
 */
export interface GoStopScoreBreakdown {
  /** 광 점수 */
  gwang: number;
  /** 열끗 점수 */
  yeol: number;
  /** 띠 점수 */
  tti: number;
  /** 피 점수 */
  pi: number;
  /** 카드 기본 점수 합(광+열끗+띠+피) — 고/박 반영 전 */
  cardTotal: number;
  /** 외친 고 횟수 */
  goCount: number;
  /** 고 보너스 가산점(= goCount) */
  goBonus: number;
  /** 고 횟수에 따른 배수(0~2고 ×1, 3고 ×2, 4고 ×4, …) */
  goMultiplier: number;
  /** 광박/피박으로 적용된 배수(1·2·4) */
  bakMultiplier: number;
  /** 적용된 박 플래그 라벨(없으면 빈 배열) */
  flagLabels: string[];
  /** 최종 점수 = (cardTotal + goBonus) × goMultiplier × bakMultiplier */
  total: number;
}

/**
 * 따낸 패·고 횟수·최종 점수로 점수 산출 근거를 분해한다(불변·결정적).
 * - 카드 항목별 점수는 도메인 scoreGoStopHand에, 고 보너스·배수는 applyGoBonus에 위임(규칙 복제 없음).
 * - 박 배수·플래그는 application이 계산한 finalScore(GoStopFinalScore)에서 그대로 가져온다
 *   (박은 상대 패가 필요하므로 여기서 재계산하지 않는다).
 * - 불변식: (cardTotal + goBonus) × goMultiplier × bakMultiplier === finalScore.total.
 */
export function buildGoStopScoreBreakdown(
  captured: HwatuCard[],
  goCount: number,
  finalScore: GoStopFinalScore,
): GoStopScoreBreakdown {
  const hand = scoreGoStopHand(captured);
  const go = applyGoBonus(hand.total, goCount);
  return {
    gwang: hand.gwang,
    yeol: hand.yeol,
    tti: hand.tti,
    pi: hand.pi,
    cardTotal: hand.total,
    goCount,
    goBonus: go.bonus,
    goMultiplier: go.multiplier,
    bakMultiplier: finalScore.multiplier,
    flagLabels: formatGoStopFinalScore(finalScore).flagLabels,
    total: finalScore.total,
  };
}

/**
 * 쇼다운 결과를 특정 플레이어(playerSide) 관점의 승패 문구로 변환한다.
 * 색만으로 구분하지 않도록 텍스트 라벨을 반환한다(접근성).
 */
export function describeGoStopOutcome(
  result: GoStopShowdownResult,
  playerSide: "a" | "b",
): string {
  if (result.winner === "draw") {
    return "🤝 무승부";
  }
  if (result.winner === playerSide) {
    return "🎉 승리!";
  }
  return "😢 패배";
}
