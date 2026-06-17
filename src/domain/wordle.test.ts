import { describe, expect, it } from "vitest";
import {
  applyWordleGuess,
  createWordleGame,
  isLegalWordleGuess,
  isWordleLost,
  isWordleWon,
  scoreWordleGuess,
  type WordleLetterResult,
  type WordleState,
} from "./wordle";

describe("createWordleGame", () => {
  it("기본 maxAttempts=6으로 빈 상태를 만든다", () => {
    expect(createWordleGame("crane")).toEqual<WordleState>({
      answer: "crane",
      wordLength: 5,
      maxAttempts: 6,
      guesses: [],
    });
  });

  it("정답을 소문자로 정규화하고 wordLength를 맞춘다", () => {
    const state = createWordleGame("CrAnE");
    expect(state.answer).toBe("crane");
    expect(state.wordLength).toBe(5);
  });

  it("maxAttempts를 지정할 수 있다", () => {
    expect(createWordleGame("hi", 3).maxAttempts).toBe(3);
  });

  it("빈 정답이면 throw", () => {
    expect(() => createWordleGame("")).toThrow();
  });

  it("비영문 정답이면 throw", () => {
    expect(() => createWordleGame("ca7")).toThrow();
    expect(() => createWordleGame("c a")).toThrow();
    expect(() => createWordleGame("cät")).toThrow();
  });

  it("maxAttempts가 비정수·1 미만이면 throw", () => {
    expect(() => createWordleGame("cat", 0)).toThrow();
    expect(() => createWordleGame("cat", -1)).toThrow();
    expect(() => createWordleGame("cat", 2.5)).toThrow();
  });
});

describe("scoreWordleGuess", () => {
  it("적중·존재·없음을 위치별로 채점한다", () => {
    // answer=crane, guess=caret → c(correct) a(present) r(present) e(present) t(absent)
    expect(scoreWordleGuess("crane", "caret")).toEqual<WordleLetterResult[]>([
      "correct",
      "present",
      "present",
      "present",
      "absent",
    ]);
  });

  it("완전 일치는 모두 correct", () => {
    expect(scoreWordleGuess("crane", "crane")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("중복 글자: correct 우선 확정 후 잔여 풀에서만 present (over-counting 없음)", () => {
    // answer=allee(a,l,l,e,e), guess=eagle(e,a,g,l,e)
    // 자리 비교: e/a(x) a/l(x) g/l(x) l/e(x) e/e(correct) → 자리 일치는 마지막 e뿐
    // correct 확정 후 정답 잔여 풀 = {a:1, l:2, e:1}
    // present 배정: e0(present,e소진) a1(present,a소진) g2(absent) l3(present,l남음) e4(correct)
    expect(scoreWordleGuess("allee", "eagle")).toEqual([
      "present",
      "present",
      "absent",
      "present",
      "correct",
    ]);
  });

  it("초과 중복 글자는 풀 소진 후 absent", () => {
    // answer=abcde(중복 없음), guess=aabbb → 첫 a correct, 두번째 a absent(풀에 a 없음)
    // b는 정답에 1개 → 첫 b(자리 불일치) present, 나머지 b absent
    expect(scoreWordleGuess("abcde", "aabbb")).toEqual([
      "correct",
      "absent",
      "present",
      "absent",
      "absent",
    ]);
  });

  it("대소문자 무관하게 채점한다", () => {
    expect(scoreWordleGuess("CRANE", "Crane")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });
});

describe("isLegalWordleGuess", () => {
  it("영문자만·길이 일치·게임 미종료면 합법", () => {
    const state = createWordleGame("crane");
    expect(isLegalWordleGuess(state, "slate")).toBe(true);
    expect(isLegalWordleGuess(state, "SLATE")).toBe(true);
  });

  it("길이 불일치는 불법", () => {
    const state = createWordleGame("crane");
    expect(isLegalWordleGuess(state, "cat")).toBe(false);
    expect(isLegalWordleGuess(state, "cranes")).toBe(false);
  });

  it("비영문은 불법", () => {
    const state = createWordleGame("crane");
    expect(isLegalWordleGuess(state, "cra7e")).toBe(false);
    expect(isLegalWordleGuess(state, "cr ne")).toBe(false);
  });

  it("게임 종료 후에는 불법", () => {
    const won = applyWordleGuess(createWordleGame("crane"), "crane");
    expect(isLegalWordleGuess(won, "slate")).toBe(false);

    const lost = applyWordleGuess(applyWordleGuess(createWordleGame("crane", 2), "slate"), "plate");
    expect(isWordleLost(lost)).toBe(true);
    expect(isLegalWordleGuess(lost, "crane")).toBe(false);
  });
});

describe("applyWordleGuess", () => {
  it("합법 추측을 소문자로 누적하고 입력을 변형하지 않는다", () => {
    const state = createWordleGame("crane");
    const next = applyWordleGuess(state, "SLATE");
    expect(next.guesses).toEqual(["slate"]);
    expect(state.guesses).toEqual([]); // 불변성
    expect(next).not.toBe(state);
  });

  it("불법 추측은 throw(조용한 무시 금지)", () => {
    const state = createWordleGame("crane");
    expect(() => applyWordleGuess(state, "cat")).toThrow();
    expect(() => applyWordleGuess(state, "cra7e")).toThrow();
  });

  it("종료 후 추측은 throw", () => {
    const won = applyWordleGuess(createWordleGame("crane"), "crane");
    expect(() => applyWordleGuess(won, "slate")).toThrow();
  });
});

describe("승패 판정", () => {
  it("마지막 추측이 정답과 일치하면 승리", () => {
    const state = applyWordleGuess(applyWordleGuess(createWordleGame("crane"), "slate"), "crane");
    expect(isWordleWon(state)).toBe(true);
    expect(isWordleLost(state)).toBe(false);
  });

  it("승리 없이 시도를 모두 소진하면 패배", () => {
    let state = createWordleGame("crane", 2);
    state = applyWordleGuess(state, "slate");
    expect(isWordleLost(state)).toBe(false);
    state = applyWordleGuess(state, "plate");
    expect(isWordleWon(state)).toBe(false);
    expect(isWordleLost(state)).toBe(true);
  });

  it("승리와 패배는 상호 배타적이다", () => {
    // 마지막 시도에 정답을 맞히면 승리이고 패배가 아니다.
    let state = createWordleGame("crane", 2);
    state = applyWordleGuess(state, "slate");
    state = applyWordleGuess(state, "crane");
    expect(isWordleWon(state)).toBe(true);
    expect(isWordleLost(state)).toBe(false);
  });

  it("추측 전에는 승리도 패배도 아니다", () => {
    const state = createWordleGame("crane");
    expect(isWordleWon(state)).toBe(false);
    expect(isWordleLost(state)).toBe(false);
  });
});
