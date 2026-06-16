import { describe, it, expect } from "vitest";
import { startGame, applyMove, type GomokuState } from "./playGomoku";

describe("playGomoku application", () => {
  it("startGame creates an empty board with black to move and no winner", () => {
    const state = startGame();
    expect(state.next).toBe("black");
    expect(state.winner).toBeNull();
    expect(state.board.length).toBe(15);
    expect(state.board.every((row) => row.length === 15 && row.every((cell) => cell === null))).toBe(
      true,
    );
  });

  it("startGame respects a custom size", () => {
    const state = startGame(9);
    expect(state.board.length).toBe(9);
    expect(state.board[0]!.length).toBe(9);
  });

  it("toggles turn black -> white -> black", () => {
    let state = startGame();
    state = applyMove(state, 0, 0);
    expect(state.board[0]![0]).toBe("black");
    expect(state.next).toBe("white");
    state = applyMove(state, 1, 0);
    expect(state.board[0]![1]).toBe("white");
    expect(state.next).toBe("black");
    state = applyMove(state, 0, 1);
    expect(state.board[1]![0]).toBe("black");
    expect(state.next).toBe("white");
  });

  it("declares the winner on a horizontal five-in-a-row", () => {
    let state = startGame();
    // black plays (0..4, 0); white plays elsewhere on its turns.
    const blackMoves: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const whiteMoves: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ];
    for (let i = 0; i < blackMoves.length; i += 1) {
      state = applyMove(state, blackMoves[i]![0], blackMoves[i]![1]);
      if (i < whiteMoves.length) {
        state = applyMove(state, whiteMoves[i]![0], whiteMoves[i]![1]);
      }
    }
    expect(state.winner).toBe("black");
  });

  it("declares the winner on a vertical five-in-a-row", () => {
    let state = startGame();
    const blackMoves: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ];
    const whiteMoves: Array<[number, number]> = [
      [5, 0],
      [5, 1],
      [5, 2],
      [5, 3],
    ];
    for (let i = 0; i < blackMoves.length; i += 1) {
      state = applyMove(state, blackMoves[i]![0], blackMoves[i]![1]);
      if (i < whiteMoves.length) {
        state = applyMove(state, whiteMoves[i]![0], whiteMoves[i]![1]);
      }
    }
    expect(state.winner).toBe("black");
  });

  it("declares the winner on a diagonal five-in-a-row", () => {
    let state = startGame();
    const blackMoves: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ];
    const whiteMoves: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ];
    for (let i = 0; i < blackMoves.length; i += 1) {
      state = applyMove(state, blackMoves[i]![0], blackMoves[i]![1]);
      if (i < whiteMoves.length) {
        state = applyMove(state, whiteMoves[i]![0], whiteMoves[i]![1]);
      }
    }
    expect(state.winner).toBe("black");
  });

  it("propagates domain errors for occupied cells and out-of-bounds", () => {
    let state = startGame();
    state = applyMove(state, 0, 0);
    expect(() => applyMove(state, 0, 0)).toThrow();
    expect(() => applyMove(state, -1, 0)).toThrow();
    expect(() => applyMove(state, 99, 0)).toThrow();
  });

  it("throws when moving after the game is finished", () => {
    let state = startGame();
    const blackMoves: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const whiteMoves: Array<[number, number]> = [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ];
    for (let i = 0; i < blackMoves.length; i += 1) {
      state = applyMove(state, blackMoves[i]![0], blackMoves[i]![1]);
      if (i < whiteMoves.length) {
        state = applyMove(state, whiteMoves[i]![0], whiteMoves[i]![1]);
      }
    }
    expect(state.winner).toBe("black");
    expect(() => applyMove(state, 6, 6)).toThrow();
  });

  it("does not mutate the input state or board", () => {
    const state = startGame();
    const snapshot: GomokuState = {
      board: state.board.map((row) => row.slice()),
      next: state.next,
      winner: state.winner,
    };
    applyMove(state, 0, 0);
    expect(state.next).toBe(snapshot.next);
    expect(state.winner).toBe(snapshot.winner);
    expect(state.board).toEqual(snapshot.board);
    expect(state.board[0]![0]).toBeNull();
  });
});
