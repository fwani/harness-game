// Application layer: orchestrates Snakes and Ladders (뱀과 사다리) play. Depends on domain only.
// 도메인 규칙(../domain/snakesAndLadders)을 오케스트레이션만 하며 이동·사다리/뱀·승패 규칙을 재구현하지 않는다.
// 난수는 주입된 RandomSource로만 사용해 결정적·테스트 가능하게 한다.
import type { RandomSource } from "./dealCards";
import {
  type SnakesAndLaddersState,
  type SnakesAndLaddersPlayer,
  applyDiceMove,
} from "../domain/snakesAndLadders";

export interface SnakesAndLaddersRollResult {
  /** 주사위를 굴려 도메인 applyDiceMove를 적용한 새 상태(입력 불변). */
  state: SnakesAndLaddersState;
  /** 이번에 나온 주사위 눈(1..6). */
  die: number;
  /** 이번 굴림으로 움직인 플레이어(굴림 직전 차례). */
  mover: SnakesAndLaddersPlayer;
  /** 이동 전 위치. */
  from: number;
  /** 이동 후(사다리/뱀 해소 포함) 위치. */
  to: number;
  /** 사다리/뱀으로 추가 이동이 발생했는지(from+die 와 최종 위치가 다른지). */
  slid: boolean;
  /** size 초과로 제자리에 머물렀는지(턴만 전환). */
  overshoot: boolean;
}

/**
 * 주사위 한 개를 rng.nextInt(6)+1 로 굴려 도메인 applyDiceMove에 위임한다(불변).
 * - rng가 1..6을 벗어난 눈을 만들면 throw(범위 검증, rollPigDie와 동일 규약).
 * - 이미 종료된 state면 도메인 applyDiceMove의 처리(throw)를 그대로 전파한다.
 * - mover는 굴림 직전 state.turn. slid/overshoot/from/to는 상태 변화로만 산출(규칙 재구현 금지).
 */
export function rollSnakesAndLaddersDie(
  state: SnakesAndLaddersState,
  rng: RandomSource,
): SnakesAndLaddersRollResult {
  const die = rng.nextInt(6) + 1;
  if (!Number.isInteger(die) || die < 1 || die > 6) {
    throw new Error(`RandomSource produced out-of-range die value: ${die}`);
  }
  const mover = state.turn;
  const from = state.positions[mover];
  const next = applyDiceMove(state, die);
  const to = next.positions[mover];

  // 도메인 결과 위치와 입력 위치 비교로만 산출(사다리/뱀·초과 판정 재구현 금지).
  const tentative = from + die;
  const overshoot = tentative > state.size;
  const slid = !overshoot && to !== tentative;

  return { state: next, die, mover, from, to, slid, overshoot };
}

/**
 * 현재 차례 플레이어가 한 턴(주사위 1회)을 진행한 결과를 반환한다.
 * - rollSnakesAndLaddersDie를 호출하는 얇은 래퍼(사람·CPU 공용 한 턴 진입점).
 * - CPU 자동 진행 UI에서 winner가 날 때까지 반복 호출하는 용도.
 */
export function playSnakesAndLaddersTurn(
  state: SnakesAndLaddersState,
  rng: RandomSource,
): SnakesAndLaddersRollResult {
  return rollSnakesAndLaddersDie(state, rng);
}
