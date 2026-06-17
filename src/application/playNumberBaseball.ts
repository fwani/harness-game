// Application layer: orchestrates Number Baseball (Bulls & Cows). Depends on domain only.
// 무작위 비밀 수 생성 + 한 번의 추측 진행. 난수는 RandomSource로 주입(결정적 테스트 가능).
import {
  evaluateBaseballGuess,
  isBaseballWin,
  type BaseballResult,
} from "../domain/numberBaseball";
import type { RandomSource } from "./dealCards";

const DEFAULT_LENGTH = 3;

/**
 * 서로 다른 0–9 숫자 length개로 이루어진 무작위 비밀 수를 생성한다(결정적: rng 주입).
 * - length(기본값 3)는 1–10 범위여야 한다(범위 밖이면 서로 다른 숫자가 불가능 → throw).
 * - 0–9 후보 풀에서 매 자리 남은 후보 중 rng.nextInt로 하나씩 뽑아 중복 없이 채운다.
 * - rng.nextInt가 범위 밖 인덱스를 반환하면 throw(기존 헬퍼와 동일 방어).
 * - 반환값은 항상 isValidBaseballNumber(result, length) === true 를 만족한다.
 */
export function generateSecretBaseballNumber(
  rng: RandomSource,
  length: number = DEFAULT_LENGTH,
): number[] {
  if (!Number.isInteger(length) || length < 1 || length > 10) {
    throw new Error(
      `generateSecretBaseballNumber: length must be an integer in 1..10, got ${length}`,
    );
  }
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const secret: number[] = [];
  for (let i = 0; i < length; i++) {
    const j = rng.nextInt(pool.length);
    if (!Number.isInteger(j) || j < 0 || j >= pool.length) {
      throw new Error(`RandomSource returned out-of-range index: ${j}`);
    }
    secret.push(pool[j]!);
    pool.splice(j, 1);
  }
  return secret;
}

export interface BaseballGuessOutcome {
  result: BaseballResult;
  isWin: boolean;
}

/**
 * 비밀 수와 추측을 비교해 S/B 판정과 정답 여부를 함께 반환한다(순수·불변).
 * - evaluateBaseballGuess로 S/B를 판정하고 isBaseballWin으로 정답 여부를 계산한다.
 * - 유효하지 않은 입력·길이 불일치는 도메인 함수의 throw를 그대로 전파한다.
 * - 입력(secret/guess)을 변형하지 않는다.
 */
export function playBaseballGuess(
  secret: readonly number[],
  guess: readonly number[],
): BaseballGuessOutcome {
  const result = evaluateBaseballGuess(secret, guess);
  return { result, isWin: isBaseballWin(result, secret.length) };
}
