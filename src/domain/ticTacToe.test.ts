import { describe, it, expect } from "vitest";
import {
  createTicTacToeBoard,
  applyTicTacToeMove,
  findTicTacToeWinner,
  isTicTacToeDraw,
  type Board,
} from "./ticTacToe";

describe("ticTacToe createTicTacToeBoard", () => {
  it("creates a 3×3 board with every cell null", () => {
    const board = createTicTacToeBoard();
    expect(board.length).toBe(3);
    expect(board.every((row) => row.length === 3)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("returns a fresh instance on each call (no shared rows)", () => {
    const a = createTicTacToeBoard();
    const b = createTicTacToeBoard();
    a[0]![0] = "X";
    expect(b[0]![0]).toBeNull();
  });
});

describe("ticTacToe applyTicTacToeMove", () => {
  it("places a mark on an empty cell and returns a new board", () => {
    const board = createTicTacToeBoard();
    const next = applyTicTacToeMove(board, 1, 2, "X");
    expect(next[1]![2]).toBe("X");
    // 그 외 칸은 비어 있다.
    expect(next[0]![0]).toBeNull();
  });

  it("does not mutate the input board (immutability)", () => {
    const board = createTicTacToeBoard();
    const snapshot = JSON.stringify(board);
    applyTicTacToeMove(board, 0, 0, "O");
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("throws for out-of-range or non-integer coordinates", () => {
    const board = createTicTacToeBoard();
    expect(() => applyTicTacToeMove(board, -1, 0, "X")).toThrow();
    expect(() => applyTicTacToeMove(board, 0, 3, "X")).toThrow();
    expect(() => applyTicTacToeMove(board, 3, 0, "X")).toThrow();
    expect(() => applyTicTacToeMove(board, 1.5, 1, "X")).toThrow();
  });

  it("throws when the cell is already occupied", () => {
    const board = applyTicTacToeMove(createTicTacToeBoard(), 1, 1, "X");
    expect(() => applyTicTacToeMove(board, 1, 1, "O")).toThrow();
  });
});

describe("ticTacToe findTicTacToeWinner", () => {
  it("detects a horizontal win", () => {
    const board: Board = [
      ["X", "X", "X"],
      ["O", "O", null],
      [null, null, null],
    ];
    expect(findTicTacToeWinner(board)).toBe("X");
  });

  it("detects a vertical win", () => {
    const board: Board = [
      ["O", "X", null],
      ["O", "X", null],
      ["O", null, null],
    ];
    expect(findTicTacToeWinner(board)).toBe("O");
  });

  it("detects a top-left to bottom-right diagonal win", () => {
    const board: Board = [
      ["X", "O", null],
      ["O", "X", null],
      [null, null, "X"],
    ];
    expect(findTicTacToeWinner(board)).toBe("X");
  });

  it("detects a top-right to bottom-left diagonal win", () => {
    const board: Board = [
      ["X", "O", "O"],
      ["X", "O", null],
      ["O", null, null],
    ];
    expect(findTicTacToeWinner(board)).toBe("O");
  });

  it("returns null when there is no winning line", () => {
    const board: Board = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", null],
    ];
    expect(findTicTacToeWinner(board)).toBeNull();
  });

  it("returns null for an empty board", () => {
    expect(findTicTacToeWinner(createTicTacToeBoard())).toBeNull();
  });

  it("does not mutate the board while scanning", () => {
    const board: Board = [
      ["X", "X", "X"],
      [null, null, null],
      [null, null, null],
    ];
    const snapshot = JSON.stringify(board);
    findTicTacToeWinner(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("ticTacToe isTicTacToeDraw", () => {
  it("is true when the board is full with no winner", () => {
    const board: Board = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", "X"],
    ];
    expect(findTicTacToeWinner(board)).toBeNull();
    expect(isTicTacToeDraw(board)).toBe(true);
  });

  it("is false when the board has empty cells", () => {
    const board: Board = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", null],
    ];
    expect(isTicTacToeDraw(board)).toBe(false);
  });

  it("is false when a full board has a winner", () => {
    const board: Board = [
      ["X", "X", "X"],
      ["O", "O", "X"],
      ["O", "X", "O"],
    ];
    expect(isTicTacToeDraw(board)).toBe(false);
  });

  it("is false for an empty board", () => {
    expect(isTicTacToeDraw(createTicTacToeBoard())).toBe(false);
  });
});
