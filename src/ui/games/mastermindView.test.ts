import { describe, expect, it } from "vitest";
import {
  applyMastermindGuess,
  createMastermind,
  type MastermindState,
} from "../../domain/mastermind";
import {
  MAX_MASTERMIND_COLORS,
  describeMastermindStatus,
  feedbackLabel,
  pegHex,
  pegLabel,
  remainingGuessesLabel,
  validateGuess,
} from "./mastermindView";

// 테스트용 한 판: 비밀 [0,1,2,3], 6색, 시도 한도 10.
function freshGame(): MastermindState {
  return createMastermind([0, 1, 2, 3], { colorCount: 6, maxGuesses: 10 });
}

describe("pegLabel / pegHex", () => {
  it("모든 지원 색이 서로 다른 기호·문자·색을 가진다(색 비의존)", () => {
    const symbols = new Set<string>();
    const texts = new Set<string>();
    const hexes = new Set<string>();
    for (let c = 0; c < MAX_MASTERMIND_COLORS; c += 1) {
      const { symbol, text } = pegLabel(c);
      symbols.add(symbol);
      texts.add(text);
      hexes.add(pegHex(c));
    }
    expect(symbols.size).toBe(MAX_MASTERMIND_COLORS);
    expect(texts.size).toBe(MAX_MASTERMIND_COLORS);
    expect(hexes.size).toBe(MAX_MASTERMIND_COLORS);
  });

  it("문자 라벨은 A부터 시작한다", () => {
    expect(pegLabel(0).text).toBe("A");
    expect(pegLabel(1).text).toBe("B");
  });

  it("범위 밖 색이면 throw", () => {
    expect(() => pegLabel(-1)).toThrow();
    expect(() => pegLabel(MAX_MASTERMIND_COLORS)).toThrow();
    expect(() => pegHex(MAX_MASTERMIND_COLORS)).toThrow();
  });
});

describe("feedbackLabel", () => {
  it("exact/present를 색 비의존 텍스트+기호로 표기한다", () => {
    expect(feedbackLabel({ exact: 2, present: 1 })).toBe("정위치 2(●●) · 색만 1(○)");
  });

  it("0이면 기호 없이 숫자만 표기한다", () => {
    expect(feedbackLabel({ exact: 0, present: 0 })).toBe("정위치 0 · 색만 0");
  });

  it("정답(모두 정위치)이면 색만은 0", () => {
    expect(feedbackLabel({ exact: 4, present: 0 })).toBe("정위치 4(●●●●) · 색만 0");
  });
});

describe("remainingGuessesLabel", () => {
  it("초기에는 전체 시도가 남는다", () => {
    expect(remainingGuessesLabel(freshGame())).toBe(
      "남은 시도 10회 (전체 10회 중 0회 사용)",
    );
  });

  it("추측마다 남은 시도가 줄어든다", () => {
    const after = applyMastermindGuess(freshGame(), [5, 5, 5, 5]);
    expect(remainingGuessesLabel(after)).toBe(
      "남은 시도 9회 (전체 10회 중 1회 사용)",
    );
  });
});

describe("describeMastermindStatus", () => {
  it("진행중: over=false, won=false, 남은 시도 안내 포함", () => {
    const view = describeMastermindStatus(freshGame(), "playing");
    expect(view.over).toBe(false);
    expect(view.won).toBe(false);
    expect(view.message).toContain("진행 중");
  });

  it("승리: 정답을 맞히면 over=true, won=true", () => {
    const won = applyMastermindGuess(freshGame(), [0, 1, 2, 3]);
    const view = describeMastermindStatus(won, "won");
    expect(view.over).toBe(true);
    expect(view.won).toBe(true);
    expect(view.message).toContain("정답");
  });

  it("패배: 시도 한도 소진 시 over=true, won=false(비밀 코드 비공개는 컴포넌트 책임)", () => {
    let state = createMastermind([0, 1, 2, 3], { colorCount: 6, maxGuesses: 2 });
    state = applyMastermindGuess(state, [5, 5, 5, 5]);
    state = applyMastermindGuess(state, [5, 5, 5, 5]);
    const view = describeMastermindStatus(state, "lost");
    expect(view.over).toBe(true);
    expect(view.won).toBe(false);
    expect(view.message).toContain("모두 썼습니다");
  });
});

describe("validateGuess", () => {
  it("칸이 덜 차면 사유와 함께 거부(시도 소진 없음)", () => {
    const result = validateGuess(freshGame(), [0, 1, null, null]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("4칸 중 2칸");
    }
  });

  it("모든 칸이 채워지고 합법이면 완성된 guess 반환", () => {
    const result = validateGuess(freshGame(), [0, 1, 2, 3]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.guess).toEqual([0, 1, 2, 3]);
    }
  });

  it("색 범위를 벗어나면 사유와 함께 거부", () => {
    const result = validateGuess(freshGame(), [0, 1, 2, 99]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("색 범위");
    }
  });

  it("종료된 게임이면 사유와 함께 거부", () => {
    const won = applyMastermindGuess(freshGame(), [0, 1, 2, 3]);
    const result = validateGuess(won, [0, 1, 2, 3]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("종료된 게임");
    }
  });
});
