import { describe, expect, it } from "vitest";
import { createBingoCard, createBingoState, markBingoNumber } from "../../domain/bingo";
import type { BingoGame } from "../../application/playBingo";
import {
  bingoCellViews,
  bingoGridTemplate,
  bingoLinesLabel,
  describeBingoStatus,
  drawSummaryLabel,
  remainingLabel,
} from "./bingoView";

/** 테스트용 BingoGame 빌더(2×2): numbers [1,2,3,4], 선택적 마킹/추첨 상태. */
function makeGame(
  numbers: number[],
  size: number,
  opts?: { marked?: number[]; lastDrawn?: number | null; remaining?: number[] },
): BingoGame {
  let state = createBingoState(createBingoCard(numbers, size));
  for (const value of opts?.marked ?? []) {
    state = markBingoNumber(state, value);
  }
  return {
    state,
    remaining: opts?.remaining ?? [],
    lastDrawn: opts?.lastDrawn ?? null,
  };
}

describe("bingoView.bingoCellViews", () => {
  it("카드를 행 우선 셀 모델로 변환하고 좌표를 매핑한다", () => {
    const game = makeGame([1, 2, 3, 4], 2);
    const cells = bingoCellViews(game);
    expect(cells).toHaveLength(4);

    expect(cells[0]).toMatchObject({ value: 1, index: 0, row: 0, col: 0, marked: false });
    expect(cells[3]).toMatchObject({ value: 4, index: 3, row: 1, col: 1, marked: false });
  });

  it("마킹을 색이 아니라 기호(✓)와 aria-label로 병행 표시한다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1] });
    const cells = bingoCellViews(game);

    const marked = cells.find((c) => c.value === 1)!;
    expect(marked.marked).toBe(true);
    expect(marked.symbol).toBe("✓");
    expect(marked.ariaLabel).toContain("표시됨");

    const unmarked = cells.find((c) => c.value === 2)!;
    expect(unmarked.marked).toBe(false);
    expect(unmarked.symbol).toBe("");
    expect(unmarked.ariaLabel).toContain("미표시");
  });

  it("입력 상태를 변형하지 않는다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1] });
    const snapshot = game.state.marked.slice();
    bingoCellViews(game);
    expect(game.state.marked).toEqual(snapshot);
  });
});

describe("bingoView.bingoGridTemplate", () => {
  it("크기에 맞는 grid-template-columns 문자열을 만든다", () => {
    expect(bingoGridTemplate(5)).toBe("repeat(5, minmax(0, 1fr))");
    expect(bingoGridTemplate(2)).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("양의 정수가 아니면 throw한다", () => {
    expect(() => bingoGridTemplate(0)).toThrow();
    expect(() => bingoGridTemplate(2.5)).toThrow();
  });
});

describe("bingoView.drawSummaryLabel", () => {
  it("추첨 전이면 시작 안내를 반환한다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { lastDrawn: null });
    expect(drawSummaryLabel(game)).toContain("시작");
  });

  it("추첨 후이면 직전 번호를 안내한다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { lastDrawn: 3 });
    expect(drawSummaryLabel(game)).toContain("3");
  });
});

describe("bingoView.remainingLabel", () => {
  it("남은 번호 수를 라벨로 만든다", () => {
    expect(remainingLabel(makeGame([1, 2, 3, 4], 2, { remaining: [5, 6] }))).toBe("남은 번호 2");
    expect(remainingLabel(makeGame([1, 2, 3, 4], 2, { remaining: [] }))).toBe("남은 번호 0");
  });
});

describe("bingoView.bingoLinesLabel", () => {
  it("완성 줄 수를 도메인 countBingoLines로 센다", () => {
    // 첫 행(1,2) 전부 마킹 → 가로 1줄 완성.
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1, 2] });
    expect(bingoLinesLabel(game)).toBe("완성 줄 1");

    const none = makeGame([1, 2, 3, 4], 2, { marked: [1] });
    expect(bingoLinesLabel(none)).toBe("완성 줄 0");
  });
});

describe("bingoView.describeBingoStatus", () => {
  it("빙고 달성이면 완성 문구를 반환한다", () => {
    // 1행(1,2) 완성 → 빙고.
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1, 2], remaining: [3, 4] });
    expect(describeBingoStatus(game)).toContain("빙고");
  });

  it("진행 중이면 추첨 안내를 반환한다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1], remaining: [2, 3, 4] });
    expect(describeBingoStatus(game)).toContain("추첨");
  });

  it("번호 소진·미빙고면 안내 문구를 반환한다", () => {
    const game = makeGame([1, 2, 3, 4], 2, { marked: [1], remaining: [] });
    const msg = describeBingoStatus(game);
    expect(msg).toContain("빙고를 만들지 못");
  });
});
