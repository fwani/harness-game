import { describe, it, expect } from "vitest";
import { createReversiBoard, type Board } from "./reversi";
import { legalReversiMoves, hasLegalReversiMove } from "./reversiMoves";

/** 8×8 빈 보드를 만든다. */
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("reversiMoves legalReversiMoves", () => {
  it("returns black's 4 opening moves in deterministic order", () => {
    const board = createReversiBoard();
    // 결정적 순서: y asc, 같은 y 내 x asc → (3,2),(2,3),(5,4),(4,5).
    expect(legalReversiMoves(board, "black")).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
    ]);
  });

  it("returns white's 4 opening moves in deterministic order", () => {
    const board = createReversiBoard();
    expect(legalReversiMoves(board, "white")).toEqual([
      { x: 4, y: 2 },
      { x: 5, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
    ]);
  });

  it("returns [] when there is no legal move", () => {
    // 완전히 빈 보드: 뒤집을 상대 디스크가 없으므로 합법 수 없음.
    expect(legalReversiMoves(emptyBoard(), "black")).toEqual([]);
    // 단색만 채워진 구성: 상대 디스크가 없어 뒤집힘 불가.
    const oneColor = emptyBoard();
    oneColor[0]![0] = "black";
    oneColor[0]![1] = "black";
    expect(legalReversiMoves(oneColor, "black")).toEqual([]);
  });

  it("does not mutate the input board", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    legalReversiMoves(board, "black");
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("reversiMoves hasLegalReversiMove", () => {
  it("is true for both colors on the standard opening", () => {
    const board = createReversiBoard();
    expect(hasLegalReversiMove(board, "black")).toBe(true);
    expect(hasLegalReversiMove(board, "white")).toBe(true);
  });

  it("is false when no legal move exists", () => {
    expect(hasLegalReversiMove(emptyBoard(), "black")).toBe(false);
  });

  it("does not mutate the input board", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    hasLegalReversiMove(board, "black");
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
