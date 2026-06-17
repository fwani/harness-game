// Presentation helper: 도메인/애플리케이션 고스톱 결과를 한국어 표시 모델로 변환만 한다.
// 점수 규칙은 재구현하지 않는다(domain goStopBak / application settleGoStopShowdown 결과를 변환).
import type { GoStopFinalScore } from "../../domain/goStopBak";
import type { GoStopShowdownResult } from "../../application/settleGoStopShowdown";

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
