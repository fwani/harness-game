import { describe, it, expect } from "vitest";
import {
  aiPolicyFromChooser,
  createRandomGomokuAiPolicy,
  type AiPolicy,
} from "./aiPolicy";
import type { Side } from "./gameEngine";
import { createGomokuEngine } from "./gameEngine";
import { playEngineGame } from "./playEngineGame";
import { legalGomokuMoves, type GomokuMove } from "./gomokuAi";
import { startGame, type GomokuState } from "./playGomoku";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/** 주어진 시퀀스를 순서대로 maxExclusive로 나눈 나머지로 돌려주는 결정적 스텁. */
function seqRng(seq: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      const raw = seq[i % seq.length]!;
      i += 1;
      return raw % maxExclusive;
    },
  };
}

describe("aiPolicyFromChooser", () => {
  it("선택기를 그대로 위임한다(인자·반환 통과)", () => {
    const calls: Array<{ state: string; side: Side }> = [];
    const pick = (state: string, side: Side): number => {
      calls.push({ state, side });
      return state.length + (side === "p1" ? 0 : 100);
    };
    const policy: AiPolicy<string, number> = aiPolicyFromChooser(pick);

    expect(policy.chooseMove("abc", "p1")).toBe(3);
    expect(policy.chooseMove("hello", "p2")).toBe(105);
    expect(calls).toEqual([
      { state: "abc", side: "p1" },
      { state: "hello", side: "p2" },
    ]);
  });

  it("AiPolicy 포트 형태(chooseMove 함수)를 만족한다", () => {
    const policy = aiPolicyFromChooser<number, number>((s) => s + 1);
    expect(typeof policy.chooseMove).toBe("function");
    expect(policy.chooseMove(41, "p1")).toBe(42);
  });
});

describe("createRandomGomokuAiPolicy", () => {
  it("합법(빈) 착수 지점만 고른다", () => {
    const policy = createRandomGomokuAiPolicy(seqRng([0, 1, 2, 3, 4, 5, 6, 7]));
    const state: GomokuState = startGame(5);
    const legal = legalGomokuMoves(state.board);
    const move = policy.chooseMove(state, "p1");
    expect(legal).toContainEqual(move);
  });

  it("시드 고정 RandomSource면 결정적으로 같은 수를 고른다", () => {
    const state = startGame(9);
    const a = createRandomGomokuAiPolicy(fixedRng(0)).chooseMove(state, "p1");
    const b = createRandomGomokuAiPolicy(fixedRng(0)).chooseMove(state, "p2");
    expect(a).toEqual(b);
    // 인덱스 0 → row-major 첫 빈 칸 (0,0)
    expect(a).toEqual<GomokuMove>({ x: 0, y: 0 });
  });

  it("입력 state/board를 변형하지 않는다", () => {
    const state = startGame(5);
    const before = JSON.stringify(state);
    createRandomGomokuAiPolicy(fixedRng(3)).chooseMove(state, "p1");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("합법 수가 없으면 하위 선택기의 throw를 전파한다", () => {
    // 가득 찬 보드: 모든 칸을 black으로 채워 빈 칸이 없게 만든다.
    const full = startGame(3);
    const board = full.board.map((row) => row.map(() => "black" as const));
    const state: GomokuState = { ...full, board };
    const policy = createRandomGomokuAiPolicy(fixedRng(0));
    expect(() => policy.chooseMove(state, "p1")).toThrow();
  });

  it("playEngineGame(createGomokuEngine(), policy.chooseMove)로 한 판이 종국에 도달한다", () => {
    const policy = createRandomGomokuAiPolicy(seqRng([2, 5, 1, 7, 3, 0, 4, 6]));
    const result = playEngineGame(createGomokuEngine(), policy.chooseMove, {
      config: { size: 3 },
    });
    expect(result.status.over).toBe(true);
    expect(result.moveCount).toBeGreaterThan(0);
    // 3×3에서는 5목이 불가능하므로 보드가 가득 차 무승부로 종료(최대 9수).
    expect(result.moveCount).toBeLessThanOrEqual(9);
  });
});
