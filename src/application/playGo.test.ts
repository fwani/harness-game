import { describe, it, expect } from "vitest";
import { startGame, applyMove, pass, type GoState } from "./playGo";

describe("playGo application", () => {
  it("startGame creates an empty board with black to move and zeroed state", () => {
    const state = startGame();
    expect(state.next).toBe("black");
    expect(state.captures).toEqual({ black: 0, white: 0 });
    expect(state.lastWasPass).toBe(false);
    expect(state.finished).toBe(false);
    expect(state.board.length).toBe(19);
    expect(
      state.board.every((row) => row.length === 19 && row.every((cell) => cell === null)),
    ).toBe(true);
  });

  it("startGame respects a custom size", () => {
    const state = startGame(9);
    expect(state.board.length).toBe(9);
    expect(state.board[0]!.length).toBe(9);
  });

  it("toggles turn black -> white -> black on successive moves", () => {
    let state = startGame(5);
    state = applyMove(state, 0, 0);
    expect(state.board[0]![0]).toBe("black");
    expect(state.next).toBe("white");
    state = applyMove(state, 1, 0);
    expect(state.board[0]![1]).toBe("white");
    expect(state.next).toBe("black");
  });

  it("does not mutate the input state or board", () => {
    const state = startGame(5);
    const snapshot: GoState = {
      board: state.board.map((row) => row.slice()),
      next: state.next,
      captures: { ...state.captures },
      lastWasPass: state.lastWasPass,
      finished: state.finished,
    };
    applyMove(state, 0, 0);
    expect(state.next).toBe(snapshot.next);
    expect(state.captures).toEqual(snapshot.captures);
    expect(state.board).toEqual(snapshot.board);
    expect(state.board[0]![0]).toBeNull();
  });

  it("accumulates captures to the color that made the capturing move", () => {
    // 5x5 보드에서 흑이 백 돌 1개(1,1)를 사방으로 둘러싸 포획한다.
    let state = startGame(5);
    state = applyMove(state, 1, 0); // black, liberty of (1,1)
    state = applyMove(state, 1, 1); // white: the stone to be captured
    state = applyMove(state, 0, 1); // black
    state = applyMove(state, 4, 4); // white: 안전한 곳
    state = applyMove(state, 2, 1); // black
    state = applyMove(state, 4, 3); // white: 안전한 곳
    state = applyMove(state, 1, 2); // black: (1,1) 활로 0 -> 포획
    expect(state.board[1]![1]).toBeNull();
    expect(state.captures).toEqual({ black: 1, white: 0 });
    expect(state.lastWasPass).toBe(false);
    expect(state.next).toBe("white");
  });

  it("propagates domain errors for occupied and out-of-bounds moves", () => {
    let state = startGame(5);
    state = applyMove(state, 0, 0);
    expect(() => applyMove(state, 0, 0)).toThrow(); // 이미 점유
    expect(() => applyMove(state, -1, 0)).toThrow(); // 범위 밖
    expect(() => applyMove(state, 99, 0)).toThrow(); // 범위 밖
  });

  it("propagates the domain suicide error", () => {
    // 3x3: 흑이 (1,0)·(0,1)을 두면 백 (0,0) 착수는 활로 0·포획 없음 -> 자살수.
    let state = startGame(3);
    state = applyMove(state, 1, 0); // black
    state = applyMove(state, 2, 2); // white: 안전한 곳
    state = applyMove(state, 0, 1); // black
    // 이제 백 차례, (0,0)은 자살수.
    expect(state.next).toBe("white");
    expect(() => applyMove(state, 0, 0)).toThrow();
  });

  it("a single pass toggles the turn and sets lastWasPass", () => {
    let state = startGame(5);
    state = pass(state);
    expect(state.next).toBe("white");
    expect(state.lastWasPass).toBe(true);
    expect(state.finished).toBe(false);
  });

  it("a normal move resets lastWasPass after a pass", () => {
    let state = startGame(5);
    state = pass(state); // black passes
    state = applyMove(state, 0, 0); // white plays
    expect(state.lastWasPass).toBe(false);
    expect(state.finished).toBe(false);
  });

  it("two consecutive passes finish the game", () => {
    let state = startGame(5);
    state = pass(state); // black
    state = pass(state); // white -> finished
    expect(state.finished).toBe(true);
    expect(state.lastWasPass).toBe(true);
  });

  it("does not mutate input state on pass", () => {
    const state = startGame(5);
    pass(state);
    expect(state.lastWasPass).toBe(false);
    expect(state.next).toBe("black");
  });

  it("throws when moving or passing after the game is finished", () => {
    let state = startGame(5);
    state = pass(state);
    state = pass(state);
    expect(state.finished).toBe(true);
    expect(() => applyMove(state, 0, 0)).toThrow();
    expect(() => pass(state)).toThrow();
  });
});
