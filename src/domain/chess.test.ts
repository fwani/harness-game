import { describe, it, expect } from "vitest";
import {
  createChessBoard,
  isOnBoard,
  pieceAt,
  squareName,
  type ChessBoard,
  type ChessColor,
  type ChessPieceType,
} from "./chess";

/** 보드 위 주어진 색 기물 수를 센다. */
function countByColor(board: ChessBoard, color: ChessColor): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.color === color) {
        count++;
      }
    }
  }
  return count;
}

/** 보드 위 주어진 색·타입 기물 수를 센다. */
function countByPiece(board: ChessBoard, color: ChessColor, type: ChessPieceType): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.color === color && cell.type === type) {
        count++;
      }
    }
  }
  return count;
}

describe("chess isOnBoard", () => {
  it("accepts coordinates within 0..7", () => {
    expect(isOnBoard(0, 0)).toBe(true);
    expect(isOnBoard(7, 7)).toBe(true);
    expect(isOnBoard(3, 4)).toBe(true);
  });

  it("rejects coordinates outside the board", () => {
    expect(isOnBoard(-1, 0)).toBe(false);
    expect(isOnBoard(0, -1)).toBe(false);
    expect(isOnBoard(8, 0)).toBe(false);
    expect(isOnBoard(0, 8)).toBe(false);
  });

  it("rejects non-integer coordinates", () => {
    expect(isOnBoard(1.5, 0)).toBe(false);
    expect(isOnBoard(0, 2.1)).toBe(false);
    expect(isOnBoard(Number.NaN, 0)).toBe(false);
  });
});

describe("chess createChessBoard", () => {
  it("creates an 8×8 board", () => {
    const board = createChessBoard();
    expect(board.length).toBe(8);
    for (const row of board) {
      expect(row.length).toBe(8);
    }
  });

  it("places back ranks and pawns correctly", () => {
    const board = createChessBoard();
    const order: ChessPieceType[] = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    for (let col = 0; col < 8; col++) {
      expect(board[0]![col]).toEqual({ color: "black", type: order[col] });
      expect(board[1]![col]).toEqual({ color: "black", type: "pawn" });
      expect(board[6]![col]).toEqual({ color: "white", type: "pawn" });
      expect(board[7]![col]).toEqual({ color: "white", type: order[col] });
    }
  });

  it("leaves rows 2..5 empty", () => {
    const board = createChessBoard();
    for (let row = 2; row <= 5; row++) {
      for (let col = 0; col < 8; col++) {
        expect(board[row]![col]).toBeNull();
      }
    }
  });

  it("has exactly 16 pieces of each color with correct counts", () => {
    const board = createChessBoard();
    for (const color of ["white", "black"] as ChessColor[]) {
      expect(countByColor(board, color)).toBe(16);
      expect(countByPiece(board, color, "king")).toBe(1);
      expect(countByPiece(board, color, "queen")).toBe(1);
      expect(countByPiece(board, color, "rook")).toBe(2);
      expect(countByPiece(board, color, "knight")).toBe(2);
      expect(countByPiece(board, color, "bishop")).toBe(2);
      expect(countByPiece(board, color, "pawn")).toBe(8);
    }
  });

  it("places each queen on her own color (white d1, black d8)", () => {
    const board = createChessBoard();
    // d1 = row7/col3 (white), d8 = row0/col3 (black). 둘 다 col 3.
    expect(board[7]![3]).toEqual({ color: "white", type: "queen" });
    expect(board[0]![3]).toEqual({ color: "black", type: "queen" });
  });

  it("returns a fresh board and fresh piece objects on each call (no shared references)", () => {
    const a = createChessBoard();
    const b = createChessBoard();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]![0]).not.toBe(b[0]![0]);
    // 한 보드를 변형해도 다른 보드에 영향이 없다.
    a[0]![0] = null;
    expect(b[0]![0]).toEqual({ color: "black", type: "rook" });
  });
});

describe("chess pieceAt", () => {
  it("returns the piece at an occupied square", () => {
    const board = createChessBoard();
    expect(pieceAt(board, 7, 4)).toEqual({ color: "white", type: "king" });
    expect(pieceAt(board, 0, 4)).toEqual({ color: "black", type: "king" });
  });

  it("returns null for an empty square", () => {
    const board = createChessBoard();
    expect(pieceAt(board, 4, 4)).toBeNull();
  });

  it("returns null for out-of-range coordinates (no throw)", () => {
    const board = createChessBoard();
    expect(pieceAt(board, -1, 0)).toBeNull();
    expect(pieceAt(board, 8, 0)).toBeNull();
    expect(pieceAt(board, 0, 8)).toBeNull();
  });
});

describe("chess squareName", () => {
  it("maps representative coordinates to algebraic notation", () => {
    expect(squareName(7, 0)).toBe("a1");
    expect(squareName(0, 7)).toBe("h8");
    expect(squareName(7, 4)).toBe("e1");
    expect(squareName(0, 3)).toBe("d8");
    expect(squareName(0, 0)).toBe("a8");
    expect(squareName(7, 7)).toBe("h1");
  });

  it("throws for out-of-range coordinates", () => {
    expect(() => squareName(-1, 0)).toThrow();
    expect(() => squareName(8, 0)).toThrow();
    expect(() => squareName(0, 8)).toThrow();
  });
});
