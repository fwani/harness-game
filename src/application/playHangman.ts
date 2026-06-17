// Application layer: 행맨 무작위 단어 선택 + 한 판 진행(턴 오케스트레이션).
// domain(hangman)과 RandomSource 포트에만 의존한다. infrastructure/ui 의존 금지.
// 추측 적용·승패 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다.
// 무작위는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼와 동일 패턴).
import {
  createHangman,
  guessHangmanLetter,
  isHangmanLost,
  isHangmanWon,
  type HangmanState,
} from "../domain/hangman";
import type { RandomSource } from "./dealCards";

/** 행맨 한 판의 진행 상태(승리 우선). */
export type HangmanStatus = "playing" | "won" | "lost";

/**
 * 정답 후보 단어 목록(영문 소문자). 모두 도메인 createHangman 검증(영문자만, 1글자 이상)을 통과한다.
 * 다양한 길이·글자 구성으로 충분한 다양성을 확보한다.
 */
export const HANGMAN_WORDS: readonly string[] = [
  "apple",
  "banana",
  "orange",
  "guitar",
  "planet",
  "rocket",
  "garden",
  "puzzle",
  "bridge",
  "candle",
  "dragon",
  "flower",
  "island",
  "jacket",
  "kettle",
  "ladder",
  "monkey",
  "needle",
  "pencil",
  "rabbit",
  "silver",
  "turtle",
  "violet",
  "window",
  "yellow",
];

/**
 * words에서 random으로 단어 하나를 무작위 선택한다.
 * - random.nextInt(words.length)로 인덱스를 고른다. 같은 random 시퀀스면 결정적으로 같은 결과.
 * - words가 비었으면 한국어 사유로 throw.
 * - nextInt가 범위를 벗어난 인덱스를 반환하면 throw.
 */
export function pickRandomWord(
  words: readonly string[],
  random: RandomSource,
): string {
  if (words.length === 0) {
    throw new Error("행맨 단어 선택 실패: 후보 단어 목록이 비어 있음");
  }
  const index = random.nextInt(words.length);
  if (index < 0 || index >= words.length) {
    throw new Error(`RandomSource returned out-of-range word index: ${index}`);
  }
  return words[index]!;
}

/**
 * 새 행맨 한 판을 시작한다.
 * HANGMAN_WORDS에서 무작위로 고른 단어로 createHangman(word, maxMisses)를 반환한다.
 * maxMisses 미지정 시 도메인 기본값(6)에 위임한다.
 */
export function startHangmanGame(
  random: RandomSource,
  maxMisses?: number,
): HangmanState {
  const word = pickRandomWord(HANGMAN_WORDS, random);
  return maxMisses === undefined
    ? createHangman(word)
    : createHangman(word, maxMisses);
}

/**
 * 한 글자를 추측해 다음 상태와 결과·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 guessHangmanLetter로 만든다(규칙 재구현 금지).
 * - result: 이번 글자가 정답에 있었는지(hit)/없었는지(miss). misses 증가 여부로 판단.
 * - status: 도메인 isHangmanWon/isHangmanLost로 산출(승리 우선).
 * - 불법 추측(이미 추측·비영문자·종료 후)은 도메인 guessHangmanLetter의 throw를 그대로 전파한다.
 */
export function playHangmanGuess(
  state: HangmanState,
  letter: string,
): { state: HangmanState; result: "hit" | "miss"; status: HangmanStatus } {
  const next = guessHangmanLetter(state, letter);
  const result: "hit" | "miss" = next.misses > state.misses ? "miss" : "hit";
  const status: HangmanStatus = isHangmanWon(next)
    ? "won"
    : isHangmanLost(next)
      ? "lost"
      : "playing";
  return { state: next, result, status };
}
