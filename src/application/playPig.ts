// Application layer: orchestrates Pig (피그) play vs CPU. Depends on domain only.
// 도메인 규칙(../domain/pig)을 오케스트레이션만 하며 규칙을 재구현하지 않는다.
// 난수는 주입된 RandomSource로만 사용해 결정적·테스트 가능하게 한다.
import type { RandomSource } from "./dealCards";
import { type PigState, applyPigRoll } from "../domain/pig";

export interface PigRollResult {
  /** 굴림을 적용한 새 상태(입력 불변, 도메인 applyPigRoll 결과). */
  state: PigState;
  /** 이번에 나온 주사위 눈(1..6). */
  die: number;
  /** 1이 나와 이번 턴 누계가 소멸하고 차례가 넘어갔는지. */
  busted: boolean;
}

const DEFAULT_HOLD_AT = 20;

/**
 * 주사위 한 개를 rng.nextInt(6)+1 로 굴려 도메인 applyPigRoll에 위임한다(불변).
 * - rng가 1..6을 벗어난 눈을 만들면 throw(범위 검증).
 * - 이미 종료된 state면 도메인 applyPigRoll의 throw를 그대로 전파한다.
 * - busted = (die === 1).
 */
export function rollPigDie(state: PigState, rng: RandomSource): PigRollResult {
  const die = rng.nextInt(6) + 1;
  if (!Number.isInteger(die) || die < 1 || die > 6) {
    throw new Error(`RandomSource produced out-of-range die value: ${die}`);
  }
  const next = applyPigRoll(state, die);
  return { state: next, die, busted: die === 1 };
}

export type PigAction = "roll" | "hold";

/**
 * CPU의 행동을 단순 임계값 전략으로 결정한다(순수·결정적, 난수 미사용, 상태 변형 없음).
 * - 멈추면(hold) 현재 차례의 총점이 목표(target)에 도달하면 "hold".
 * - 이번 턴 누계(turnTotal)가 holdAt 이상이면 "hold".
 * - 그 외에는 "roll".
 * holdAt은 양의 정수여야 하며(기본 20), 아니면 throw.
 * CPU 차례가 아닐 때 호출돼도 state.turn 기준으로 동작한다(상태를 바꾸지 않는다).
 */
export function chooseCpuPigAction(
  state: PigState,
  holdAt: number = DEFAULT_HOLD_AT,
): PigAction {
  if (!Number.isInteger(holdAt) || holdAt < 1) {
    throw new Error(`holdAt must be an integer >= 1, got ${holdAt}`);
  }
  const current = state.turn;
  // 멈추면 목표 도달이면 더 굴릴 이유가 없다.
  if (state.scores[current] + state.turnTotal >= state.target) {
    return "hold";
  }
  // 충분히 쌓였으면 버스트 위험을 피해 멈춘다.
  if (state.turnTotal >= holdAt) {
    return "hold";
  }
  return "roll";
}
