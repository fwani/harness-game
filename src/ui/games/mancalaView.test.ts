import { describe, it, expect } from "vitest";
import { createMancalaBoard, applyMancalaMove } from "../../domain/mancala";
import type { MancalaPlayer } from "../../domain/mancala";
import {
  mancalaCaptureLabel,
  mancalaOutcomeLabel,
  mancalaPitAriaLabel,
  mancalaScoreLabel,
  mancalaStoreAriaLabel,
  mancalaTurnLabel,
} from "./mancalaView";

const label = (p: MancalaPlayer): string => `P${p}`;

describe("mancalaScoreLabel", () => {
  it("초기 보드는 양측 곳간 0을 표시한다", () => {
    expect(mancalaScoreLabel(createMancalaBoard(), label)).toBe("P1 곳간 0 · P2 곳간 0");
  });

  it("곳간에 씨앗이 쌓이면 그 수를 표시한다(도메인 상태만 읽음, 입력 불변)", () => {
    const base = createMancalaBoard();
    // 표준 보드에서 P1이 구덩이 2(0-기반)를 두면 4칸 뿌려 마지막이 자기 곳간에 안착한다.
    const result = applyMancalaMove(base, 1, 2);
    expect(mancalaScoreLabel(result.board, label)).toBe("P1 곳간 1 · P2 곳간 0");
    // 원본 보드는 변형되지 않는다.
    expect(base.stores[1]).toBe(0);
  });
});

describe("mancalaTurnLabel", () => {
  it("일반 차례와 '한 번 더'(again)를 구분한다", () => {
    expect(mancalaTurnLabel(1, false, label)).toContain("P1 차례");
    expect(mancalaTurnLabel(1, false, label)).not.toContain("한 번 더");
    expect(mancalaTurnLabel(2, true, label)).toContain("P2 차례");
    expect(mancalaTurnLabel(2, true, label)).toContain("한 번 더");
  });
});

describe("mancalaCaptureLabel", () => {
  it("captured>0이면 누가 몇 개 포획했는지 문구를 만든다", () => {
    const text = mancalaCaptureLabel(1, 5, label);
    expect(text).toContain("P1");
    expect(text).toContain("5개 포획");
  });

  it("captured가 0 이하/비정상이면 null(표시 없음)", () => {
    expect(mancalaCaptureLabel(1, 0, label)).toBeNull();
    expect(mancalaCaptureLabel(2, -1, label)).toBeNull();
    expect(mancalaCaptureLabel(2, Number.NaN, label)).toBeNull();
  });
});

describe("mancalaOutcomeLabel", () => {
  it("승자/무승부를 구분한다", () => {
    expect(mancalaOutcomeLabel(null, label)).toContain("무승부");
    expect(mancalaOutcomeLabel(1, label)).toBe("P1 승리! 🎉");
    expect(mancalaOutcomeLabel(2, label)).toBe("P2 승리! 🎉");
  });
});

describe("mancalaPitAriaLabel / mancalaStoreAriaLabel", () => {
  it("구덩이는 1-기반 번호와 씨앗 수, 소유자를 담는다", () => {
    expect(mancalaPitAriaLabel(1, 0, 4, label)).toBe("P1 구덩이 1 · 씨앗 4개");
    expect(mancalaPitAriaLabel(2, 5, 0, label)).toBe("P2 구덩이 6 · 씨앗 0개");
  });

  it("곳간은 소유자와 씨앗 수를 담는다", () => {
    expect(mancalaStoreAriaLabel(1, 7, label)).toBe("P1 곳간 · 씨앗 7개");
    expect(mancalaStoreAriaLabel(2, 0, label)).toBe("P2 곳간 · 씨앗 0개");
  });
});
