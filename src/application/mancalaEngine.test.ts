import { describe, it, expect } from "vitest";
import {
  createMancalaEngine,
  type MancalaEngineState,
} from "./mancalaEngine";
import {
  createMancalaBoard,
  isMancalaGameOver,
  findMancalaWinner,
  type MancalaBoard,
} from "../domain/mancala";

const engine = createMancalaEngine();

/** 깊은 스냅샷(불변 검증용). */
function snapshot(board: MancalaBoard): MancalaBoard {
  return {
    pitsPerSide: board.pitsPerSide,
    pits: { 1: [...board.pits[1]], 2: [...board.pits[2]] },
    stores: { 1: board.stores[1], 2: board.stores[2] },
  };
}

describe("createMancalaEngine — init & turn", () => {
  it("init() 후 기본 보드(6·4) + 선공 p1", () => {
    const state = engine.init();
    expect(state.board).toEqual(createMancalaBoard(6, 4));
    expect(state.next).toBe(1);
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("생성 인자로 보드 크기를 바꿀 수 있다", () => {
    const state = createMancalaEngine(4, 3).init();
    expect(state.board).toEqual(createMancalaBoard(4, 3));
    expect(state.board.pitsPerSide).toBe(4);
    expect(state.board.pits[1]).toEqual([3, 3, 3, 3]);
  });

  it("config.pitsPerSide/seedsPerPit이 있으면 생성 인자보다 우선한다", () => {
    const state = createMancalaEngine(6, 4).init({
      pitsPerSide: 3,
      seedsPerPit: 2,
    });
    expect(state.board).toEqual(createMancalaBoard(3, 2));
  });

  it("next:2 상태의 turn()은 p2", () => {
    const state: MancalaEngineState = { board: createMancalaBoard(), next: 2 };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createMancalaEngine — isLegal (throw 금지)", () => {
  it("씨앗이 있는 자기 구덩이는 true", () => {
    const state = engine.init();
    expect(engine.isLegal(state, 0, "p1")).toBe(true);
    expect(engine.isLegal(state, 5, "p1")).toBe(true);
  });

  it("빈 구덩이는 false(throw 금지)", () => {
    // pit 0만 비우고 양쪽 모두 씨앗이 남아 게임은 진행 중.
    const board: MancalaBoard = {
      pitsPerSide: 6,
      pits: { 1: [0, 4, 4, 4, 4, 4], 2: [4, 4, 4, 4, 4, 4] },
      stores: { 1: 0, 2: 0 },
    };
    const state: MancalaEngineState = { board, next: 1 };
    expect(isMancalaGameOver(board)).toBe(false);
    expect(engine.isLegal(state, 0, "p1")).toBe(false);
    expect(engine.isLegal(state, 1, "p1")).toBe(true);
  });

  it("범위 밖 구덩이는 false", () => {
    const state = engine.init();
    expect(engine.isLegal(state, -1, "p1")).toBe(false);
    expect(engine.isLegal(state, 6, "p1")).toBe(false);
    expect(engine.isLegal(state, 1.5, "p1")).toBe(false);
  });

  it("차례가 아니면 false(throw 금지)", () => {
    const state = engine.init();
    expect(engine.isLegal(state, 0, "p2")).toBe(false);
  });

  it("종료된 게임에서는 모든 수가 false", () => {
    const board: MancalaBoard = {
      pitsPerSide: 6,
      pits: { 1: [0, 0, 0, 0, 0, 0], 2: [4, 4, 4, 4, 4, 4] },
      stores: { 1: 0, 2: 0 },
    };
    expect(isMancalaGameOver(board)).toBe(true);
    const state: MancalaEngineState = { board, next: 1 };
    expect(engine.isLegal(state, 0, "p1")).toBe(false);
  });
});

describe("createMancalaEngine — apply & 한 번 더(again)", () => {
  it("한 번 더가 아닌 수는 상대 턴으로 전환된다", () => {
    // 기본 보드에서 p1이 pit 0(씨앗 4) → 마지막 씨앗이 pit 4에 떨어짐(곳간 아님) → 상대 턴.
    const state = engine.init();
    const next = engine.apply(state, 0, "p1");
    expect(next.next).toBe(2);
    expect(engine.turn(next)).toBe("p2");
    expect(engine.status(next).over).toBe(false);
  });

  it("마지막 씨앗이 자기 곳간에 떨어지면 같은 플레이어가 한 번 더 둔다", () => {
    // 기본 보드(6·4)에서 p1이 pit 2(씨앗 4): slot 3→4→5→곳간(slot 6) → again.
    const state = engine.init();
    const after = engine.apply(state, 2, "p1");
    expect(after.board.stores[1]).toBe(1);
    expect(after.next).toBe(1);
    expect(engine.turn(after)).toBe("p1");
    expect(engine.status(after).over).toBe(false);
  });

  it("입력 state/board를 변형하지 않는다(불변)", () => {
    const state = engine.init();
    const before = snapshot(state.board);
    engine.apply(state, 0, "p1");
    expect(state.board).toEqual(before);
    expect(state.next).toBe(1);
  });

  it("불법 수 apply는 throw (차례 아님 / 빈 구덩이 / 종료)", () => {
    const state = engine.init();
    expect(() => engine.apply(state, 0, "p2")).toThrow();

    const emptyPit: MancalaEngineState = {
      board: {
        pitsPerSide: 6,
        pits: { 1: [0, 4, 4, 4, 4, 4], 2: [4, 4, 4, 4, 4, 4] },
        stores: { 1: 0, 2: 0 },
      },
      next: 1,
    };
    expect(() => engine.apply(emptyPit, 0, "p1")).toThrow();

    const over: MancalaEngineState = {
      board: {
        pitsPerSide: 6,
        pits: { 1: [0, 0, 0, 0, 0, 0], 2: [4, 4, 4, 4, 4, 4] },
        stores: { 1: 0, 2: 0 },
      },
      next: 1,
    };
    expect(() => engine.apply(over, 0, "p1")).toThrow();
  });
});

describe("createMancalaEngine — status (승자/무승부)", () => {
  it("종료 시 곳간이 많은 쪽이 승자(p1)로 매핑된다", () => {
    const board: MancalaBoard = {
      pitsPerSide: 6,
      pits: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0] },
      stores: { 1: 30, 2: 18 },
    };
    expect(isMancalaGameOver(board)).toBe(true);
    expect(findMancalaWinner(board)).toBe(1);
    expect(engine.status({ board, next: 1 })).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("종료 시 곳간이 많은 쪽이 승자(p2)로 매핑된다", () => {
    const board: MancalaBoard = {
      pitsPerSide: 6,
      pits: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0] },
      stores: { 1: 18, 2: 30 },
    };
    expect(findMancalaWinner(board)).toBe(2);
    expect(engine.status({ board, next: 1 })).toEqual({
      over: true,
      winner: "p2",
      draw: false,
    });
  });

  it("종료 시 동점이면 무승부(draw)", () => {
    const board: MancalaBoard = {
      pitsPerSide: 6,
      pits: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0] },
      stores: { 1: 24, 2: 24 },
    };
    expect(isMancalaGameOver(board)).toBe(true);
    expect(findMancalaWinner(board)).toBe(null);
    expect(engine.status({ board, next: 1 })).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });
});

describe("createMancalaEngine — playEngineGame 종국", () => {
  it("결정적 rng로 한 판이 끝까지 진행돼 종료된다", async () => {
    const { playEngineGame } = await import("./playEngineGame");
    const { chooseRandomMancalaMove } = await import("./playMancala");
    // 항상 첫 후보(index 0)를 고르는 결정적 RandomSource.
    const rng = { nextInt: () => 0 };
    const result = playEngineGame(
      createMancalaEngine(),
      (s) => chooseRandomMancalaMove(s.board, s.next, rng)!,
    );
    expect(result.status.over).toBe(true);
    expect(isMancalaGameOver(result.finalState.board)).toBe(true);
    const winner = findMancalaWinner(result.finalState.board);
    if (winner === null) {
      expect(result.status).toEqual({ over: true, winner: null, draw: true });
    } else {
      expect(result.status.winner).toBe(winner === 1 ? "p1" : "p2");
    }
  });
});
