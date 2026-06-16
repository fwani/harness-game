import { describe, it, expect } from "vitest";
import {
  createBoard,
  placeStone,
  checkWin,
  isBoardFull,
  type Board,
  type Stone,
} from "./gomoku";

/** (x,y) 목록에 같은 색 돌을 차례로 놓은 보드를 만든다. */
function withStones(size: number, stone: Stone, coords: ReadonlyArray<[number, number]>): Board {
  return coords.reduce<Board>(
    (board, [x, y]) => placeStone(board, x, y, stone),
    createBoard(size),
  );
}

describe("gomoku createBoard", () => {
  it("creates an empty size×size board", () => {
    const board = createBoard(15);
    expect(board.length).toBe(15);
    expect(board.every((row) => row.length === 15)).toBe(true);
    expect(board.every((row) => row.every((cell) => cell === null))).toBe(true);
  });

  it("defaults to size 15", () => {
    expect(createBoard().length).toBe(15);
  });

  it("throws on non-integer or size < 1", () => {
    expect(() => createBoard(0)).toThrow();
    expect(() => createBoard(-3)).toThrow();
    expect(() => createBoard(5.5)).toThrow();
  });
});

describe("gomoku placeStone", () => {
  it("returns a new board without mutating the input (immutability)", () => {
    const board = createBoard(5);
    const next = placeStone(board, 2, 1, "black");
    expect(next).not.toBe(board);
    expect(next[1]![2]).toBe("black");
    expect(board[1]![2]).toBe(null); // 원본 불변
  });

  it("throws when the cell is already occupied", () => {
    const board = placeStone(createBoard(5), 2, 2, "black");
    expect(() => placeStone(board, 2, 2, "white")).toThrow();
  });

  it("throws when the coordinate is out of bounds", () => {
    const board = createBoard(5);
    expect(() => placeStone(board, -1, 0, "black")).toThrow();
    expect(() => placeStone(board, 5, 0, "black")).toThrow();
    expect(() => placeStone(board, 0, 5, "black")).toThrow();
  });
});

describe("gomoku checkWin", () => {
  it("detects a horizontal five-in-a-row", () => {
    const board = withStones(15, "black", [
      [1, 7],
      [2, 7],
      [3, 7],
      [4, 7],
      [5, 7],
    ]);
    expect(checkWin(board, 5, 7)).toBe("black");
  });

  it("detects a vertical five-in-a-row", () => {
    const board = withStones(15, "white", [
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
    ]);
    expect(checkWin(board, 3, 3)).toBe("white");
  });

  it("detects a main-diagonal five-in-a-row", () => {
    const board = withStones(15, "black", [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
    expect(checkWin(board, 2, 2)).toBe("black");
  });

  it("detects an anti-diagonal five-in-a-row", () => {
    const board = withStones(15, "white", [
      [4, 0],
      [3, 1],
      [2, 2],
      [1, 3],
      [0, 4],
    ]);
    expect(checkWin(board, 2, 2)).toBe("white");
  });

  it("does not declare a win for only four in a row", () => {
    const board = withStones(15, "black", [
      [1, 7],
      [2, 7],
      [3, 7],
      [4, 7],
    ]);
    expect(checkWin(board, 4, 7)).toBe(null);
  });

  it("declares a win for six or more in a row", () => {
    const board = withStones(15, "black", [
      [1, 7],
      [2, 7],
      [3, 7],
      [4, 7],
      [5, 7],
      [6, 7],
    ]);
    expect(checkWin(board, 4, 7)).toBe("black");
  });

  it("returns null for an empty cell or out-of-bounds coordinate", () => {
    const board = createBoard(15);
    expect(checkWin(board, 7, 7)).toBe(null); // 빈 칸
    expect(checkWin(board, -1, 0)).toBe(null); // 범위 밖
    expect(checkWin(board, 15, 0)).toBe(null);
  });
});

describe("gomoku isBoardFull", () => {
  it("returns false for an empty board", () => {
    expect(isBoardFull(createBoard(3))).toBe(false);
  });

  it("returns false when at least one cell is empty", () => {
    // 3×3 보드에서 한 칸(2,2)만 비워둔다.
    const coords: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ];
    const board = withStones(3, "black", coords);
    expect(isBoardFull(board)).toBe(false);
  });

  it("returns true when every cell is filled", () => {
    const coords: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];
    const board = withStones(3, "black", coords);
    expect(isBoardFull(board)).toBe(true);
  });

  it("does not mutate the input board", () => {
    const board = createBoard(3);
    const snapshot = JSON.stringify(board);
    isBoardFull(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("treats a 0×0 board as full (no empty cells)", () => {
    expect(isBoardFull([])).toBe(true);
  });
});
