// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import { HwatuCard } from "./hwatu";
import { scoreGwang } from "./goStopScore";
import { scoreYeol } from "./goStopYeol";
import { scoreTti } from "./goStopTti";
import { scorePi } from "./goStopPi";

/** 고스톱 한 손의 카테고리별 점수 내역과 총점. */
export interface GoStopScoreBreakdown {
  /** 광(光) 점수 — scoreGwang */
  gwang: number;
  /** 열끗 점수 — scoreYeol */
  yeol: number;
  /** 띠(단) 점수 — scoreTti */
  tti: number;
  /** 피(皮) 점수 — scorePi */
  pi: number;
  /** 위 4개 카테고리 점수의 단순 합 */
  total: number;
}

/**
 * 먹은 카드 묶음으로 고스톱 네 카테고리(광·열끗·띠·피) 점수와 총점을 한 번에 계산한다.
 * - 각 항목은 기존 score 함수(scoreGwang/scoreYeol/scoreTti/scorePi)에 그대로 위임한다(규칙 복제 없음).
 * - total = gwang + yeol + tti + pi (단순 합). 빈 배열은 모든 항목 0, total 0.
 * - 고/박/멍박/피박 등 승부 배수·보너스는 이번 범위 제외 — 순수 카테고리 합산만 한다.
 * - 유효하지 않은 카드가 섞이면 위임 함수에서 throw(별도 검증 추가 없음).
 * - 입력 배열/원소를 변형하지 않는다.
 */
export function scoreGoStopHand(cards: HwatuCard[]): GoStopScoreBreakdown {
  const gwang = scoreGwang(cards);
  const yeol = scoreYeol(cards);
  const tti = scoreTti(cards);
  const pi = scorePi(cards);

  return {
    gwang,
    yeol,
    tti,
    pi,
    total: gwang + yeol + tti + pi,
  };
}

/**
 * 고스톱 한 손의 총점만 반환하는 편의 함수.
 * - scoreGoStopHand(cards).total 과 동일하다.
 */
export function scoreGoStopTotal(cards: HwatuCard[]): number {
  return scoreGoStopHand(cards).total;
}
