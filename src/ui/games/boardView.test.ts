import { describe, it, expect } from "vitest";
import {
  boardGridStyle,
  BOARD_CELL_PX,
  nextBoardFocus,
  type BoardDims,
} from "./boardView";

describe("boardView.boardGridStyle", () => {
  it("열 수만큼 minmax(0, 1fr) 트랙을 만든다(좁은 폭에서 칸이 줄어들 수 있게)", () => {
    expect(boardGridStyle(15).gridTemplateColumns).toBe(
      "repeat(15, minmax(0, 1fr))",
    );
    expect(boardGridStyle(9).gridTemplateColumns).toBe(
      "repeat(9, minmax(0, 1fr))",
    );
    expect(boardGridStyle(8).gridTemplateColumns).toBe(
      "repeat(8, minmax(0, 1fr))",
    );
  });

  it("maxWidth를 열 수 × 셀 폭으로 캡한다(데스크톱 칸 크기 유지)", () => {
    expect(boardGridStyle(15).maxWidth).toBe(`${15 * BOARD_CELL_PX}px`);
    expect(boardGridStyle(9).maxWidth).toBe(`${9 * BOARD_CELL_PX}px`);
  });

  it("셀 폭을 명시하면 그 값으로 캡한다", () => {
    expect(boardGridStyle(10, 30).maxWidth).toBe("300px");
  });

  it("열 수가 양의 정수가 아니면 throw 한다", () => {
    expect(() => boardGridStyle(0)).toThrow();
    expect(() => boardGridStyle(-1)).toThrow();
    expect(() => boardGridStyle(1.5)).toThrow();
  });
});

describe("boardView.nextBoardFocus", () => {
  // 게임별 실제 보드 치수.
  const GOMOKU: BoardDims = { cols: 15, rows: 15 };
  const GO: BoardDims = { cols: 9, rows: 9 };
  const REVERSI: BoardDims = { cols: 8, rows: 8 };
  const JANGGI: BoardDims = { cols: 9, rows: 10 };

  it("4방향으로 한 칸씩 이동한다", () => {
    const mid = { x: 4, y: 4 };
    expect(nextBoardFocus(mid, "ArrowLeft", GOMOKU)).toEqual({ x: 3, y: 4 });
    expect(nextBoardFocus(mid, "ArrowRight", GOMOKU)).toEqual({ x: 5, y: 4 });
    expect(nextBoardFocus(mid, "ArrowUp", GOMOKU)).toEqual({ x: 4, y: 3 });
    expect(nextBoardFocus(mid, "ArrowDown", GOMOKU)).toEqual({ x: 4, y: 5 });
  });

  it("네 모서리에서 가장자리 밖으로는 이동하지 않는다(클램프, 래핑 없음)", () => {
    const topLeft = { x: 0, y: 0 };
    expect(nextBoardFocus(topLeft, "ArrowLeft", GOMOKU)).toEqual(topLeft);
    expect(nextBoardFocus(topLeft, "ArrowUp", GOMOKU)).toEqual(topLeft);

    const bottomRight = { x: 14, y: 14 };
    expect(nextBoardFocus(bottomRight, "ArrowRight", GOMOKU)).toEqual(bottomRight);
    expect(nextBoardFocus(bottomRight, "ArrowDown", GOMOKU)).toEqual(bottomRight);

    const topRight = { x: 14, y: 0 };
    expect(nextBoardFocus(topRight, "ArrowRight", GOMOKU)).toEqual(topRight);
    expect(nextBoardFocus(topRight, "ArrowUp", GOMOKU)).toEqual(topRight);

    const bottomLeft = { x: 0, y: 14 };
    expect(nextBoardFocus(bottomLeft, "ArrowLeft", GOMOKU)).toEqual(bottomLeft);
    expect(nextBoardFocus(bottomLeft, "ArrowDown", GOMOKU)).toEqual(bottomLeft);
  });

  it("Home/End는 같은 행의 처음/끝 열로 이동한다", () => {
    const cell = { x: 5, y: 3 };
    expect(nextBoardFocus(cell, "Home", GOMOKU)).toEqual({ x: 0, y: 3 });
    expect(nextBoardFocus(cell, "End", GOMOKU)).toEqual({ x: 14, y: 3 });
  });

  it("PageUp/PageDown은 같은 열의 처음/끝 행으로 이동한다", () => {
    const cell = { x: 5, y: 3 };
    expect(nextBoardFocus(cell, "PageUp", GOMOKU)).toEqual({ x: 5, y: 0 });
    expect(nextBoardFocus(cell, "PageDown", GOMOKU)).toEqual({ x: 5, y: 14 });
  });

  it("무관한 키는 null을 반환한다", () => {
    const cell = { x: 2, y: 2 };
    expect(nextBoardFocus(cell, "Enter", GOMOKU)).toBeNull();
    expect(nextBoardFocus(cell, " ", GOMOKU)).toBeNull();
    expect(nextBoardFocus(cell, "Tab", GOMOKU)).toBeNull();
    expect(nextBoardFocus(cell, "a", GOMOKU)).toBeNull();
  });

  it("바둑 9×9 경계에서 클램프한다", () => {
    expect(nextBoardFocus({ x: 8, y: 8 }, "ArrowRight", GO)).toEqual({ x: 8, y: 8 });
    expect(nextBoardFocus({ x: 8, y: 8 }, "ArrowDown", GO)).toEqual({ x: 8, y: 8 });
    expect(nextBoardFocus({ x: 0, y: 0 }, "End", GO)).toEqual({ x: 8, y: 0 });
    expect(nextBoardFocus({ x: 0, y: 0 }, "PageDown", GO)).toEqual({ x: 0, y: 8 });
  });

  it("오델로 8×8 경계에서 클램프한다", () => {
    expect(nextBoardFocus({ x: 7, y: 7 }, "ArrowRight", REVERSI)).toEqual({ x: 7, y: 7 });
    expect(nextBoardFocus({ x: 7, y: 7 }, "ArrowDown", REVERSI)).toEqual({ x: 7, y: 7 });
    expect(nextBoardFocus({ x: 3, y: 3 }, "End", REVERSI)).toEqual({ x: 7, y: 3 });
    expect(nextBoardFocus({ x: 3, y: 3 }, "PageDown", REVERSI)).toEqual({ x: 3, y: 7 });
  });

  it("장기 9×10(비정방형) 경계에서 행/열 한계가 다르게 적용된다", () => {
    // 마지막 열=8, 마지막 행=9.
    expect(nextBoardFocus({ x: 8, y: 9 }, "ArrowRight", JANGGI)).toEqual({ x: 8, y: 9 });
    expect(nextBoardFocus({ x: 8, y: 9 }, "ArrowDown", JANGGI)).toEqual({ x: 8, y: 9 });
    expect(nextBoardFocus({ x: 0, y: 0 }, "End", JANGGI)).toEqual({ x: 8, y: 0 });
    expect(nextBoardFocus({ x: 0, y: 0 }, "PageDown", JANGGI)).toEqual({ x: 0, y: 9 });
  });
});
