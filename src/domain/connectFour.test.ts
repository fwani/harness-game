import { describe, it, expect } from "vitest";
import {
  createConnectFourBoard,
  dropDisc,
  findConnectFourWinner,
  isColumnFull,
  isConnectFourDraw,
  legalColumns,
  lowestEmptyRow,
  type Board,
  type Player,
} from "./connectFour";

/** 빈 7×6 보드를 만든다(헬퍼: 도메인 createConnectFourBoard와 독립적으로 비교용). */
function emptyBoard(): Board {
  return Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0 as 0 | Player));
}

/** col에 player 디스크를 순서대로 떨어뜨린다(테스트 빌더). 실패 시 throw로 테스트를 깨뜨린다. */
function drops(board: Board, moves: ReadonlyArray<[number, Player]>): Board {
  let b = board;
  for (const [col, player] of moves) {
    const next = dropDisc(b, col, player);
    if (next === null) {
      throw new Error(`drops helper: dropDisc failed at col=${col}`);
    }
    b = next;
  }
  return b;
}

describe("connectFour createConnectFourBoard", () => {
  it("creates a 7-column × 6-row board filled with 0", () => {
    const board = createConnectFourBoard();
    expect(board.length).toBe(6);
    expect(board.every((row) => row.length === 7)).toBe(true);
    expect(board.flat().every((cell) => cell === 0)).toBe(true);
  });

  it("returns a fresh instance on each call (no shared rows)", () => {
    const a = createConnectFourBoard();
    const b = createConnectFourBoard();
    a[0]![0] = 1;
    expect(b[0]![0]).toBe(0);
  });
});

