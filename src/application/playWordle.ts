// Application layer: 워들 무작위 정답 선택 + 한 추측 진행(턴 오케스트레이션).
// domain(wordle)과 RandomSource 포트에만 의존한다. infrastructure/ui 의존 금지.
// 채점·추측 적용·승패 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다.
// 무작위는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼와 동일 패턴).
import {
  applyWordleGuess,
  createWordleGame,
  isWordleLost,
  isWordleWon,
  scoreWordleGuess,
  type WordleLetterResult,
  type WordleState,
} from "../domain/wordle";
import type { RandomSource } from "./dealCards";

/** 워들 한 판의 진행 상태(승리 우선). */
export type WordleStatus = "playing" | "won" | "lost";

/**
 * 정답 후보 단어 목록(영문 소문자, 모두 표준 워들 5글자). 모두 도메인 createWordleGame
 * 검증(영문자만)을 통과한다. 충분한 다양성을 확보한다.
 */
export const WORDLE_WORDS: readonly string[] = [
  "apple",
  "brave",
  "chair",
  "dance",
  "eagle",
  "flute",
  "grape",
  "house",
  "input",
  "jolly",
  "knife",
  "lemon",
  "mango",
  "noble",
  "ocean",
  "piano",
  "quiet",
  "river",
  "stone",
  "tiger",
  "unity",
  "vivid",
  "whale",
  "yacht",
  "zebra",
];

/**
 * words에서 random으로 단어 하나를 무작위 선택한다(pickRandomWord와 동일 규약).
 * - random.nextInt(words.length)로 인덱스를 고른다. 같은 random 시퀀스면 결정적으로 같은 결과.
 * - words가 비었으면 한국어 사유로 throw.
 * - nextInt가 범위를 벗어난 인덱스를 반환하면 throw.
 */
export function pickRandomWordleAnswer(
  words: readonly string[],
  random: RandomSource,
): string {
  if (words.length === 0) {
    throw new Error("워들 정답 선택 실패: 후보 단어 목록이 비어 있음");
  }
  const index = random.nextInt(words.length);
  if (index < 0 || index >= words.length) {
    throw new Error(`RandomSource returned out-of-range word index: ${index}`);
  }
  return words[index]!;
}

/**
 * 새 워들 한 판을 시작한다.
 * WORDLE_WORDS에서 무작위로 고른 정답으로 createWordleGame(answer, maxAttempts)를 반환한다.
 * maxAttempts 미지정 시 도메인 기본값(6)에 위임한다.
 */
export function startWordleGame(
  random: RandomSource,
  maxAttempts?: number,
): WordleState {
  const answer = pickRandomWordleAnswer(WORDLE_WORDS, random);
  return maxAttempts === undefined
    ? createWordleGame(answer)
    : createWordleGame(answer, maxAttempts);
}

/**
 * 한 추측을 적용해 다음 상태·글자별 결과·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 applyWordleGuess로 만든다(규칙 재구현 금지).
 * - feedback: 도메인 scoreWordleGuess(answer, guess) 결과(글자별 correct/present/absent).
 * - status: 도메인 isWordleWon/isWordleLost로 산출(승리 우선).
 * - 불법 추측(길이 불일치·비영문·종료 후)은 도메인 applyWordleGuess의 throw를 그대로 전파한다.
 */
export function playWordleGuess(
  state: WordleState,
  guess: string,
): { state: WordleState; feedback: WordleLetterResult[]; status: WordleStatus } {
  const next = applyWordleGuess(state, guess);
  const feedback = scoreWordleGuess(state.answer, guess);
  const status: WordleStatus = isWordleWon(next)
    ? "won"
    : isWordleLost(next)
      ? "lost"
      : "playing";
  return { state: next, feedback, status };
}
