import { describe, it, expect } from "vitest";
import { createHangman, guessHangmanLetter } from "../../domain/hangman";
import {
  hangmanStatusLabel,
  letterButtons,
  maskedDisplay,
  remainingMisses,
  wrongLetters,
} from "./hangmanView";

describe("maskedDisplay", () => {
  it("못 맞힌 글자는 '_', 맞힌 글자는 그대로 띄워 표시한다", () => {
    let state = createHangman("cat");
    expect(maskedDisplay(state)).toBe("_ _ _");
    state = guessHangmanLetter(state, "c");
    state = guessHangmanLetter(state, "t");
    expect(maskedDisplay(state)).toBe("c _ t");
  });

  it("같은 글자가 여러 번 있어도 모두 공개한다", () => {
    let state = createHangman("banana");
    state = guessHangmanLetter(state, "a");
    expect(maskedDisplay(state)).toBe("_ a _ a _ a");
  });
});

describe("wrongLetters", () => {
  it("정답에 없던 오답 글자만 추측 순서대로 돌려준다", () => {
    let state = createHangman("cat");
    state = guessHangmanLetter(state, "c"); // hit
    state = guessHangmanLetter(state, "x"); // miss
    state = guessHangmanLetter(state, "z"); // miss
    expect(wrongLetters(state)).toEqual(["x", "z"]);
  });

  it("오답이 없으면 빈 배열", () => {
    const state = guessHangmanLetter(createHangman("cat"), "c");
    expect(wrongLetters(state)).toEqual([]);
  });
});

describe("remainingMisses", () => {
  it("maxMisses - misses 를 돌려준다", () => {
    let state = createHangman("cat", 3);
    expect(remainingMisses(state)).toBe(3);
    state = guessHangmanLetter(state, "x"); // miss
    expect(remainingMisses(state)).toBe(2);
  });

  it("한도에 도달하면 0으로 클램프한다", () => {
    let state = createHangman("cat", 1);
    state = guessHangmanLetter(state, "x"); // miss → misses=1=max
    expect(remainingMisses(state)).toBe(0);
  });
});

describe("hangmanStatusLabel", () => {
  it("진행/승리/패배 문구를 구분한다", () => {
    expect(hangmanStatusLabel("playing")).toContain("골라");
    expect(hangmanStatusLabel("won")).toContain("정답");
    expect(hangmanStatusLabel("lost")).toContain("게임 오버");
  });
});

describe("letterButtons", () => {
  it("a..z 26개를 순서대로 만든다", () => {
    const buttons = letterButtons(createHangman("cat"));
    expect(buttons).toHaveLength(26);
    expect(buttons[0]!.letter).toBe("a");
    expect(buttons[25]!.letter).toBe("z");
  });

  it("이미 추측한 글자는 disabled", () => {
    const state = guessHangmanLetter(createHangman("cat"), "c");
    const buttons = letterButtons(state);
    expect(buttons.find((b) => b.letter === "c")!.disabled).toBe(true);
    expect(buttons.find((b) => b.letter === "a")!.disabled).toBe(false);
  });

  it("게임이 종료되면(승리) 모든 버튼이 disabled", () => {
    let state = createHangman("ab");
    state = guessHangmanLetter(state, "a");
    state = guessHangmanLetter(state, "b"); // 승리
    expect(letterButtons(state).every((b) => b.disabled)).toBe(true);
  });

  it("게임이 종료되면(패배) 모든 버튼이 disabled", () => {
    let state = createHangman("cat", 1);
    state = guessHangmanLetter(state, "x"); // 패배
    expect(letterButtons(state).every((b) => b.disabled)).toBe(true);
  });
});
