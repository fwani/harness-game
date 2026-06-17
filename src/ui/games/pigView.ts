// Presentation helpers for the 피그(Pig) screen. 규칙·CPU 전략·난수는 domain(pig)·application(playPig)을
// 그대로 호출하고 여기서 재구현하지 않는다. 화면 표시용 라벨/로그 포매팅과, 주입된 RandomSource로 한 CPU
// 턴을 끝까지 진행하는 얇은 오케스트레이션만 둔다(컴포넌트 분기 최소화·단위 테스트 가능).
import type { PigPlayer, PigState } from "../../domain/pig";
import { applyPigHold } from "../../domain/pig";
import { chooseCpuPigAction, rollPigDie } from "../../application/playPig";
import type { RandomSource } from "../../application/dealCards";
import type { WinSide } from "../records";
import { dieFace } from "./diceView";

// vs CPU: 사람=선공("a")·CPU=후공("b"). 표시와 기록이 같은 매핑을 쓰도록 한곳에 둔다.
export const PIG_HUMAN: PigPlayer = "a";
export const PIG_CPU: PigPlayer = "b";

/** 플레이어를 화면용 한국어 라벨로 변환한다(색 비의존 텍스트). */
export function pigPlayerLabel(player: PigPlayer): string {
  return player === PIG_HUMAN ? "나" : "CPU";
}

/** 현재 차례(또는 종료 시 승자)를 한 줄로 표시한다. */
export function pigTurnLabel(state: PigState): string {
  if (state.winner !== null) {
    return `${pigPlayerLabel(state.winner)} 승리`;
  }
  return `${pigPlayerLabel(state.turn)} 차례`;
}

/** 이번 턴 임시 누계 라벨. */
export function pigTurnTotalLabel(state: PigState): string {
  return `이번 턴 누계 ${state.turnTotal}점`;
}

/** 한 플레이어의 확정 총점 라벨(예: "나 42점"). */
export function pigScoreLabel(state: PigState, player: PigPlayer): string {
  return `${pigPlayerLabel(player)} ${state.scores[player]}점`;
}

/** 목표 점수 라벨. */
export function pigGoalLabel(state: PigState): string {
  return `목표 ${state.target}점`;
}

/**
 * 주사위 눈을 색이 아니라 점 기호 + 숫자로 함께 표시한다(색 비의존).
 * 예: 3 → "⚂ 3". 1..6 범위를 벗어나면 dieFace가 throw한다(조용한 무시 금지).
 */
export function pigDieLabel(die: number): string {
  return `${dieFace(die)} ${die}`;
}

/** 진행/승패 상황을 플레이어용 한국어 문구로 변환한다(순수·결정적). */
export function describePigStatus(state: PigState): string {
  if (state.winner !== null) {
    return state.winner === PIG_HUMAN
      ? "🎉 목표 점수에 먼저 도달했습니다. 승리!"
      : "😢 CPU가 먼저 목표 점수에 도달했습니다. 패배.";
  }
  return state.turn === PIG_HUMAN
    ? "굴리기로 점수를 쌓고 멈추기로 확정하세요. 1이 나오면 이번 턴 누계가 사라집니다."
    : "CPU가 진행 중입니다…";
}

/** 종료 상태에서 승자 측 기록 값(a/b)으로 변환한다. 표준 플레이엔 무승부가 없다. */
export function pigWinSide(winner: PigPlayer): WinSide {
  return winner === PIG_HUMAN ? "a" : "b";
}

/** CPU 한 턴의 진행 로그 한 항목. */
export type PigCpuLogEntry =
  | { kind: "roll"; die: number }
  | { kind: "bust"; die: number }
  | { kind: "hold"; gained: number };

/** CPU 진행 로그 한 줄을 한국어로 포매팅한다(굴림/버스트/멈춤, 색 비의존). */
export function formatPigCpuLog(entry: PigCpuLogEntry): string {
  switch (entry.kind) {
    case "roll":
      return `굴림 ${pigDieLabel(entry.die)}`;
    case "bust":
      return `버스트! ${pigDieLabel(entry.die)} — 이번 턴 누계 소멸`;
    case "hold":
      return `멈춤 — 이번 턴 +${entry.gained}점 확정`;
  }
}

export interface PigCpuTurnResult {
  /** CPU 턴을 끝까지 진행한 새 상태(불변; 사람 차례로 복귀하거나 CPU 승리). */
  state: PigState;
  /** 진행 로그(굴림들 뒤에 버스트 또는 멈춤으로 종료). */
  log: PigCpuLogEntry[];
}

/**
 * CPU 한 턴을 chooseCpuPigAction + rollPigDie/applyPigHold로 끝까지 자동 진행한다(불변).
 * - 멈춤 결정 시 applyPigHold로 점수 확정 후 종료(승리하거나 사람 차례로 전환).
 * - 굴려서 1이 나오면(버스트) 누계 소멸 후 사람 차례로 전환하며 종료.
 * - 그 외 눈이면 누계를 쌓고 계속 굴린다.
 * 정상 전략은 holdAt/버스트로 반드시 종료되지만, 비정상 rng로 인한 무한 루프를 막기 위한 안전 가드를 둔다.
 */
export function runCpuPigTurn(
  state: PigState,
  rng: RandomSource,
  holdAt?: number,
): PigCpuTurnResult {
  const log: PigCpuLogEntry[] = [];
  let current = state;
  for (let guard = 0; guard < 1000; guard += 1) {
    if (current.winner !== null || current.turn !== PIG_CPU) {
      break;
    }
    if (chooseCpuPigAction(current, holdAt) === "hold") {
      const gained = current.turnTotal;
      current = applyPigHold(current);
      log.push({ kind: "hold", gained });
      break;
    }
    const result = rollPigDie(current, rng);
    current = result.state;
    if (result.busted) {
      log.push({ kind: "bust", die: result.die });
      break;
    }
    log.push({ kind: "roll", die: result.die });
  }
  return { state: current, log };
}
