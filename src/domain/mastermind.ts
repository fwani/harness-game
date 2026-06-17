// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 마스터마인드(Mastermind): 출제자가 정한 비밀 색 코드를, 추측마다 "정확한 위치+색(black peg)"과
// "색만 맞음(white peg)" 피드백을 받아가며 시도 한도 안에 맞히는 1인 추리 게임이다.
// 결정적 순수 규칙만 이 모듈 범위다. 무작위 비밀 코드 생성(application의 RandomSource 주입)·
// UI 연동은 이 모듈 밖이다(후속 짝 이슈).
// 모든 함수는 결정적 순수 함수이며 입력(state/secret/guess)을 변형하지 않는다(새 상태 반환).

/** 색 인덱스(0..colorCount-1). 색상값이 아니라 인덱스로 다뤄 UI에서 색 비의존(기호+라벨) 렌더가 가능하다. */
export type Peg = number;

/** 한 추측의 채점 결과. exact = 정위치+정색(black peg), present = 색은 있으나 위치 다름(white peg). */
export interface MastermindFeedback {
  exact: number;
  present: number;
}

/**
 * 불변 상태.
 * - codeLength: 비밀 코드 길이(예: 4).
 * - colorCount: 색 가짓수(예: 6). 각 칸은 0..colorCount-1.
 * - maxGuesses: 시도 한도(예: 10).
 * - secret: 비밀 코드(길이 codeLength).
 * - guesses: 채점된 추측 이력(append-only).
 */
export interface MastermindState {
  readonly codeLength: number;
  readonly colorCount: number;
  readonly maxGuesses: number;
  readonly secret: ReadonlyArray<Peg>;
  readonly guesses: ReadonlyArray<{
    readonly guess: ReadonlyArray<Peg>;
    readonly feedback: MastermindFeedback;
  }>;
}

/** 코드(secret/guess)가 길이·색범위·정수 규칙을 만족하는지 검사한다(throw 없이 boolean). */
function isValidCode(code: ReadonlyArray<Peg>, codeLength: number, colorCount: number): boolean {
  if (code.length !== codeLength) return false;
  for (const peg of code) {
    if (typeof peg !== "number" || !Number.isInteger(peg) || peg < 0 || peg >= colorCount) {
      return false;
    }
  }
  return true;
}

/**
 * 주어진 secret으로 상태를 생성한다(빈 추측 이력, secret을 복사해 외부 변형과 격리).
 * - colorCount가 1 이상의 정수여야 함.
 * - maxGuesses가 1 이상의 정수여야 함.
 * - secret이 비어 있지 않고, 각 칸이 0..colorCount-1 범위의 정수여야 함.
 * 위반 시 throw(한국어 사유).
 */
export function createMastermind(
  secret: Peg[],
  options: { colorCount: number; maxGuesses: number },
): MastermindState {
  const { colorCount, maxGuesses } = options;
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new Error(`마스터마인드 잘못된 색 개수: colorCount는 1 이상의 정수여야 함(받은 값: ${colorCount})`);
  }
  if (!Number.isInteger(maxGuesses) || maxGuesses < 1) {
    throw new Error(`마스터마인드 잘못된 시도 한도: maxGuesses는 1 이상의 정수여야 함(받은 값: ${maxGuesses})`);
  }
  const codeLength = secret.length;
  if (codeLength < 1) {
    throw new Error("마스터마인드 잘못된 비밀 코드: 최소 1칸 이상이어야 함(빈 코드 불가)");
  }
  for (let i = 0; i < codeLength; i += 1) {
    const peg = secret[i];
    if (typeof peg !== "number" || !Number.isInteger(peg) || peg < 0 || peg >= colorCount) {
      throw new Error(
        `마스터마인드 색 범위 밖: secret[${i}]=${peg}는 0..${colorCount - 1} 밖`,
      );
    }
  }
  return {
    codeLength,
    colorCount,
    maxGuesses,
    secret: secret.slice(),
    guesses: [],
  };
}

