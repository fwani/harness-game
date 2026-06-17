import { describe, it, expect } from "vitest";
import { createConnectFourEngine } from "./connectFourEngine";
import { playEngineGame } from "./playEngineGame";
import { chooseRandomConnectFourColumn } from "./playConnectFour";
import type { RandomSource } from "./dealCards";
import {
  createConnectFourBoard,
  findConnectFourWinner,
  type Board,
} from "../domain/connectFour";

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

describe("createConnectFourEngine", () => {
  it("init: 빈 7×6 보드와 선(p1) 차례로 시작한다", () => {
    const engine = createConnectFourEngine();
    const state = engine.init();
    expect(state.board.length).toBe(6);
    expect(state.board[0]!.length).toBe(7);
    expect(state.board.flat().every((c) => c === 0)).toBe(true);
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("turn: 한 수마다 p1↔p2 교대한다", () => {
    const engine = createConnectFourEngine();
    let state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    state = engine.apply(state, { col: 0 }, "p1");
    expect(engine.turn(state)).toBe("p2");
    state = engine.apply(state, { col: 1 }, "p2");
    expect(engine.turn(state)).toBe("p1");
  });

  it("isLegal: 빈 열은 합법, 차례가 아닌 쪽/가득 찬 열/범위 밖은 불법(throw 없음)", () => {
    const engine = createConnectFourEngine();
    let state = engine.init();
    expect(engine.isLegal(state, { col: 3 }, "p1")).toBe(true);
    // 차례가 아닌 쪽
    expect(engine.isLegal(state, { col: 3 }, "p2")).toBe(false);
    // 범위 밖
    expect(engine.isLegal(state, { col: 7 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { col: -1 }, "p1")).toBe(false);
    // 0열을 6번 채워 가득 채운다(턴 교대하며 둠)
    let side: "p1" | "p2" = "p1";
    for (let i = 0; i < 6; i++) {
      state = engine.apply(state, { col: 0 }, side);
      side = side === "p1" ? "p2" : "p1";
    }
    expect(engine.isLegal(state, { col: 0 }, side)).toBe(false);
  });

  it("apply: 불변(입력 상태 변형 없음) + 새 보드를 반환한다", () => {
    const engine = createConnectFourEngine();
    const state = engine.init();
    const snapshot: Board = state.board.map((r) => r.slice());
    const next = engine.apply(state, { col: 2 }, "p1");
    expect(state.board).toEqual(snapshot); // 원본 불변
    expect(next.board).not.toBe(state.board);
    // 중력 낙하: 2열 최하단(row 5)에 p1(1)
    expect(next.board[5]![2]).toBe(1);
  });

  it("apply: 불법 수면 throw 한다", () => {
    const engine = createConnectFourEngine();
    const state = engine.init();
    expect(() => engine.apply(state, { col: 3 }, "p2")).toThrow();
    expect(() => engine.apply(state, { col: 9 }, "p1")).toThrow();
  });

  it("status: 가로 4목이면 해당 side 승리로 매핑한다", () => {
    const engine = createConnectFourEngine();
    let state = engine.init();
    // p1이 0~3열 바닥에 4목, 사이사이 p2는 다른 열에 둔다.
    state = engine.apply(state, { col: 0 }, "p1");
    state = engine.apply(state, { col: 0 }, "p2");
    state = engine.apply(state, { col: 1 }, "p1");
    state = engine.apply(state, { col: 1 }, "p2");
    state = engine.apply(state, { col: 2 }, "p1");
    state = engine.apply(state, { col: 2 }, "p2");
    state = engine.apply(state, { col: 3 }, "p1"); // 0~3 바닥 가로 4목
    const st = engine.status(state);
    expect(st).toEqual({ over: true, winner: "p1", draw: false });
    expect(findConnectFourWinner(state.board)).toBe(1);
  });

  it("status: 진행 중이면 over=false", () => {
    const engine = createConnectFourEngine();
    const state = engine.apply(engine.init(), { col: 0 }, "p1");
    expect(engine.status(state).over).toBe(false);
  });

  it("CPU vs CPU 한 판이 승자 또는 무승부로 종료된다(playEngineGame 연동)", () => {
    const engine = createConnectFourEngine();
    const result = playEngineGame(engine, (state) => {
      const col = chooseRandomConnectFourColumn(state.board, seededRng(42));
      return { col: col ?? -1 };
    });
    expect(result.status.over).toBe(true);
    // 승자가 있거나 무승부 둘 중 하나
    expect(result.status.winner !== null || result.status.draw).toBe(true);
    expect(result.moveCount).toBeGreaterThan(0);
    // 커넥트포는 최대 42수(7×6) 안에 끝난다.
    expect(result.moveCount).toBeLessThanOrEqual(42);
  });

  it("동일 rng(결정적)면 동일 결과", () => {
    const run = () =>
      playEngineGame(createConnectFourEngine(), (state) => {
        const col = chooseRandomConnectFourColumn(state.board, seededRng(7));
        return { col: col ?? -1 };
      });
    const a = run();
    const b = run();
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
  });

  it("init은 매 호출마다 새 보드를 만든다(별칭 없음)", () => {
    const engine = createConnectFourEngine();
    const a = engine.init();
    const b = engine.init();
    expect(a.board).not.toBe(b.board);
    expect(a.board).toEqual(createConnectFourBoard());
  });
});
