// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 워들(Wordle): 고정 길이 영단어를 제한된 시도 안에 맞힌다. 매 추측마다 글자 위치별로
// 적중(correct)·존재(present)·없음(absent) 피드백을 주고, 한도 안에 정답을 맞히면 승리,
// 못 맞히면 패배다. 정답의 무작위 선택·턴 진행·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 객체 반환).

/** 한 글자 채점 결과: 적중(자리 일치)·존재(정답에 있으나 다른 자리)·없음(정답에 없음). */
export type WordleLetterResult = "correct" | "present" | "absent";

/**
 * 워들 한 판의 상태.
 * - answer: 소문자 영단어(고정 길이), 내부 정규화.
 * - wordLength: answer.length.
 * - maxAttempts: 허용 시도 횟수(1 이상).
 * - guesses: 지금까지 제출한 추측(소문자), 제출 순서.
 */
export interface WordleState {
  answer: string;
  wordLength: number;
  maxAttempts: number;
  guesses: string[];
}

/** 영문자만으로 이루어진 문자열 여부(대소문자 무관, 1글자 이상). */
function isAlphaWord(word: string): boolean {
  return typeof word === "string" && /^[a-zA-Z]+$/.test(word);
}

/**
 * 새 워들 게임을 생성한다. 기본 maxAttempts=6.
 * - answer는 영문자만(공백/숫자/기호 불가), 1글자 이상. 내부적으로 소문자로 정규화.
 * - maxAttempts는 1 이상의 정수.
 * - 위반 시 한국어 사유로 throw.
 */
export function createWordleGame(answer: string, maxAttempts = 6): WordleState {
  if (typeof answer !== "string" || answer.length === 0) {
    throw new Error("워들 잘못된 정답: 1글자 이상의 단어가 필요");
  }
  if (!isAlphaWord(answer)) {
    throw new Error("워들 잘못된 정답: 영문자만 허용(공백/숫자/기호 불가)");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(
      `워들 잘못된 시도 한도: 1 이상의 정수여야 함(받은 값: ${maxAttempts})`,
    );
  }
  const normalized = answer.toLowerCase();
  return {
    answer: normalized,
    wordLength: normalized.length,
    maxAttempts,
    guesses: [],
  };
}

/**
 * 추측이 합법인지만 판정한다(throw 금지, boolean만).
 * 영문자만이고, 길이가 wordLength와 같고, 게임이 종료 전(승리/패배 아님)이면 true.
 */
export function isLegalWordleGuess(state: WordleState, guess: string): boolean {
  if (!isAlphaWord(guess)) {
    return false;
  }
  if (guess.length !== state.wordLength) {
    return false;
  }
  if (isWordleWon(state) || isWordleLost(state)) {
    return false;
  }
  return true;
}

/**
 * 정답 대비 추측의 글자별 결과를 반환한다. 반환 길이는 guess.length.
 * 표준 워들 중복 규칙: 먼저 자리 일치(correct)를 모두 확정한 뒤, 남은 정답 글자 풀에서만
 * present를 배정한다(풀이 소진되면 초과분은 absent). 입력을 변형하지 않는다.
 */
export function scoreWordleGuess(answer: string, guess: string): WordleLetterResult[] {
  const ans = answer.toLowerCase();
  const gss = guess.toLowerCase();
  const result: WordleLetterResult[] = new Array(gss.length).fill("absent");

  // 1) 자리 일치(correct)를 먼저 확정하고, 남은 정답 글자 풀을 만든다.
  const pool: Record<string, number> = {};
  for (let i = 0; i < ans.length; i++) {
    const ansCh = ans[i] as string;
    if (i < gss.length && gss[i] === ansCh) {
      result[i] = "correct";
    } else {
      pool[ansCh] = (pool[ansCh] ?? 0) + 1;
    }
  }

  // 2) 남은 풀에서만 present 배정.
  for (let i = 0; i < gss.length; i++) {
    if (result[i] === "correct") {
      continue;
    }
    const ch = gss[i] as string;
    if ((pool[ch] ?? 0) > 0) {
      result[i] = "present";
      pool[ch] = (pool[ch] ?? 0) - 1;
    }
  }
  return result;
}

/**
 * 합법 추측을 적용한 새 상태를 반환한다(입력 state 불변).
 * 불법 추측(길이 불일치·비영문자·게임 종료 후)이면 한국어 사유로 throw(조용한 무시 금지).
 * 대소문자 무관 입력 허용(소문자 정규화).
 */
export function applyWordleGuess(state: WordleState, guess: string): WordleState {
  if (!isLegalWordleGuess(state, guess)) {
    throw new Error(
      `워들 불법 추측: '${guess}' (길이 불일치·비영문자·종료 후 불가)`,
    );
  }
  return {
    answer: state.answer,
    wordLength: state.wordLength,
    maxAttempts: state.maxAttempts,
    guesses: [...state.guesses, guess.toLowerCase()],
  };
}

/** 마지막 추측이 정답과 완전히 일치하면 승리. */
export function isWordleWon(state: WordleState): boolean {
  if (state.guesses.length === 0) {
    return false;
  }
  return state.guesses[state.guesses.length - 1] === state.answer;
}

/** 승리하지 못한 채 maxAttempts를 모두 소진하면 패배. */
export function isWordleLost(state: WordleState): boolean {
  return !isWordleWon(state) && state.guesses.length >= state.maxAttempts;
}
