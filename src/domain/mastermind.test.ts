import { describe, expect, it } from "vitest";

import {
  applyMastermindGuess,
  createMastermind,
  isLegalMastermindGuess,
  isMastermindLost,
  isMastermindOver,
  isMastermindWon,
  scoreMastermindGuess,
  type MastermindState,
} from "./mastermind";

const OPTS = { colorCount: 6, maxGuesses: 10 };

describe("createMastermind", () => {
  it("주어진 secret으로 빈 추측 이력 상태를 만든다", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    expect(state.codeLength).toBe(4);
    expect(state.colorCount).toBe(6);
    expect(state.maxGuesses).toBe(10);
    expect(state.secret).toEqual([0, 1, 2, 3]);
    expect(state.guesses).toEqual([]);
  });

  it("입력 secret을 복사해 외부 변형과 격리한다", () => {
    const secret = [0, 1, 2, 3];
    const state = createMastermind(secret, OPTS);
    secret[0] = 5;
    expect(state.secret).toEqual([0, 1, 2, 3]);
  });

  it("colorCount가 1 미만이거나 정수가 아니면 throw", () => {
    expect(() => createMastermind([0], { colorCount: 0, maxGuesses: 10 })).toThrow();
    expect(() => createMastermind([0], { colorCount: 1.5, maxGuesses: 10 })).toThrow();
  });

  it("maxGuesses가 1 미만이거나 정수가 아니면 throw", () => {
    expect(() => createMastermind([0], { colorCount: 6, maxGuesses: 0 })).toThrow();
    expect(() => createMastermind([0], { colorCount: 6, maxGuesses: 2.5 })).toThrow();
  });

  it("빈 secret이면 throw", () => {
    expect(() => createMastermind([], OPTS)).toThrow();
  });

  it("secret 칸이 색 범위 밖이거나 비정수이면 throw", () => {
    expect(() => createMastermind([0, 1, 6, 3], OPTS)).toThrow(); // 6은 0..5 밖
    expect(() => createMastermind([0, -1, 2, 3], OPTS)).toThrow();
    expect(() => createMastermind([0, 1.5, 2, 3], OPTS)).toThrow();
  });
});

describe("scoreMastermindGuess", () => {
  it("전부 정답이면 exact만 codeLength, present=0", () => {
    expect(scoreMastermindGuess([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ exact: 4, present: 0 });
  });

  it("전부 오답(겹치는 색 없음)이면 0/0", () => {
    expect(scoreMastermindGuess([0, 0, 0, 0], [1, 1, 1, 1])).toEqual({ exact: 0, present: 0 });
  });

  it("정색-오위치는 present로 센다", () => {
    // secret=[0,1,2,3], guess=[3,2,1,0] → 모두 색은 맞고 위치는 다름
    expect(scoreMastermindGuess([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ exact: 0, present: 4 });
  });

  it("exact와 present가 섞인 경우", () => {
    // secret=[0,1,2,3], guess=[0,2,1,5] → 0은 정위치(exact), 1·2는 색만(present), 5는 없음
    expect(scoreMastermindGuess([0, 1, 2, 3], [0, 2, 1, 5])).toEqual({ exact: 1, present: 2 });
  });

  it("색 중복 다중도를 정확히 처리한다 — secret 중복", () => {
    // secret=[0,0,1,2], guess=[0,1,0,0]
    // 위치 0: 0===0 exact. 나머지 secret 남은 {0,1,2}, guess 남은 {1,0,0}
    // 색 0: secret 1개, guess 2개 → min=1. 색 1: secret 1, guess 1 → min=1. 색 2: guess 0.
    // exact=1, present=2
    expect(scoreMastermindGuess([0, 0, 1, 2], [0, 1, 0, 0])).toEqual({ exact: 1, present: 2 });
  });

  it("색 중복 다중도 — guess가 secret보다 같은 색을 더 많이 내도 secret 다중도로 제한", () => {
    // secret=[0,1,2,3], guess=[0,0,0,0]
    // 위치0: exact. 나머지 secret {1,2,3}에 0 없음 → present=0
    expect(scoreMastermindGuess([0, 1, 2, 3], [0, 0, 0, 0])).toEqual({ exact: 1, present: 0 });
  });

  it("exact+present는 codeLength를 넘지 않는다", () => {
    const fb = scoreMastermindGuess([0, 1, 1, 2], [1, 1, 0, 2]);
    expect(fb.exact + fb.present).toBeLessThanOrEqual(4);
  });

  it("길이가 다르면 throw", () => {
    expect(() => scoreMastermindGuess([0, 1, 2], [0, 1])).toThrow();
  });
});

describe("isLegalMastermindGuess", () => {
  const state = createMastermind([0, 1, 2, 3], OPTS);

  it("길이·색범위가 맞고 미종료면 합법", () => {
    expect(isLegalMastermindGuess(state, [5, 4, 3, 2])).toBe(true);
  });

  it("길이가 다르면 불법", () => {
    expect(isLegalMastermindGuess(state, [0, 1, 2])).toBe(false);
  });

  it("색 범위 밖/비정수면 불법", () => {
    expect(isLegalMastermindGuess(state, [0, 1, 2, 6])).toBe(false);
    expect(isLegalMastermindGuess(state, [0, 1, 2, -1])).toBe(false);
    expect(isLegalMastermindGuess(state, [0, 1, 2, 2.5])).toBe(false);
  });

  it("종료된 게임에서는 불법", () => {
    const won = applyMastermindGuess(state, [0, 1, 2, 3]);
    expect(isMastermindWon(won)).toBe(true);
    expect(isLegalMastermindGuess(won, [0, 1, 2, 3])).toBe(false);
  });
});

describe("applyMastermindGuess", () => {
  it("추측을 채점해 이력에 append한 새 상태를 반환한다", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    const next = applyMastermindGuess(state, [0, 1, 5, 5]);
    expect(next.guesses).toHaveLength(1);
    expect(next.guesses[0]).toEqual({ guess: [0, 1, 5, 5], feedback: { exact: 2, present: 0 } });
  });

  it("입력 상태와 guess 배열을 변형하지 않는다(불변성)", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    const guess = [0, 1, 5, 5];
    const next = applyMastermindGuess(state, guess);
    expect(state.guesses).toHaveLength(0); // 원본 불변
    guess[0] = 4;
    expect(next.guesses[0]!.guess).toEqual([0, 1, 5, 5]); // 저장본은 복사라 영향 없음
  });

  it("불법 추측(길이 불일치)이면 throw", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    expect(() => applyMastermindGuess(state, [0, 1, 2])).toThrow();
  });

  it("불법 추측(색 범위 밖)이면 throw", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    expect(() => applyMastermindGuess(state, [0, 1, 2, 6])).toThrow();
  });

  it("종료(승리) 후 추측이면 throw", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    const won = applyMastermindGuess(state, [0, 1, 2, 3]);
    expect(() => applyMastermindGuess(won, [0, 0, 0, 0])).toThrow();
  });
});

