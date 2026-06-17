// Application layer: 묵찌빠(Mukjjippa) 한 라운드 진행 + 무작위 CPU 손 선택 헬퍼.
// 도메인 규칙(mukjjippa/rps)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playNim.ts / playRps.ts와 동일한 패턴: 도메인 규칙을 재사용하고 난수는 주입받는다(규칙 재구현 금지).
import type { Hand } from "../domain/rps";
import type { MukjjippaState } from "../domain/mukjjippa";
import { applyMukjjippaRound } from "../domain/mukjjippa";
import type { RandomSource } from "./dealCards";

/** nextInt(3)의 0/1/2 → rock/paper/scissors 매핑(결정적). */
const HANDS: readonly Hand[] = ["rock", "paper", "scissors"];

/**
 * rng.nextInt(3)으로 묵(rock)/찌(scissors)/빠(paper) 중 하나를 결정적으로 고른다.
 * - idx = rng.nextInt(3)로 HANDS[idx]를 선택한다(0=rock, 1=paper, 2=scissors).
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다(방어적).
 */
export function chooseRandomMukjjippaHand(rng: RandomSource): Hand {
  const idx = rng.nextInt(HANDS.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= HANDS.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return HANDS[idx]!;
}

/** 한 라운드(턴) 진행 결과: 양측이 낸 손 + 적용 후 상태. */
export interface MukjjippaTurnResult {
  /** a(사람)가 낸 손. */
  a: Hand;
  /** b(CPU)가 낸 손. */
  b: Hand;
  /** 적용 후 상태(attacker/finished/winner). */
  state: MukjjippaState;
}

/**
 * 양측 손(a, b)을 받아 한 라운드를 진행한다(오케스트레이션만, 규칙은 도메인에 위임).
 * - 이미 finished인 상태가 들어오면 상태 불변으로 그대로 반환(입력 손은 그대로 echo).
 * - 그 외에는 applyMukjjippaRound로 다음 상태를 계산한다(선공 결정·공격자 유지/전환·종료 판정은 도메인 규칙).
 * - 입력 state를 변형하지 않는다(도메인 applyMukjjippaRound가 새 상태를 반환).
 */
export function playMukjjippaTurn(
  state: MukjjippaState,
  a: Hand,
  b: Hand,
): MukjjippaTurnResult {
  if (state.finished) {
    return { a, b, state: { ...state } };
  }
  return { a, b, state: applyMukjjippaRound(state, a, b) };
}
