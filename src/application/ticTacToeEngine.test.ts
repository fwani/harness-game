import { describe, it, expect } from "vitest";
import { createTicTacToeEngine } from "./ticTacToeEngine";
import { playEngineGame } from "./playEngineGame";
import { chooseRandomTicTacToeMove } from "./playTicTacToe";
import type { RandomSource } from "./dealCards";
import {
  createTicTacToeBoard,
  findTicTacToeWinner,
  type Board,
} from "../domain/ticTacToe";

/** 결정적 의사난수(선형 합동). 같은 seed면 항상 같은 시퀀스. */
function seededRng(seed: number): RandomSource {
  let s = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s % maxExclusive;
    },
  };
}

describe("createTicTacToeEngine", () => {
  it("init: 빈 3×3 보드와 선(p1=X) 차례로 시작한다", () => {
    const engine = createTicTacToeEngine();
    const state = engine.init();
    expect(state.board.length).toBe(3);
    expect(state.board[0]!.length).toBe(3);
    expect(state.board.flat().every((c) => c === null)).toBe(true);
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("turn: 한 수마다 p1(X)↔p2(O) 교대한다", () => {
    const engine = createTicTacToeEngine();
    let state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    state = engine.apply(state, { row: 0, col: 0 }, "p1");
    expect(engine.turn(state)).toBe("p2");
    state = engine.apply(state, { row: 1, col: 1 }, "p2");
    expect(engine.turn(state)).toBe("p1");
  });

  it("isLegal: 빈 칸은 합법, 차례가 아닌 쪽/점유 칸/범위 밖은 불법(throw 없음)", () => {
    const engine = createTicTacToeEngine();
    let state = engine.init();
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p1")).toBe(true);
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p2")).toBe(false); // 차례 아님
    expect(engine.isLegal(state, { row: 3, col: 0 }, "p1")).toBe(false); // 범위 밖
    state = engine.apply(state, { row: 0, col: 0 }, "p1");
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p2")).toBe(false); // 점유됨
  });

  it("apply: 불변(입력 상태 변형 없음) + 새 보드를 반환한다", () => {
    const engine = createTicTacToeEngine();
    const state = engine.init();
    const snapshot: Board = state.board.map((r) => r.slice());
    const next = engine.apply(state, { row: 1, col: 2 }, "p1");
    expect(state.board).toEqual(snapshot); // 원본 불변
    expect(next.board).not.toBe(state.board);
    expect(next.board[1]![2]).toBe("X");
  });

  it("apply: 불법 수면 throw 한다", () => {
    const engine = createTicTacToeEngine();
    const state = engine.init();
    expect(() => engine.apply(state, { row: 0, col: 0 }, "p2")).toThrow();
    expect(() => engine.apply(state, { row: 5, col: 5 }, "p1")).toThrow();
  });

  it("status: 가로 3목이면 해당 side 승리로 매핑한다", () => {
    const engine = createTicTacToeEngine();
    let state = engine.init();
    // X가 0행, O는 1행에 둔다.
    state = engine.apply(state, { row: 0, col: 0 }, "p1");
    state = engine.apply(state, { row: 1, col: 0 }, "p2");
    state = engine.apply(state, { row: 0, col: 1 }, "p1");
    state = engine.apply(state, { row: 1, col: 1 }, "p2");
    state = engine.apply(state, { row: 0, col: 2 }, "p1"); // 0행 가로 3목
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
    expect(findTicTacToeWinner(state.board)).toBe("X");
  });

  it("status: 무승부 보드를 draw로 매핑한다", () => {
    const engine = createTicTacToeEngine();
    let state = engine.init();
    // 승자 없이 가득 차는 수순:
    // X O X / X O O / O X X
    const moves: Array<[number, number]> = [
      [0, 0], // X
      [0, 1], // O
      [0, 2], // X
      [1, 1], // O
      [1, 0], // X
      [1, 2], // O
      [2, 1], // X
      [2, 0], // O
      [2, 2], // X
    ];
    let side: "p1" | "p2" = "p1";
    for (const [row, col] of moves) {
      state = engine.apply(state, { row, col }, side);
      side = side === "p1" ? "p2" : "p1";
    }
    expect(engine.status(state)).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });

  it("CPU vs CPU 한 판이 승자 또는 무승부로 종료된다(playEngineGame 연동)", () => {
    const result = playEngineGame(createTicTacToeEngine(), (state) => {
      const move = chooseRandomTicTacToeMove(state.board, seededRng(123));
      return move ?? { row: -1, col: -1 };
    });
    expect(result.status.over).toBe(true);
    expect(result.status.winner !== null || result.status.draw).toBe(true);
    expect(result.moveCount).toBeGreaterThan(0);
    // 틱택토는 최대 9수 안에 끝난다.
    expect(result.moveCount).toBeLessThanOrEqual(9);
  });

  it("동일 rng(결정적)면 동일 결과", () => {
    const run = () =>
      playEngineGame(createTicTacToeEngine(), (state) => {
        const move = chooseRandomTicTacToeMove(state.board, seededRng(5));
        return move ?? { row: -1, col: -1 };
      });
    const a = run();
    const b = run();
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
  });

  it("init은 매 호출마다 새 보드를 만든다(별칭 없음)", () => {
    const engine = createTicTacToeEngine();
    const a = engine.init();
    const b = engine.init();
    expect(a.board).not.toBe(b.board);
    expect(a.board).toEqual(createTicTacToeBoard());
  });
});