describe("connectFour dropDisc (gravity)", () => {
  it("places a disc at the bottom row of an empty column", () => {
    const board = createConnectFourBoard();
    const next = dropDisc(board, 3, 1);
    expect(next).not.toBeNull();
    expect(next![5]![3]).toBe(1);
    // 그 외 칸은 비어 있다.
    expect(next![4]![3]).toBe(0);
  });

  it("stacks discs from bottom to top in the same column", () => {
    let board = createConnectFourBoard();
    board = dropDisc(board, 2, 1)!;
    board = dropDisc(board, 2, 2)!;
    board = dropDisc(board, 2, 1)!;
    expect(board[5]![2]).toBe(1);
    expect(board[4]![2]).toBe(2);
    expect(board[3]![2]).toBe(1);
    expect(board[2]![2]).toBe(0);
  });

  it("does not mutate the input board (immutability)", () => {
    const board = createConnectFourBoard();
    const snapshot = JSON.stringify(board);
    dropDisc(board, 0, 1);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("returns null when the column is full", () => {
    let board = createConnectFourBoard();
    for (let i = 0; i < 6; i += 1) {
      board = dropDisc(board, 0, 1)!;
    }
    expect(isColumnFull(board, 0)).toBe(true);
    expect(dropDisc(board, 0, 2)).toBeNull();
  });

  it("returns null for out-of-range or non-integer columns", () => {
    const board = createConnectFourBoard();
    expect(dropDisc(board, -1, 1)).toBeNull();
    expect(dropDisc(board, 7, 1)).toBeNull();
    expect(dropDisc(board, 1.5, 1)).toBeNull();
  });

  it("returns null for an invalid player value", () => {
    const board = createConnectFourBoard();
    // @ts-expect-error 잘못된 player 값(0)을 일부러 전달해 안전 처리를 확인한다.
    expect(dropDisc(board, 3, 0)).toBeNull();
    // @ts-expect-error 잘못된 player 값(3)을 일부러 전달해 안전 처리를 확인한다.
    expect(dropDisc(board, 3, 3)).toBeNull();
  });
});

describe("connectFour column helpers", () => {
  it("isColumnFull: false for empty, true once the top row is occupied", () => {
    let board = createConnectFourBoard();
    expect(isColumnFull(board, 0)).toBe(false);
    for (let i = 0; i < 6; i += 1) {
      board = dropDisc(board, 0, 1)!;
    }
    expect(isColumnFull(board, 0)).toBe(true);
  });

  it("isColumnFull: treats out-of-range columns as full", () => {
    const board = createConnectFourBoard();
    expect(isColumnFull(board, -1)).toBe(true);
    expect(isColumnFull(board, 7)).toBe(true);
    expect(isColumnFull(board, 1.5)).toBe(true);
  });

  it("lowestEmptyRow: bottom row when empty, climbs up as the column fills", () => {
    let board = createConnectFourBoard();
    expect(lowestEmptyRow(board, 4)).toBe(5);
    board = dropDisc(board, 4, 1)!;
    expect(lowestEmptyRow(board, 4)).toBe(4);
  });

  it("lowestEmptyRow: null for full column and out-of-range", () => {
    let board = createConnectFourBoard();
    for (let i = 0; i < 6; i += 1) {
      board = dropDisc(board, 0, 1)!;
    }
    expect(lowestEmptyRow(board, 0)).toBeNull();
    expect(lowestEmptyRow(board, -1)).toBeNull();
    expect(lowestEmptyRow(board, 99)).toBeNull();
  });

  it("legalColumns: all 7 when empty, drops a column once it fills", () => {
    let board = createConnectFourBoard();
    expect(legalColumns(board)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (let i = 0; i < 6; i += 1) {
      board = dropDisc(board, 3, 1)!;
    }
    expect(legalColumns(board)).toEqual([0, 1, 2, 4, 5, 6]);
  });
});

describe("connectFour findConnectFourWinner", () => {
  it("detects a horizontal four-in-a-row", () => {
    // player 1: cols 0..3 on bottom row; player 2 stacks on col 0 to differ.
    const board = drops(emptyBoard(), [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    expect(findConnectFourWinner(board)).toBe(1);
  });

  it("detects a vertical four-in-a-row", () => {
    const board = drops(emptyBoard(), [
      [2, 2],
      [2, 2],
      [2, 2],
      [2, 2],
    ]);
    expect(findConnectFourWinner(board)).toBe(2);
  });

  it("detects a descending (↘) diagonal four-in-a-row", () => {
    // Build a staircase so player 1 occupies (row,col): (5,0),(4,1),(3,2),(2,3)
    const board: Board = emptyBoard();
    board[5]![0] = 1;
    board[4]![1] = 1;
    board[3]![2] = 1;
    board[2]![3] = 1;
    expect(findConnectFourWinner(board)).toBe(1);
  });

  it("detects an ascending (↗) diagonal four-in-a-row", () => {
    // player 1 occupies (row,col): (2,0),(3,1),(4,2),(5,3)
    const board: Board = emptyBoard();
    board[2]![0] = 1;
    board[3]![1] = 1;
    board[4]![2] = 1;
    board[5]![3] = 1;
    expect(findConnectFourWinner(board)).toBe(1);
  });

  it("returns null when fewer than four are connected", () => {
    const board = drops(emptyBoard(), [
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
    expect(findConnectFourWinner(board)).toBeNull();
  });

  it("returns null for an empty board", () => {
    expect(findConnectFourWinner(createConnectFourBoard())).toBeNull();
  });

  it("does not mutate the board while scanning", () => {
    const board = drops(emptyBoard(), [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    const snapshot = JSON.stringify(board);
    findConnectFourWinner(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("connectFour isConnectFourDraw", () => {
  it("is true when the board is full with no winner", () => {
    // A verified full 6×7 grid (board[row][col]) with no 4-in-a-row in any direction.
    const board: Board = [
      [1, 1, 1, 2, 1, 1, 1],
      [1, 1, 1, 2, 1, 1, 1],
      [1, 1, 2, 1, 2, 1, 1],
      [2, 2, 2, 1, 2, 2, 2],
      [1, 1, 1, 2, 1, 1, 1],
      [1, 1, 1, 2, 1, 1, 1],
    ];
    expect(findConnectFourWinner(board)).toBeNull();
    expect(isConnectFourDraw(board)).toBe(true);
  });

  it("is false when the board has empty cells", () => {
    const board = drops(emptyBoard(), [[0, 1]]);
    expect(isConnectFourDraw(board)).toBe(false);
  });

  it("is false when there is a winner even if full-ish", () => {
    const board = drops(emptyBoard(), [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    expect(isConnectFourDraw(board)).toBe(false);
  });

  it("is false for an empty board", () => {
    expect(isConnectFourDraw(createConnectFourBoard())).toBe(false);
  });
});
