// Presentation helpers for the Mancala(만칼라 / Kalah) vs CPU 시작 옵션 폼. Pure functions only —
// 구덩이당 씨앗 수·선공/후공 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트
// 가능하게 한다. 게임 규칙은 다루지 않으며(도메인 createMancalaBoard(pitsPerSide, seedsPerPit) config
// 경로 재사용), 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).
// connectFourStartOptionsView.ts / gomokuStartOptionsView.ts와 동형이다.

import type { MancalaPlayer } from "../../domain/mancala";

/** 사람이 고를 수 있는 시작 옵션. seedsPerPit=구덩이당 씨앗 수, humanFirst=vs CPU에서 사람이 선공(1)인지. */
export interface MancalaStartOptions {
  seedsPerPit: number;
  humanFirst: boolean;
}

/** 선택 가능한 구덩이당 씨앗 수(표준 Kalah 6/4 + 흔한 변형 6/3·6/6). 라벨에 변형명을 명시한다. */
export const MANCALA_SEEDS_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3개 (Kalah 6/3)" },
  { value: 4, label: "4개 (표준 Kalah 6/4)" },
  { value: 6, label: "6개 (Kalah 6/6)" },
];

/** 기본 구덩이당 씨앗 수(표준 Kalah 6/4). */
export const DEFAULT_MANCALA_SEEDS_PER_PIT = 4;

/** vs CPU에서 사람이 선공(player 1)인지의 기본값. */
export const DEFAULT_MANCALA_HUMAN_FIRST = true;

/** 선택 가능한 선공/후공 옵션(라벨 포함). 색·기호 비의존 — 의미를 텍스트로만 전달한다. */
export function mancalaFirstPlayerOptions(): { value: boolean; label: string }[] {
  return [
    { value: true, label: "선공 (내가 먼저)" },
    { value: false, label: "후공 (CPU가 먼저)" },
  ];
}

/** seedsPerPit가 선택 가능한 씨앗 수 중 하나인지(정수·허용 목록) 여부. */
function isAllowedSeeds(seeds: unknown): seeds is number {
  return (
    typeof seeds === "number" &&
    Number.isInteger(seeds) &&
    MANCALA_SEEDS_OPTIONS.some((opt) => opt.value === seeds)
  );
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - seedsPerPit가 정수가 아니거나 허용 목록(3/4/6) 밖이면 DEFAULT_MANCALA_SEEDS_PER_PIT로 대체.
 * - humanFirst가 boolean이 아니면 DEFAULT_MANCALA_HUMAN_FIRST로 대체.
 */
export function normalizeMancalaStartOptions(
  input: Partial<MancalaStartOptions>,
): MancalaStartOptions {
  return {
    seedsPerPit: isAllowedSeeds(input.seedsPerPit)
      ? input.seedsPerPit
      : DEFAULT_MANCALA_SEEDS_PER_PIT,
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_MANCALA_HUMAN_FIRST,
  };
}

/**
 * vs CPU에서 사람이 조작하는 진영(선공이면 1, 후공이면 2).
 * 만칼라는 항상 player 1이 먼저 두므로, 사람이 후공이면 CPU(1)가 시작 시 한 수 둔다.
 */
export function mancalaHumanPlayer(humanFirst: boolean): MancalaPlayer {
  return humanFirst ? 1 : 2;
}
