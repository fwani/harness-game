import { describe, it, expect } from "vitest";
import {
  countCheckersPieces,
  createCheckersBoard,
  isDarkSquare,
  pieceAt,
  type CheckersBoard,
} from "./checkers";

/** 8×8 빈 보드를 만든다. */
function emptyBoard(): CheckersBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("checkers isDarkSquare", () => {
  it("identifies dark squares as (row+col) odd", () => {
    expect(isDarkSquare(0, 1)).toBe(true);
    expect(isDarkSquare(1, 0)).toBe(true);
    expect(isDarkSquare(7, 0)).toBe(true);
    expect(isDarkSquare(0, 7)).toBe(true);
  });

  it("identifies light squares as (row+col) even", () => {
    expect(isDarkSquare(0, 0)).toBe(false);
    expect(isDarkSquare(1, 1)).toBe(false);
    expect(isDarkSquare(7, 7)).toBe(false);
    expect(isDarkSquare(4, 2)).toBe(false);
  });
});

describe("checkers createCheckersBoard", () => {
  it("creates an 8×8 board", () => {
    const board = createCheckersBoard();
    expect(board.length).toBe(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
  });

  it("places exactly 12 pieces per color", () => {
    const board = createCheckersBoard();
    expect(countCheckersPieces(board, "light")).toBe(12);
    expect(countCheckersPieces(board, "dark")).toBe(12);
  });

  it("places light on the top 3 rows and dark on the bottom 3 rows", () => {
    const board = createCheckersBoard();
    for (let row = 0; row <= 2; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row]![col];
        if (isDarkSquare(row, col)) {
          expect(cell).toEqual({ color: "light", king: false });
        } else {
          expect(cell).toBeNull();
        }
      }
    }
    for (let row = 5; row <= 7; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row]![col];
        if (isDarkSquare(row, col)) {
          expect(cell).toEqual({ color: "dark", king: false });
        } else {
          expect(cell).toBeNull();
        }
      }
    }
  });

  it("leaves the two middle rows empty", () => {
    const board = createCheckersBoard();
    expect(board[3]!.every((cell) => cell === null)).toBe(true);
    expect(board[4]!.every((cell) => cell === null)).toBe(true);
  });

  it("places every piece on a dark square and none as a king", () => {
    const board = createCheckersBoard();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = pieceAt(board, row, col);
        if (cell !== null) {
          expect(isDarkSquare(row, col)).toBe(true);
          expect(cell.king).toBe(false);
        }
      }
    }
  });

  it("returns a fresh instance (and fresh piece objects) on each call", () => {
    const a = createCheckersBoard();
    const b = createCheckersBoard();
    expect(a).not.toBe(b);
    // 기물 객체도 공유하지 않는다.
    expect(a[0]![1]).not.toBe(b[0]![1]);
    // 한쪽 변경이 다른 쪽에 영향 없음.
    a[0]![1] = null;
    expect(b[0]![1]).toEqual({ color: "light", king: false });
    expect(countCheckersPieces(b, "light")).toBe(12);
  });
});

describe("checkers pieceAt", () => {
  it("returns the cell value for in-bounds coordinates", () => {
    const board = createCheckersBoard();
    expect(pieceAt(board, 0, 1)).toEqual({ color: "light", king: false });
    expect(pieceAt(board, 7, 0)).toEqual({ color: "dark", king: false });
    expect(pieceAt(board, 3, 0)).toBeNull();
    expect(pieceAt(board, 0, 0)).toBeNull();
  });

  it("returns null for out-of-bounds coordinates (negative or >=8)", () => {
    const board = createCheckersBoard();
    expect(pieceAt(board, -1, 0)).toBeNull();
    expect(pieceAt(board, 0, -1)).toBeNull();
    expect(pieceAt(board, 8, 0)).toBeNull();
    expect(pieceAt(board, 0, 8)).toBeNull();
    expect(pieceAt(board, 100, 100)).toBeNull();
  });
});

describe("checkers countCheckersPieces", () => {
  it("counts 0 on an empty board", () => {
    const board = emptyBoard();
    expect(countCheckersPieces(board, "dark")).toBe(0);
    expect(countCheckersPieces(board, "light")).toBe(0);
  });

  it("counts a partial board including kings", () => {
    const board = emptyBoard();
    board[0]![1] = { color: "dark", king: false };
    board[2]![3] = { color: "dark", king: true };
    board[5]![4] = { color: "light", king: false };
    expect(countCheckersPieces(board, "dark")).toBe(2);
    expect(countCheckersPieces(board, "light")).toBe(1);
  });
});
