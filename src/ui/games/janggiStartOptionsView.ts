// Presentation helpers for the Janggi(장기) vs CPU 시작 옵션 폼. Pure functions only —
// 내 진영(초/한) 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트
// 가능하게 한다. 게임 규칙은 다루지 않으며(도메인 janggi·application startGame 경로 재사용),
// 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변). chessStartOptionsView.ts·
// gomokuStartOptionsView.ts와 동형이다.
//
// 도메인 startGame은 항상 초(楚)가 선착하므로 선착 규칙은 그대로 두고, 사람이 어느 진영
// (초 선공/한 후공)을 잡을지 하나만 방(room) 옵션으로 둔다 — 한을 고르면 CPU(초)가 선착.

import type { Side } from "../../domain/janggi";

/** 사람이 고를 수 있는 시작 옵션. humanSide=vs CPU에서 사람이 잡는 진영. */
export interface JanggiStartOptions {
  humanSide: Side;
}

/** 기본 시작 옵션(기존 동작 보존: 사람=초·선착). */
export const DEFAULT_JANGGI_OPTIONS: JanggiStartOptions = { humanSide: "cho" };

/**
 * 선택 가능한 진영 옵션(라벨 포함). 색에 비의존하도록 한자(楚/漢)+선/후공 텍스트로 의미를 명시한다.
 * 표시 순서는 초(선공) → 한(후공).
 */
export function janggiSideOptions(): { value: Side; label: string }[] {
  return [
    { value: "cho", label: "초(楚) · 선공" },
    { value: "han", label: "한(漢) · 후공" },
  ];
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - humanSide가 "cho"/"han"이 아니거나 누락이면 DEFAULT_JANGGI_OPTIONS로 대체.
 */
export function normalizeJanggiOptions(raw: unknown): JanggiStartOptions {
  if (raw !== null && typeof raw === "object" && "humanSide" in raw) {
    const value = (raw as { humanSide: unknown }).humanSide;
    if (value === "cho" || value === "han") {
      return { humanSide: value };
    }
  }
  return { ...DEFAULT_JANGGI_OPTIONS };
}

/**
 * 사람이 한(漢, 후공)을 고르면 초는 CPU이므로 시작 시 CPU(초)가 선착해야 한다.
 * 도메인 startGame은 항상 초가 먼저 두므로 humanSide==="han"이면 true.
 * UI가 새 게임 시작 시 CPU 선수를 둘지 판단하는 데 사용.
 */
export function cpuPlaysFirst(opts: JanggiStartOptions): boolean {
  return opts.humanSide === "han";
}