/**
 * 한 추측을 채점한다(순수·불변).
 * - exact = 같은 위치·같은 색 개수.
 * - present = 색 다중도(multiset) 교집합에서 exact를 뺀 값 — 색 중복이 있어도 한 칸은 한 번만
 *   매칭(고전 마스터마인드 규칙). 즉 exact+present는 codeLength를 넘지 않는다.
 * - secret/guess는 같은 길이여야 한다(아니면 throw). 음수/비정수 색은 매칭에서 제외된다.
 */
export function scoreMastermindGuess(
  secret: ReadonlyArray<Peg>,
  guess: ReadonlyArray<Peg>,
): MastermindFeedback {
  if (secret.length !== guess.length) {
    throw new Error(
      `마스터마인드 길이 불일치: secret 길이=${secret.length}, guess 길이=${guess.length}`,
    );
  }
  const length = secret.length;
  let exact = 0;
  // 정위치 매칭을 먼저 세고, 매칭되지 않은 칸만 색 다중도(multiset)에 모은다.
  const secretCounts = new Map<Peg, number>();
  const guessCounts = new Map<Peg, number>();
  for (let i = 0; i < length; i += 1) {
    const s = secret[i] as Peg;
    const g = guess[i] as Peg;
    if (s === g) {
      exact += 1;
    } else {
      secretCounts.set(s, (secretCounts.get(s) ?? 0) + 1);
      guessCounts.set(g, (guessCounts.get(g) ?? 0) + 1);
    }
  }
  let present = 0;
  for (const [color, gCount] of guessCounts) {
    const sCount = secretCounts.get(color) ?? 0;
    present += Math.min(gCount, sCount);
  }
  return { exact, present };
}

/** 게임이 종료(승 또는 패)됐는지 판정한다. */
export function isMastermindOver(state: MastermindState): boolean {
  return isMastermindWon(state) || isMastermindLost(state);
}

/**
 * 합법 추측인지 판정한다(throw 없이 boolean).
 * - 길이가 codeLength와 일치하고, 각 칸이 0..colorCount-1 범위의 정수이며, 게임이 종료되지 않았을 것.
 */
export function isLegalMastermindGuess(state: MastermindState, guess: ReadonlyArray<Peg>): boolean {
  if (isMastermindOver(state)) return false;
  return isValidCode(guess, state.codeLength, state.colorCount);
}

/**
 * 추측을 채점해 이력에 append한 새 상태를 반환한다(입력 불변).
 * 불법 추측·종료 후 추측은 조용히 무시하지 않고 throw한다(한국어 사유).
 */
export function applyMastermindGuess(state: MastermindState, guess: Peg[]): MastermindState {
  if (isMastermindOver(state)) {
    throw new Error("마스터마인드 종료 후 추측 불가: 이미 승/패가 결정된 게임");
  }
  if (guess.length !== state.codeLength) {
    throw new Error(
      `마스터마인드 길이 불일치: guess 길이=${guess.length}, 기대=${state.codeLength}`,
    );
  }
  for (let i = 0; i < guess.length; i += 1) {
    const peg = guess[i];
    if (typeof peg !== "number" || !Number.isInteger(peg) || peg < 0 || peg >= state.colorCount) {
      throw new Error(
        `마스터마인드 색 범위 밖: guess[${i}]=${peg}는 0..${state.colorCount - 1} 밖`,
      );
    }
  }
  const feedback = scoreMastermindGuess(state.secret, guess);
  return {
    codeLength: state.codeLength,
    colorCount: state.colorCount,
    maxGuesses: state.maxGuesses,
    secret: state.secret,
    guesses: [...state.guesses, { guess: guess.slice(), feedback }],
  };
}

/** 마지막 추측의 exact가 codeLength와 같으면(전부 정위치·정색) 승리. */
export function isMastermindWon(state: MastermindState): boolean {
  const last = state.guesses[state.guesses.length - 1];
  if (!last) return false;
  return last.feedback.exact === state.codeLength;
}

/** 미승리 상태에서 시도 한도를 소진(guesses.length >= maxGuesses)했으면 패배. */
export function isMastermindLost(state: MastermindState): boolean {
  if (isMastermindWon(state)) return false;
  return state.guesses.length >= state.maxGuesses;
}
