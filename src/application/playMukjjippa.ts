// Application layer: 묵찌빠(Mukjjippa) 한 라운드 진행 + 무작위 CPU 손 선택 헬퍼.
// 도메인 규칙(mukjjippa/rps)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playRps.ts / playNim.ts와 동일한 패턴: 도메인의 라운드 적용 규칙을 재사용하고
// 난수는 주입받는다(규칙 재구현 금지 — application은 오케스트레이션만).
import type { Hand } from "../domain/rps";
import { applyMukjjippaRound, type MukjjippaState } from "../domain/mukjjippa";
import type { RandomSource } from "./dealCards";

/** nextInt(3) 인덱스 → 손 매핑(결정적 테스트 가능). 0=묵(rock)/1=빠(paper)/2=찌(scissors). */
const HANDS: ReadonlyArray<Hand> = ["rock", "paper", "scissors"];

/**
 * RandomSource로 rock/paper/scissors 중 하나를 균등 선택해 반환한다.
 * - idx = rng.nextInt(3)로 결정적으로 고른다(테스트 가능).
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다(방어적).
 */
export function chooseRandomMukjjippaHand(rng: RandomSource): Hand {
  const idx = rng.nextInt(HANDS.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= HANDS.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return HANDS[idx]!;
}

/** 한 라운드 진행 결과: 양측이 낸 손 + 적용 후 상태(attacker/finished/winner). */
export interface MukjjippaTurnResult {
  a: Hand;
  b: Hand;
  /** applyMukjjippaRound 적용 후 상태(불변: 입력 state는 변형하지 않는다). */
  state: MukjjippaState;
}

/**
 * 양측 손(a, b)으로 한 라운드를 진행한다(도메인 applyMukjjippaRound에 위임, 규칙 재구현 금지).
 * - 이미 finished인 상태가 들어오면 상태 불변으로 그대로 반환(입력 손은 그대로 echo).
 * - 선공 결정 단계 비기면 attacker 유지, 공격자 결정 후 같은 손이면 공격자 승리 종료,
 *   다르면 라운드 승자가 새 공격자(공격권 이동) — 모두 도메인 규칙 그대로.
 * - 입력 state를 변형하지 않는다(도메인이 새 상태 객체를 반환).
 */
export function playMukjjippaTurn(
  state: MukjjippaState,
  a: Hand,
  b: Hand,
): MukjjippaTurnResult {
  if (state.finished) {
    return { a, b, state };
  }
  return { a, b, state: applyMukjjippaRound(state, a, b) };
}
