// Presentation helper for the 묵찌빠(Mukjjippa) vs CPU 화면. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 규칙(라운드 적용·승자)은
// application(playMukjjippa)·domain(mukjjippa)을 재사용하며 여기서 재구현하지 않는다
// (ticTacToeCpuView.ts와 동일 패턴).
import type { Hand } from "../../domain/rps";
import type { MukjjippaState, Player } from "../../domain/mukjjippa";
import {
  chooseRandomMukjjippaHand,
  playMukjjippaTurn,
  type MukjjippaTurnResult,
} from "../../application/playMukjjippa";
import type { RandomSource } from "../../application/dealCards";
import type { WinSide } from "../records";

// vs CPU 고정 배정: 사람=a, CPU=b. 색만이 아니라 라벨/기호로 손을 구분한다.
export const HUMAN: Player = "a";
export const CPU: Player = "b";

/** 화면에 노출할 손 메타: 한국어 라벨(묵/찌/빠) + 색 비의존 기호. */
export interface MukjjippaHandChoice {
  hand: Hand;
  label: string;
  symbol: string;
}

/** 버튼 노출 순서(묵/찌/빠). 묵=바위, 찌=가위, 빠=보. */
export const MUKJJIPPA_HANDS: ReadonlyArray<MukjjippaHandChoice> = [
  { hand: "rock", label: "묵", symbol: "✊" },
  { hand: "scissors", label: "찌", symbol: "✌️" },
  { hand: "paper", label: "빠", symbol: "✋" },
];

const HAND_META: Record<Hand, MukjjippaHandChoice> = {
  rock: MUKJJIPPA_HANDS[0]!,
  scissors: MUKJJIPPA_HANDS[1]!,
  paper: MUKJJIPPA_HANDS[2]!,
};

/** "묵(✊)"처럼 라벨+기호로 손을 표기한다(색 비의존). */
export function mukjjippaHandLabel(hand: Hand): string {
  const meta = HAND_META[hand];
  return `${meta.label}(${meta.symbol})`;
}

/** 플레이어(a/b)를 사람/CPU 한국어 라벨로 바꾼다. */
export function mukjjippaPlayerLabel(player: Player): string {
  return player === HUMAN ? "사람" : "CPU";
}

/** 현재 단계 라벨: 선공 미정이면 선공 결정 중, 종료면 종료, 그 외 공격 중. */
export function mukjjippaStageLabel(state: MukjjippaState): string {
  if (state.finished) {
    return "종료";
  }
  if (state.attacker === null) {
    return "선공 결정 중 (가위바위보)";
  }
  return "공격 중";
}

/** 현재 공격자 라벨: 미정이면 "미정", 정해졌으면 사람/CPU. */
export function mukjjippaAttackerLabel(state: MukjjippaState): string {
  if (state.attacker === null) {
    return "미정";
  }
  return mukjjippaPlayerLabel(state.attacker);
}

/** 종료 시 승자 안내(미종료면 null). 사람/CPU 승을 구분한다. */
export function mukjjippaOutcomeLabel(state: MukjjippaState): string | null {
  if (!state.finished || state.winner === null) {
    return null;
  }
  return state.winner === HUMAN ? "사람 승리! 🎉" : "CPU 승리! 😢";
}

/**
 * 종료 시 전적 저장에 쓸 승패 side(미종료면 null).
 * 묵찌빠는 무승부로 끝나지 않으므로 a/b 둘 중 하나다(사람=a, CPU=b).
 */
export function mukjjippaWinSide(state: MukjjippaState): WinSide | null {
  if (!state.finished || state.winner === null) {
    return null;
  }
  return state.winner === HUMAN ? "a" : "b";
}

/**
 * 사람이 낸 손으로 한 라운드를 진행한다(CPU 손은 RandomSource로 뽑는다).
 * - 사람=a, CPU=b로 고정해 chooseRandomMukjjippaHand + playMukjjippaTurn에 위임한다(규칙 재구현 금지).
 * - 이미 finished인 상태면 playMukjjippaTurn이 불변으로 반환한다(입력 손 echo).
 * - 입력 state를 변형하지 않는다(난수 외 결정적).
 */
export function playMukjjippaCpuRound(
  state: MukjjippaState,
  humanHand: Hand,
  rng: RandomSource,
): MukjjippaTurnResult {
  const cpuHand = chooseRandomMukjjippaHand(rng);
  return playMukjjippaTurn(state, humanHand, cpuHand);
}
