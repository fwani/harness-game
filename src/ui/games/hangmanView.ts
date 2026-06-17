// Presentation helpers for the 행맨(Hangman) screen. Pure functions only — 마스킹 표시·오답 글자
// 목록·남은 오답 허용치·상태 문구·알파벳 키패드 버튼 상태를 React/DOM에서 분리해 단위 테스트할 수
// 있게 한다. 단어 선택·추측 적용·승패 판정 규칙은 domain(hangman)/application(playHangman)을 호출해
// 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import {
  isLegalHangmanGuess,
  maskedHangmanWord,
  type HangmanState,
} from "../../domain/hangman";
import type { HangmanStatus } from "../../application/playHangman";

/** a..z 알파벳 키패드 키 목록(소문자, 고정 순서). */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/** 한 칸의 키패드 버튼 표시 상태. */
export interface LetterButton {
  /** 버튼에 표시할 글자(소문자). */
  letter: string;
  /** 이미 추측했거나 게임이 종료돼 더 누를 수 없으면 true. */
  disabled: boolean;
}

/**
 * 마스킹된 정답을 글자 사이 공백으로 띄워 표시한다(색 비의존 텍스트).
 * 예: 'c_t' → 'c _ t'. 못 맞힌 글자는 '_'로 남는다(도메인 maskedHangmanWord 그대로).
 */
export function maskedDisplay(state: HangmanState): string {
  return maskedHangmanWord(state).split("").join(" ");
}

/**
 * 정답에 없던 오답 글자만 추측 순서대로 돌려준다(불변·결정적).
 * 정답에 있는(맞힌) 글자는 제외한다.
 */
export function wrongLetters(state: HangmanState): string[] {
  return state.guessed.filter((letter) => !state.answer.includes(letter));
}

/** 남은 오답 허용치(maxMisses - misses, 음수 방지 0 클램프). */
export function remainingMisses(state: HangmanState): number {
  return Math.max(0, state.maxMisses - state.misses);
}

/** 진행/승리/패배를 플레이어용 한국어 문구로 변환한다(순수·결정적). */
export function hangmanStatusLabel(status: HangmanStatus): string {
  switch (status) {
    case "won":
      return "🎉 정답! 모든 글자를 맞혔습니다.";
    case "lost":
      return "💥 기회를 모두 소진했습니다. 게임 오버.";
    default:
      return "글자를 골라 단어를 맞혀보세요.";
  }
}

/**
 * a..z 키패드 버튼 상태 목록을 만든다(불변·결정적).
 * 합법 추측(isLegalHangmanGuess)이 아니면 disabled — 이미 추측한 글자, 게임 종료 후 모두 비활성.
 */
export function letterButtons(state: HangmanState): LetterButton[] {
  return ALPHABET.map((letter) => ({
    letter,
    disabled: !isLegalHangmanGuess(state, letter),
  }));
}
