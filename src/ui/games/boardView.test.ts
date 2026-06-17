import { describe, it, expect } from "vitest";
import { boardGridStyle, BOARD_CELL_PX } from "./boardView";

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
