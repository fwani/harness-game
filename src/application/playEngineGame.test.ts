import { describe, it, expect } from "vitest";
import { playEngineGame } from "./playEngineGame";
import {
  createGomokuEngine,
  type GomokuMove,
  type GameEngine,
  type Side,
} from "./gameEngine";
import type { GomokuState } from "./playGomoku";
import { legalGomokuMoves } from "./gomokuAi";
import { createGoEngine, type GoMove } from "./goEngine";
import type { GoState } from "./playGo";

const gomoku = createGomokuEngine();

/** 항상 row-major 첫 합법 수를 두는 결정적 수 선택기(빈 칸을 위→아래·왼→오 순으로 채움). */
function firstLegalGomokuMove(state: GomokuState): GomokuMove {
  const moves = legalGomokuMoves(state.board);
  return moves[0]!;
}

/** 진영별로 미리 정해둔 수열을 순서대로 내보내는 결정적(스크립트) 수 선택기. */
function scriptedChooser(
  scripts: Record<Side, GomokuMove[]>,
): (state: GomokuState, side: Side) => GomokuMove {
  const cursor: Record<Side, number> = { p1: 0, p2: 0 };
  return (_state, side) => scripts[side][cursor[side]++]!;
}

describe("playEngineGame — 종국까지 자동 진행", () => {
  it("3×3 보드를 결정적으로 가득 채우면 over=true, draw, moveCount=9", () => {
    const result = playEngineGame(gomoku, firstLegalGomokuMove, {
      config: { size: 3 },
    });
    expect(result.status.over).toBe(true);
    expect(result.status.draw).toBe(true);
    expect(result.status.winner).toBeNull();
    expect(result.moveCount).toBe(9);
  });

  it("흑(p1)이 가로 5목을 완성하는 수순 → winner=p1, moveCount는 둔 수와 일치(9)", () => {
    const chooser = scriptedChooser({
      p1: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ],
      p2: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    });
    const result = playEngineGame(gomoku, chooser);
    expect(result.status).toEqual({ over: true, winner: "p1", draw: false });
    expect(result.moveCount).toBe(9);
    expect(result.finalState.board[0]![4]).toBe("black");
  });
});

describe("playEngineGame — Go(바둑) 무승부/종국", () => {
  it("양측이 연속 패스하면 종국, 빈 보드(komi 0)는 draw, moveCount=2", () => {
    const go = createGoEngine();
    const passChooser = (): GoMove => "pass";
    const result = playEngineGame<GoState, GoMove>(go, passChooser, {
      config: { size: 5 },
    });
    expect(result.status.over).toBe(true);
    expect(result.status.draw).toBe(true);
    expect(result.finalState.finished).toBe(true);
    expect(result.moveCount).toBe(2);
  });
});

describe("playEngineGame — 안전장치 & 엣지", () => {
  it("maxMoves 초과 시 throw", () => {
    expect(() =>
      playEngineGame(gomoku, firstLegalGomokuMove, {
        config: { size: 3 },
        maxMoves: 1,
      }),
    ).toThrow(/maxMoves/);
  });

  it("불법 수를 반환하는 콜백 → throw", () => {
    const illegal = (): GomokuMove => ({ x: -1, y: 0 });
    expect(() =>
      playEngineGame(gomoku, illegal, { config: { size: 3 } }),
    ).toThrow(/illegal move/);
  });

  it("이미 종료 상태로 시작하면 moveCount:0 결과 반환(throw 안 함)", () => {
    const overEngine: GameEngine<{ tag: string }, number> = {
      init: () => ({ tag: "done" }),
      turn: () => "p1",
      isLegal: () => true,
      apply: (s) => s,
      status: () => ({ over: true, winner: "p1", draw: false }),
    };
    const result = playEngineGame(overEngine, () => 0);
    expect(result.moveCount).toBe(0);
    expect(result.status).toEqual({ over: true, winner: "p1", draw: false });
    expect(result.finalState).toEqual({ tag: "done" });
  });

  it("동일 엔진 + 결정적 콜백이면 동일 결과(결정적·불변)", () => {
    const a = playEngineGame(gomoku, firstLegalGomokuMove, {
      config: { size: 3 },
    });
    const b = playEngineGame(gomoku, firstLegalGomokuMove, {
      config: { size: 3 },
    });
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
    expect(a.finalState).toEqual(b.finalState);
  });
});
