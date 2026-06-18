// Application layer: 마스터마인드 무작위 비밀 코드 생성 + 한 추측 진행(턴 오케스트레이션).
// domain(mastermind)과 RandomSource 포트에만 의존한다. infrastructure/ui 의존 금지.
// 채점·추측 적용·승패 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다.
// 무작위는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼와 동일 패턴).
import {
  applyMastermindGuess,
  createMastermind,
  isMastermindLost,
  isMastermindWon,
  scoreMastermindGuess,
  type MastermindFeedback,
  type MastermindState,
  type Peg,
} from "../domain/mastermind";
import type { RandomSource } from "./dealCards";

/** 마스터마인드 한 판의 진행 상태(승리 우선). */
export type MastermindStatus = "playing" | "won" | "lost";

/** 기본 게임 파라미터(codeLength=4, colorCount=6, maxGuesses=10). */
export const MASTERMIND_DEFAULTS = {
  codeLength: 4,
  colorCount: 6,
  maxGuesses: 10,
} as const;

/**
 * 무작위 비밀 코드를 생성한다(각 칸 0..colorCount-1, random.nextInt(colorCount)).
 * - codeLength/colorCount는 1 이상의 정수여야 함(아니면 한국어 사유로 throw).
 * - nextInt가 범위를 벗어난 값을 주면 throw.
 * - 같은 random 시퀀스면 결정적으로 같은 코드.
 */
export function generateMastermindSecret(
  random: RandomSource,
  options: { codeLength: number; colorCount: number },
): Peg[] {
  const { codeLength, colorCount } = options;
  if (!Number.isInteger(codeLength) || codeLength < 1) {
    throw new Error(
      `마스터마인드 잘못된 코드 길이: codeLength는 1 이상의 정수여야 함(받은 값: ${codeLength})`,
    );
  }
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new Error(
      `마스터마인드 잘못된 색 개수: colorCount는 1 이상의 정수여야 함(받은 값: ${colorCount})`,
    );
  }
  const secret: Peg[] = [];
  for (let i = 0; i < codeLength; i += 1) {
    const peg = random.nextInt(colorCount);
    if (!Number.isInteger(peg) || peg < 0 || peg >= colorCount) {
      throw new Error(`RandomSource returned out-of-range peg: ${peg}`);
    }
    secret.push(peg);
  }
  return secret;
}

/**
 * 새 마스터마인드 한 판을 시작한다.
 * 무작위 비밀 코드를 생성해 도메인 createMastermind(secret, { colorCount, maxGuesses })에 위임한다.
 * options 미지정 항목은 MASTERMIND_DEFAULTS에 위임.
 */
export function startMastermindGame(
  random: RandomSource,
  options?: { codeLength?: number; colorCount?: number; maxGuesses?: number },
): MastermindState {
  const codeLength = options?.codeLength ?? MASTERMIND_DEFAULTS.codeLength;
  const colorCount = options?.colorCount ?? MASTERMIND_DEFAULTS.colorCount;
  const maxGuesses = options?.maxGuesses ?? MASTERMIND_DEFAULTS.maxGuesses;
  const secret = generateMastermindSecret(random, { codeLength, colorCount });
  return createMastermind(secret, { colorCount, maxGuesses });
}

/**
 * 한 추측을 적용해 다음 상태·채점 피드백·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 applyMastermindGuess로 만든다(규칙 재구현 금지).
 * - feedback: 도메인 scoreMastermindGuess(state.secret, guess) 결과(exact/present).
 * - status: 도메인 isMastermindWon/isMastermindLost로 산출(승리 우선).
 * - 불법 추측(길이 불일치·색 범위 밖·종료 후)은 도메인 applyMastermindGuess의 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playMastermindGuess(
  state: MastermindState,
  guess: Peg[],
): { state: MastermindState; feedback: MastermindFeedback; status: MastermindStatus } {
  const next = applyMastermindGuess(state, guess);
  const feedback = scoreMastermindGuess(state.secret, guess);
  const status: MastermindStatus = isMastermindWon(next)
    ? "won"
    : isMastermindLost(next)
      ? "lost"
      : "playing";
  return { state: next, feedback, status };
}
