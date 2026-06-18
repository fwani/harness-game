// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 행맨(Hangman): 숨겨진 정답 단어를 한 글자씩 추측한다. 정답에 있는 글자는 공개되고,
// 없는 글자는 오답으로 누적된다. 모든 글자를 맞히면 승리, 오답이 허용 한도를 넘으면 패배다.
// 정답 단어의 무작위 선택·턴 진행·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 객체 반환).

/**
 * 행맨 한 판의 상태.
 * - answer: 소문자 영문 정답 단어(1글자 이상).
 * - guessed: 시도한 글자 목록(소문자, 중복 없음). 정렬은 자유.
 * - misses: 정답에 없는 글자를 추측한 누적 횟수.
 * - maxMisses: 허용 오답 한도(1 이상). misses가 이 값에 도달하면 패배.
 */
export interface HangmanState {
  answer: string;
  guessed: string[];
  misses: number;
  maxMisses: number;
}

/** 단일 영문자(a-z, 대소문자 무관) 여부. */
function isSingleLetter(letter: string): boolean {
  return typeof letter === "string" && /^[a-zA-Z]$/.test(letter);
}

/**
 * 새 행맨 상태를 생성한다. 기본 maxMisses=6.
 * - answer는 영문자만(공백/숫자/기호 불가), 1글자 이상. 내부적으로 소문자로 정규화.
 * - maxMisses는 1 이상의 정수.
 * - 위반 시 한국어 사유로 throw.
 */
export function createHangman(answer: string, maxMisses = 6): HangmanState {
  if (typeof answer !== "string" || answer.length === 0) {
    throw new Error("행맨 잘못된 정답: 1글자 이상의 단어가 필요");
  }
  if (!/^[a-zA-Z]+$/.test(answer)) {
    throw new Error("행맨 잘못된 정답: 영문자만 허용(공백/숫자/기호 불가)");
  }
  if (!Number.isInteger(maxMisses) || maxMisses < 1) {
    throw new Error(
      `행맨 잘못된 오답 한도: 1 이상의 정수여야 함(받은 값: ${maxMisses})`,
    );
  }
  return {
    answer: answer.toLowerCase(),
    guessed: [],
    misses: 0,
    maxMisses,
  };
}

/**
 * 추측이 합법인지만 판정한다(throw 금지, boolean만).
 * 단일 영문자이고, 아직 추측하지 않았고, 게임이 종료 전(승리/패배 아님)이면 true.
 */
export function isLegalHangmanGuess(state: HangmanState, letter: string): boolean {
  if (!isSingleLetter(letter)) {
    return false;
  }
  if (isHangmanWon(state) || isHangmanLost(state)) {
    return false;
  }
  return !state.guessed.includes(letter.toLowerCase());
}

/**
 * 한 글자를 추측한 새 상태를 반환한다(입력 state 불변).
 * - 합법 추측이면 guessed에 추가하고, 정답에 없는 글자면 misses+1.
 * - 불법 추측(이미 추측·비영문자·종료 후)이면 throw(한국어 사유).
 */
export function guessHangmanLetter(state: HangmanState, letter: string): HangmanState {
  if (!isLegalHangmanGuess(state, letter)) {
    throw new Error(`행맨 불법 추측: '${letter}' (비영문자·중복·종료 후 불가)`);
  }
  const normalized = letter.toLowerCase();
  const hit = state.answer.includes(normalized);
  return {
    answer: state.answer,
    guessed: [...state.guessed, normalized],
    misses: hit ? state.misses : state.misses + 1,
    maxMisses: state.maxMisses,
  };
}

/**
 * 마스킹된 정답 표현. 추측해 맞힌 글자는 그대로, 아직 못 맞힌 글자는 '_'.
 * 색 비의존 텍스트 표현(예: 'c_t').
 */
export function maskedHangmanWord(state: HangmanState): string {
  return state.answer
    .split("")
    .map((ch) => (state.guessed.includes(ch) ? ch : "_"))
    .join("");
}

/** 정답의 모든 고유 글자를 추측했으면 승리. */
export function isHangmanWon(state: HangmanState): boolean {
  for (const ch of state.answer) {
    if (!state.guessed.includes(ch)) {
      return false;
    }
  }
  return true;
}

/** 오답이 허용 한도에 도달했으면(misses >= maxMisses) 패배. */
export function isHangmanLost(state: HangmanState): boolean {
  return state.misses >= state.maxMisses;
}
