// Presentation helpers for the 워들(Wordle) screen. Pure functions only — 글자별 채점 결과를
// 색 비의존 기호+라벨로 매핑하고, 추측 히스토리 그리드·남은 시도 라벨·상태 문구·입력 파싱/검증
// 사유를 React/DOM에서 분리해 단위 테스트할 수 있게 한다. 채점·승패 판정 규칙은 domain(wordle)/
// application(playWordle)을 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import { scoreWordleGuess, type WordleLetterResult, type WordleState } from "../../domain/wordle";
import type { WordleStatus } from "../../application/playWordle";

/** 한 글자 채점 결과의 색 비의존 표시(기호+라벨). 색뿐 아니라 기호·텍스트로도 구분한다. */
export interface LetterResultDisplay {
  /** 색에 의존하지 않는 구분 기호. */
  symbol: string;
  /** 스크린리더·범례용 한국어 라벨. */
  label: string;
}

/** 글자별 결과 → 색 비의존 기호+라벨 매핑(순수·결정적). */
const LETTER_RESULT_DISPLAY: Record<WordleLetterResult, LetterResultDisplay> = {
  correct: { symbol: "■", label: "적중" },
  present: { symbol: "◧", label: "존재" },
  absent: { symbol: "·", label: "없음" },
};

/** 글자별 결과의 색 비의존 기호+라벨을 돌려준다(순수·결정적). */
export function letterResultDisplay(result: WordleLetterResult): LetterResultDisplay {
  return LETTER_RESULT_DISPLAY[result];
}

/** 범례(legend)용 (결과,기호,라벨) 목록. 화면에 색 비의존 안내를 그릴 때 쓴다. */
export function letterResultLegend(): {
  result: WordleLetterResult;
  symbol: string;
  label: string;
}[] {
  return (["correct", "present", "absent"] as const).map((result) => ({
    result,
    symbol: LETTER_RESULT_DISPLAY[result].symbol,
    label: LETTER_RESULT_DISPLAY[result].label,
  }));
}

/** 그리드 한 칸의 표시 모델(대문자 글자 + 색 비의존 기호/라벨/aria-label). */
export interface WordleCellView {
  /** 표시용 대문자 글자. */
  letter: string;
  /** 도메인 채점 결과. */
  result: WordleLetterResult;
  /** 색 비의존 구분 기호. */
  symbol: string;
  /** 결과 한국어 라벨. */
  label: string;
  /** "A: 적중"처럼 글자+결과를 합친 스크린리더 라벨. */
  ariaLabel: string;
}

/**
 * 한 추측을 정답과 대조해 글자별 셀 모델로 변환한다(불변·결정적).
 * 채점은 도메인 scoreWordleGuess에 위임한다(규칙 재구현 금지).
 */
export function guessRowCells(answer: string, guess: string): WordleCellView[] {
  const results = scoreWordleGuess(answer, guess);
  const letters = guess.toLowerCase().split("");
  return letters.map((ch, i) => {
    const result = results[i] ?? "absent";
    const display = LETTER_RESULT_DISPLAY[result];
    const letter = ch.toUpperCase();
    return {
      letter,
      result,
      symbol: display.symbol,
      label: display.label,
      ariaLabel: `${letter}: ${display.label}`,
    };
  });
}

/**
 * 지금까지 제출한 모든 추측을 히스토리 그리드(행=추측, 열=글자)로 변환한다(불변·결정적).
 * 도메인 state.guesses를 state.answer로 채점한다.
 */
export function guessGridRows(state: WordleState): WordleCellView[][] {
  return state.guesses.map((guess) => guessRowCells(state.answer, guess));
}

/** 남은 시도 횟수(maxAttempts - 제출 수, 음수 방지 0 클램프). */
export function remainingAttempts(state: WordleState): number {
  return Math.max(0, state.maxAttempts - state.guesses.length);
}

/** "남은 시도 4 / 6"처럼 남은 시도/총 한도 라벨(순수·결정적). */
export function attemptsLabel(state: WordleState): string {
  return `남은 시도 ${remainingAttempts(state)} / ${state.maxAttempts}`;
}

/**
 * 진행/승리/패배를 플레이어용 한국어 문구로 변환한다(순수·결정적).
 * 패배 시에만 정답을 공개한다(승리·진행 중에는 정답 비노출).
 */
export function describeWordleStatus(status: WordleStatus, answer: string): string {
  switch (status) {
    case "won":
      return "🎉 정답! 단어를 맞혔습니다.";
    case "lost":
      return `💥 시도를 모두 소진했습니다. 정답은 '${answer.toUpperCase()}' 였습니다.`;
    default:
      return "글자별 힌트를 참고해 단어를 맞혀보세요.";
  }
}

/** 추측 입력 파싱 결과: 성공이면 소문자 guess, 실패면 한국어 사유. */
export type ParsedWordleGuess = { guess: string } | { error: string };

/**
 * 입력 문자열을 추측으로 파싱·검증한다(순수·결정적, throw 없이 사유 반환).
 * - 앞뒤 공백은 무시한다. 빈 입력이면 길이 안내.
 * - 영문자(a–z) 이외 문자가 있으면: "영문자만 입력하세요(공백/숫자/기호 불가)."
 * - 길이가 wordLength와 다르면: "{wordLength}글자 영단어를 입력하세요." (입력 길이 안내 포함)
 * - dictionary가 주어지면 사전에 없는 단어(예: ZXQVW 같은 비단어)는 거른다:
 *   "사전에 없는 단어입니다. 실제 영단어를 입력하세요." (안내문이 "영단어"를 약속하므로 일치시킴)
 * 성공 시 결과는 항상 도메인 isLegalWordleGuess의 길이·영문 조건을 만족한다(소문자).
 * 사전 검증을 통과하지 못한 입력은 사유만 돌려주고 시도를 소진시키지 않는다(시도 적용은 호출부 책임).
 */
export function parseWordleGuess(
  raw: string,
  wordLength: number,
  dictionary?: ReadonlySet<string>,
): ParsedWordleGuess {
  const compact = raw.trim();
  if (compact === "") {
    return { error: `${wordLength}글자 영단어를 입력하세요.` };
  }
  if (!/^[a-zA-Z]+$/.test(compact)) {
    return { error: "영문자만 입력하세요(공백/숫자/기호 불가)." };
  }
  if (compact.length !== wordLength) {
    return {
      error: `${wordLength}글자 영단어를 입력하세요. (입력: ${compact.length}글자)`,
    };
  }
  const guess = compact.toLowerCase();
  if (dictionary !== undefined && !dictionary.has(guess)) {
    return { error: "사전에 없는 단어입니다. 실제 영단어를 입력하세요." };
  }
  return { guess };
}
