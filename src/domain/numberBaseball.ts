// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 숫자야구(Number Baseball / Bulls & Cows) 핵심 규칙 — 스트라이크/볼 판정·유효성 검사.
// 난수 미사용(비밀 수는 인자로 받는다). 입력은 변형하지 않는다(readonly, 불변).

/** 한 번의 추측 판정 결과. strikes = 자리·숫자 일치, balls = 숫자만 일치(자리 다름). */
export interface BaseballResult {
  strikes: number;
  balls: number;
}

const DEFAULT_LENGTH = 3;

/**
 * 유효한 숫자야구 수인지 검사한다(throw 없이 boolean 반환).
 * - length(기본값 3) 길이일 것.
 * - 각 원소가 0–9 정수일 것.
 * - 모든 자리 숫자가 서로 다를 것(중복 없음).
 */
export function isValidBaseballNumber(
  digits: readonly number[],
  length: number = DEFAULT_LENGTH,
): boolean {
  if (!Number.isInteger(length) || length < 1) return false;
  if (digits.length !== length) return false;
  const seen = new Set<number>();
  for (const d of digits) {
    if (!Number.isInteger(d) || d < 0 || d > 9) return false;
    if (seen.has(d)) return false;
    seen.add(d);
  }
  return true;
}

/**
 * 비밀 수와 추측을 비교해 스트라이크/볼을 판정한다(순수·불변).
 * - secret/guess 모두 같은 길이의 유효한 숫자여야 한다(아니면 throw).
 * - 같은 자리·같은 숫자 = strike, 숫자는 맞지만 자리가 다름 = ball.
 * - 입력이 서로 다른 숫자임이 보장되므로 한 숫자는 strike/ball 중 하나로만 집계된다.
 */
export function evaluateBaseballGuess(
  secret: readonly number[],
  guess: readonly number[],
): BaseballResult {
  const length = secret.length;
  if (!isValidBaseballNumber(secret, length)) {
    throw new Error("evaluateBaseballGuess: secret is not a valid baseball number");
  }
  if (!isValidBaseballNumber(guess, length)) {
    throw new Error(
      "evaluateBaseballGuess: guess is not a valid baseball number or length mismatch",
    );
  }
  let strikes = 0;
  let balls = 0;
  for (let i = 0; i < length; i += 1) {
    const g = guess[i] as number;
    if (g === secret[i]) {
      strikes += 1;
    } else if (secret.includes(g)) {
      balls += 1;
    }
  }
  return { strikes, balls };
}

/**
 * 판정 결과가 정답(전부 스트라이크)인지 반환한다.
 * - result.strikes === length(기본값 3)면 true.
 */
export function isBaseballWin(
  result: BaseballResult,
  length: number = DEFAULT_LENGTH,
): boolean {
  return result.strikes === length;
}
