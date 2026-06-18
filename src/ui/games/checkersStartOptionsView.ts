// Presentation helpers for the Checkers(체커·서양 장기) vs CPU 시작 옵션 폼. Pure functions only —
// 선공(흑)/후공(백) 선택지·기본값·임의 입력 정규화(검증)·사람 색 매핑을 React/DOM에서 분리해
// 단위 테스트 가능하게 한다. 게임 규칙은 다루지 않으며(도메인 checkers·application playCheckers
// 경로 재사용), 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).
// connectFourStartOptionsView.ts / chessStartOptionsView.ts와 동형이다.
//
// 체커는 표준 8×8 고정 보드이고 흑(dark)이 항상 선착(Black moves first)하므로 보드 크기 옵션은 없고,
// 사람이 어느 색(흑 선공/백 후공)을 잡을지 하나만 방(room) 옵션으로 둔다 — 백을 고르면 CPU(흑)가 선착.

import type { CheckersColor } from "../../domain/checkers";

/** 사람이 고를 수 있는 시작 옵션. humanFirst=vs CPU에서 사람이 선공(●·흑)인지. */
export interface CheckersStartOptions {
  humanFirst: boolean;
}

/** vs CPU에서 사람이 선공(●·흑)인지의 기본값(기존 동작 보존: 사람=흑·선공). */
export const DEFAULT_CHECKERS_HUMAN_FIRST = true;

/** 선택 가능한 선공/후공 옵션(라벨 포함). 색에 비의존하도록 기호(●/○)+텍스트로 의미를 명시한다. */
export function checkersFirstPlayerOptions(): { value: boolean; label: string }[] {
  return [
    { value: true, label: "선공 (● 흑, 내가 먼저)" },
    { value: false, label: "후공 (○ 백, CPU가 먼저)" },
  ];
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - humanFirst가 boolean이 아니면 DEFAULT_CHECKERS_HUMAN_FIRST로 대체.
 */
export function normalizeCheckersStartOptions(
  input: Partial<CheckersStartOptions>,
): CheckersStartOptions {
  return {
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_CHECKERS_HUMAN_FIRST,
  };
}

/**
 * vs CPU에서 사람이 조작하는 색(선공이면 "dark"=흑, 후공이면 "light"=백). CPU 색은 그 반대.
 * 체커는 항상 흑(dark)이 먼저 두므로, 사람이 후공(백)이면 CPU(흑)가 시작 시 한 수 둔다.
 */
export function checkersHumanColor(humanFirst: boolean): CheckersColor {
  return humanFirst ? "dark" : "light";
}

/**
 * 사람이 후공(백)을 고르면 흑은 CPU이므로 시작 시 CPU(흑)가 선착해야 한다.
 * UI가 새 게임 시작 시 CPU 선수를 둘지 판단하는 데 사용(humanFirst=false → true).
 */
export function cpuPlaysFirst(humanFirst: boolean): boolean {
  return !humanFirst;
}