describe("승/패 판정", () => {
  it("마지막 추측이 전부 정답이면 승리", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    const won = applyMastermindGuess(state, [0, 1, 2, 3]);
    expect(isMastermindWon(won)).toBe(true);
    expect(isMastermindLost(won)).toBe(false);
    expect(isMastermindOver(won)).toBe(true);
  });

  it("추측 이력이 없으면 승리도 패배도 아니다", () => {
    const state = createMastermind([0, 1, 2, 3], OPTS);
    expect(isMastermindWon(state)).toBe(false);
    expect(isMastermindLost(state)).toBe(false);
    expect(isMastermindOver(state)).toBe(false);
  });

  it("마지막 시도에서 정답이면 한도 소진이어도 승리", () => {
    let state: MastermindState = createMastermind([0, 1, 2, 3], { colorCount: 6, maxGuesses: 3 });
    state = applyMastermindGuess(state, [5, 5, 5, 5]);
    state = applyMastermindGuess(state, [4, 4, 4, 4]);
    state = applyMastermindGuess(state, [0, 1, 2, 3]); // 3번째이자 마지막, 정답
    expect(state.guesses).toHaveLength(3);
    expect(isMastermindWon(state)).toBe(true);
    expect(isMastermindLost(state)).toBe(false);
  });

  it("한도를 소진했는데 미정답이면 패배", () => {
    let state: MastermindState = createMastermind([0, 1, 2, 3], { colorCount: 6, maxGuesses: 2 });
    state = applyMastermindGuess(state, [5, 5, 5, 5]);
    state = applyMastermindGuess(state, [4, 4, 4, 4]);
    expect(isMastermindWon(state)).toBe(false);
    expect(isMastermindLost(state)).toBe(true);
    expect(isMastermindOver(state)).toBe(true);
  });

  it("한도 전에는 미정답이어도 패배가 아니다", () => {
    let state: MastermindState = createMastermind([0, 1, 2, 3], { colorCount: 6, maxGuesses: 3 });
    state = applyMastermindGuess(state, [5, 5, 5, 5]);
    expect(isMastermindLost(state)).toBe(false);
    expect(isMastermindOver(state)).toBe(false);
  });
});
