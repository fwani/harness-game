import { describe, it, expect } from "vitest";
import { createReversiBoard, type Board } from "./reversi";
import { countReversiDiscs, isReversiGameOver } from "./reversiScore";

/** 8×8 빈 보드를 만든다. */
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("reversiScore countReversiDiscs", () => {
  it("counts the standard opening board (2/2/60, no winner yet)", () => {
    expect(countReversiDiscs(createReversiBoard())).toEqual({
      black: 2,
      white: 2,
      empty: 60,
      winner: null,
    });
  });

  it("picks black as winner when black has more discs", () => {
    const board = emptyBoard();
    board[0]![0] = "black";
    board[0]![1] = "black";
    board[0]![2] = "black";
    board[1]![0] = "white";
    const score = countReversiDiscs(board);
    expect(score.black).toBe(3);
    expect(score.white).toBe(1);
    expect(score.empty).toBe(60);
    expect(score.winner).toBe("black");
  });

  it("picks white as winner when white has more discs", () => {
    const board = emptyBoard();
    board[0]![0] = "white";
    board[0]![1] = "white";
    board[1]![0] = "black";
    const score = countReversiDiscs(board);
    expect(score.white).toBe(2);
    expect(score.black).toBe(1);
    expect(score.winner).toBe("white");
  });

  it("returns null winner on a tie", () => {
    const board = emptyBoard();
    // 흑 32, 백 32로 절반씩 채운다(왼쪽 4열 흑, 오른쪽 4열 백).
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        board[y]![x] = x < 4 ? "black" : "white";
      }
    }
    const score = countReversiDiscs(board);
    expect(score.black).toBe(32);
    expect(score.white).toBe(32);
    expect(score.empty).toBe(0);
    expect(score.winner).toBeNull();
  });

  it("does not mutate the input board", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    countReversiDiscs(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("reversiScore isReversiGameOver", () => {
  it("is false on the standard opening (both colors can move)", () => {
    expect(isReversiGameOver(createReversiBoard())).toBe(false);
  });

  it("is true on a completely filled board (no empty cell, no legal move)", () => {
    const board = emptyBoard();
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        board[y]![x] = "black";
      }
    }
    expect(isReversiGameOver(board)).toBe(true);
  });

  it("is false when only one color has a legal move", () => {
    const board = emptyBoard();
    // (0,0)=black, (1,0)=white. 흑은 (2,0)에 두어 (1,0)을 뒤집을 수 있으나
    // 백은 둘 곳이 없다(흑 디스크가 코너에 하나뿐이라 양쪽에서 막을 수 없음).
    board[0]![0] = "black";
    board[0]![1] = "white";
    expect(isReversiGameOver(board)).toBe(false);
  });

  it("does not mutate the input board", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    isReversiGameOver(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
