import { describe, it, expect } from "vitest";
import { createNimPiles } from "../../domain/nim";
import type { NimPlayer } from "../../domain/nim";
import {
  defaultNimLabel,
  nimMoveAriaLabel,
  nimMoveSummary,
  nimOutcomeLabel,
  nimPileAriaLabel,
  nimPileLabel,
  nimPileViews,
  nimStonesSymbol,
  nimTurnLabel,
  nimWinSide,
} from "./nimView";

const label = (p: NimPlayer): string => (p === 1 ? "나" : "CPU");

describe("nimPileViews", () => {
  it("더미별 남은 돌과 가져갈 수 있는 개수(1..stones)를 합법 수 기준으로 만든다", () => {
    const views = nimPileViews(createNimPiles([3, 5, 7]));
    expect(views).toHaveLength(3);
    expect(views[0]).toEqual({ pile: 0, stones: 3, counts: [1, 2, 3] });
    expect(views[1]).toEqual({ pile: 1, stones: 5, counts: [1, 2, 3, 4, 5] });
    expect(views[2]).toEqual({ pile: 2, stones: 7, counts: [1, 2, 3, 4, 5, 6, 7] });
  });

  it("빈 더미는 counts가 빈 배열이다(둘 곳 없음)", () => {
    const views = nimPileViews(createNimPiles([0, 2, 0]));
    expect(views[0]).toEqual({ pile: 0, stones: 0, counts: [] });
    expect(views[1]).toEqual({ pile: 1, stones: 2, counts: [1, 2] });
    expect(views[2]).toEqual({ pile: 2, stones: 0, counts: [] });
  });

  it("입력 piles를 변형하지 않는다(불변)", () => {
    const piles = createNimPiles([1, 2]);
    nimPileViews(piles);
    expect(piles).toEqual([1, 2]);
  });
});

describe("nimPileLabel / nimStonesSymbol", () => {
  it("더미 라벨은 1-기반이다", () => {
    expect(nimPileLabel(0)).toBe("더미 1");
    expect(nimPileLabel(2)).toBe("더미 3");
  });

  it("돌을 색이 아닌 기호로 표시하고 0이면 대시", () => {
    expect(nimStonesSymbol(3)).toBe("●●●");
    expect(nimStonesSymbol(1)).toBe("●");
    expect(nimStonesSymbol(0)).toBe("—");
    expect(nimStonesSymbol(-1)).toBe("—");
    expect(nimStonesSymbol(Number.NaN)).toBe("—");
  });
});

describe("nimTurnLabel", () => {
  it("다음에 둘 플레이어를 라벨러로 표기한다", () => {
    expect(nimTurnLabel(1, label)).toContain("나 차례");
    expect(nimTurnLabel(2, label)).toContain("CPU 차례");
  });

  it("라벨러를 안 주면 기본값(사람/CPU)을 쓴다", () => {
    expect(nimTurnLabel(1)).toContain("사람 차례");
    expect(nimTurnLabel(2)).toContain("CPU 차례");
  });
});

describe("nimOutcomeLabel", () => {
  it("승자를 사람/CPU로 구분해 표시한다", () => {
    expect(nimOutcomeLabel(1, label)).toBe("나 승리! 🎉");
    expect(nimOutcomeLabel(2, label)).toBe("CPU 승리! 🎉");
  });

  it("winner=null이면 방어적으로 무승부 문구", () => {
    expect(nimOutcomeLabel(null, label)).toContain("무승부");
  });

  it("기본 라벨러로도 동작한다", () => {
    expect(nimOutcomeLabel(1)).toBe("사람 승리! 🎉");
  });
});

describe("nimWinSide", () => {
  it("1=a, 2=b, null=draw로 매핑한다", () => {
    expect(nimWinSide(1)).toBe("a");
    expect(nimWinSide(2)).toBe("b");
    expect(nimWinSide(null)).toBe("draw");
  });
});

describe("nimMoveAriaLabel / nimPileAriaLabel / nimMoveSummary", () => {
  it("가져가기 버튼 라벨은 더미와 개수를 담는다", () => {
    expect(nimMoveAriaLabel(0, 2)).toBe("더미 1에서 2개 가져가기");
    expect(nimMoveAriaLabel(2, 1)).toBe("더미 3에서 1개 가져가기");
  });

  it("더미 라벨은 더미 번호와 남은 돌 수를 담는다", () => {
    expect(nimPileAriaLabel(1, 5)).toBe("더미 2 · 남은 돌 5개");
  });

  it("직전 수 요약은 누가 어느 더미에서 몇 개 가져갔는지 담는다", () => {
    expect(nimMoveSummary(1, 0, 3, label)).toBe("나: 더미 1에서 3개");
    expect(nimMoveSummary(2, 2, 1, label)).toBe("CPU: 더미 3에서 1개");
  });
});

describe("defaultNimLabel", () => {
  it("1=사람, 2=CPU", () => {
    expect(defaultNimLabel(1)).toBe("사람");
    expect(defaultNimLabel(2)).toBe("CPU");
  });
});
