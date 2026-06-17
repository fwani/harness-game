// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

import type { Hand } from "./rps";
import { judge } from "./rps";

export type Player = "a" | "b";

export interface MukjjippaState {
  /** 현재 공격자. 아직 선공 미정(가위바위보 단계)이면 null. */
  attacker: Player | null;
  /** 게임 종료 여부. */
  finished: boolean;
  /** 승자. 미종료면 null. */
  winner: Player | null;
}

/** 초기 상태: 공격자 미정, 미종료. */
export function createMukjjippaGame(): MukjjippaState {
  return { attacker: null, finished: false, winner: null };
}

/**
 * 양측 손(a, b)으로 한 라운드를 적용해 다음 상태를 만든다(순수 함수, 입력 상태 불변).
 * - attacker가 null(선공 결정 단계): 비기면 그대로 null, 아니면 이긴 쪽이 attacker. 미종료.
 * - attacker가 정해진 상태: 같은 손이면 attacker 승리로 finished, 다르면 이긴 쪽이 새 attacker(미종료).
 * - 이미 finished인 상태가 들어오면 그대로 반환(불변).
 */
export function applyMukjjippaRound(
  state: MukjjippaState,
  a: Hand,
  b: Hand,
): MukjjippaState {
  if (state.finished) {
    return { ...state };
  }

  const result = judge(a, b);

  // 선공 결정 단계: 공격자가 아직 없다.
  if (state.attacker === null) {
    if (result === "draw") {
      return { attacker: null, finished: false, winner: null };
    }
    return {
      attacker: result === "a-win" ? "a" : "b",
      finished: false,
      winner: null,
    };
  }

  // 공격자가 정해진 상태: 같은 손이면 현재 공격자 승리로 종료.
  if (result === "draw") {
    return { attacker: state.attacker, finished: true, winner: state.attacker };
  }

  // 다른 손이면 라운드 승자가 새 공격자(공격권 이동), 미종료.
  return {
    attacker: result === "a-win" ? "a" : "b",
    finished: false,
    winner: null,
  };
}
