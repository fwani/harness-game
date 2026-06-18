// Presentation helpers for the Connect Four(커넥트포·사목) vs CPU 시작 옵션 폼. Pure functions only —
// 선공/후공 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 게임 규칙은 다루지 않으며(도메인 dropDisc·createConnectFourBoard 경로 재사용), 부수효과·난수·시간
// 없는 표시/검증용 변환만 둔다(입력 불변). gomokuStartOptionsView.ts와 동형이다.
//
// 커넥트포는 표준 7×6 고정 보드(createConnectFourBoard()가 인자 없음)이므로 보드 크기 옵션은 없고,
// 선공 여부 하나만 방(room) 옵션으로 둔다 — 선공이 완전 정보 하에서 필승이 증명된 게임이라 유의미하다.

import type { Player } from "../../domain/connectFour";

/** 사람이 고를 수 있는 시작 옵션. humanFirst=vs CPU에서 사람이 선공(●·player 1)인지. */
export interface ConnectFourStartOptions {
  humanFirst: boolean;
}

/** vs CPU에서 사람이 선공(●)인지의 기본값. */
export const DEFAULT_CONNECT_FOUR_HUMAN_FIRST = true;

/** 선택 가능한 선공/후공 옵션(라벨 포함). 색(●/○)에 비의존하도록 라벨에 의미를 명시한다. */
export function connectFourFirstPlayerOptions(): { value: boolean; label: string }[] {
  return [
    { value: true, label: "선공 (● 내가 먼저)" },
    { value: false, label: "후공 (○ CPU가 먼저)" },
  ];
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - humanFirst가 boolean이 아니면 DEFAULT_CONNECT_FOUR_HUMAN_FIRST로 대체.
 */
export function normalizeConnectFourStartOptions(
  input: Partial<ConnectFourStartOptions>,
): ConnectFourStartOptions {
  return {
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_CONNECT_FOUR_HUMAN_FIRST,
  };
}

/**
 * vs CPU에서 사람이 조작하는 진영(선공이면 1=●, 후공이면 2=○).
 * 커넥트포는 항상 player 1(●)이 먼저 두므로, 사람이 후공이면 CPU(●)가 시작 시 한 수 둔다.
 */
export function connectFourHumanPlayer(humanFirst: boolean): Player {
  return humanFirst ? 1 : 2;
}
