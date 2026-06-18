// Presentation helpers for the Chess(체스) vs CPU 시작 옵션 폼. Pure functions only —
// 색(백/흑) 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 게임 규칙은 다루지 않으며(도메인 chess·application startChessGame 경로 재사용), 부수효과·난수·시간
// 없는 표시/검증용 변환만 둔다(입력 불변). connectFourStartOptionsView.ts와 동형이다.
//
// 체스는 표준 8×8 고정 보드이고 백이 항상 선착(White moves first)하므로 보드 크기 옵션은 없고,
// 사람이 어느 색(백 선공/흑 후공)을 잡을지 하나만 방(room) 옵션으로 둔다 — 흑을 고르면 CPU(백)가 선착.

import type { ChessColor } from "../../domain/chess";

/** 사람이 고를 수 있는 시작 옵션. humanWhite=vs CPU에서 사람이 백(♔·선공)인지. */
export interface ChessStartOptions {
  humanWhite: boolean;
}

/** vs CPU에서 사람이 백(♔·선공)인지의 기본값(기존 동작 보존: 사람=백·선공). */
export const DEFAULT_CHESS_HUMAN_WHITE = true;

/** 선택 가능한 백/흑 옵션(라벨 포함). 색에 비의존하도록 자형(♔/♚)+텍스트로 의미를 명시한다. */
export function chessColorOptions(): { value: boolean; label: string }[] {
  return [
    { value: true, label: "사람 백(♔) 선공" },
    { value: false, label: "사람 흑(♚) 후공" },
  ];
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - humanWhite가 boolean이 아니면 DEFAULT_CHESS_HUMAN_WHITE로 대체.
 */
export function normalizeChessStartOptions(
  input: Partial<ChessStartOptions>,
): ChessStartOptions {
  return {
    humanWhite:
      typeof input.humanWhite === "boolean"
        ? input.humanWhite
        : DEFAULT_CHESS_HUMAN_WHITE,
  };
}

/**
 * vs CPU에서 사람이 조작하는 색(백이면 "white", 흑이면 "black").
 * 체스는 항상 백이 먼저 두므로, 사람이 흑이면 CPU(백)가 시작 시 한 수 둔다.
 */
export function chessHumanColor(humanWhite: boolean): ChessColor {
  return humanWhite ? "white" : "black";
}

/**
 * 사람이 흑(후공)을 고르면 백은 CPU이므로 시작 시 CPU(백)가 선착해야 한다.
 * UI가 새 게임 시작 시 CPU 선수를 둘지 판단하는 데 사용(humanWhite=false → true).
 */
export function cpuPlaysFirst(humanWhite: boolean): boolean {
  return !humanWhite;
}
