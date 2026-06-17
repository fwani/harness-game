import { describe, it, expect } from "vitest";
import { createNimEngine, type NimEngineState } from "./nimEngine";
import {
  createNimPiles,
  isNimGameOver,
  legalNimMoves,
  type NimMove,
} from "../domain/nim";

const engine = createNimEngine();

describe("createNimEngine — init & turn", () => {
  it("init() 후 기본 더미 [3,5,7] + 선공 p1", () => {
    const state = engine.init();
    expect(state.piles).toEqual([3, 5, 7]);
    expect(state.next).toBe(1);
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("config.sizes가 있으면 그 배치로 생성한다", () => {
    const state = engine.init({ sizes: [1, 2] });
    expect(state.piles).toEqual([1, 2]);
    expect(state.next).toBe(1);
  });

  it("init이 반환한 더미는 config.sizes 입력과 독립이다(불변)", () => {
    const sizes = [4, 4];
    const state = engine.init({ sizes });
    sizes[0] = 99;
    expect(state.piles).toEqual([4, 4]);
  });

  it("next:2 상태의 turn()은 p2", () => {
    const state: NimEngineState = { piles: createNimPiles([1]), next: 2 };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createNimEngine — isLegal (throw 금지)", () => {
  it("돌이 남은 더미에서 1..돌 수는 true", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { pile: 0, count: 1 }, "p1")).toBe(true);
    expect(engine.isLegal(state, { pile: 0, count: 3 }, "p1")).toBe(true);
    expect(engine.isLegal(state, { pile: 2, count: 7 }, "p1")).toBe(true);
  });

  it("범위 밖·개수 초과·비정수는 false(throw 금지)", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { pile: 0, count: 4 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { pile: -1, count: 1 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { pile: 3, count: 1 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { pile: 0, count: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { pile: 0, count: 1.5 }, "p1")).toBe(false);
  });

  it("차례가 아니면 false(throw 금지)", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { pile: 0, count: 1 }, "p2")).toBe(false);
  });

  it("종료된 게임에서는 모든 수가 false", () => {
    const state: NimEngineState = { piles: [0, 0, 0], next: 2 };
    expect(isNimGameOver(state.piles)).toBe(true);
    expect(engine.isLegal(state, { pile: 0, count: 1 }, "p2")).toBe(false);
  });
});

describe("createNimEngine — apply", () => {
  it("더미가 갱신되고 상대 턴으로 전환된다", () => {
    const state = engine.init();
    const next = engine.apply(state, { pile: 1, count: 3 }, "p1");
    expect(next.piles).toEqual([3, 2, 7]);
    expect(next.next).toBe(2);
    expect(engine.turn(next)).toBe("p2");
    expect(engine.status(next).over).toBe(false);
  });

  it("입력 state/piles를 변형하지 않는다(불변)", () => {
    const state = engine.init();
    const before = [...state.piles];
    engine.apply(state, { pile: 0, count: 2 }, "p1");
    expect(state.piles).toEqual(before);
    expect(state.next).toBe(1);
  });

  it("불법 수 apply는 throw (차례 아님 / 개수 초과 / 종료)", () => {
    const state = engine.init();
    expect(() => engine.apply(state, { pile: 0, count: 1 }, "p2")).toThrow();
    expect(() => engine.apply(state, { pile: 0, count: 4 }, "p1")).toThrow();

    const over: NimEngineState = { piles: [0, 0, 0], next: 1 };
    expect(() => engine.apply(over, { pile: 0, count: 1 }, "p1")).toThrow();
  });
});

describe("createNimEngine — status (마지막 돌 승자·무승부 없음)", () => {
  it("진행 중이면 over=false", () => {
    const state: NimEngineState = { piles: [0, 1, 0], next: 2 };
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("종료 시 마지막에 둔 쪽(next의 상대)이 승자다 — p1", () => {
    // 모든 더미 0, next=2 → 마지막에 둔 쪽은 1(p1).
    const state: NimEngineState = { piles: [0, 0, 0], next: 2 };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("종료 시 마지막에 둔 쪽(next의 상대)이 승자다 — p2", () => {
    // 모든 더미 0, next=1 → 마지막에 둔 쪽은 2(p2).
    const state: NimEngineState = { piles: [0, 0, 0], next: 1 };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p2",
      draw: false,
    });
  });

  it("마지막 더미를 비우는 수로 종료되면 둔 쪽이 승자다", () => {
    const state: NimEngineState = { piles: [0, 0, 2], next: 1 };
    const after = engine.apply(state, { pile: 2, count: 2 }, "p1");
    expect(isNimGameOver(after.piles)).toBe(true);
    expect(after.next).toBe(2);
    expect(engine.status(after)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });
});

describe("createNimEngine — playEngineGame 종국", () => {
  it("결정적 수 선택으로 한 판이 끝까지 진행돼 승자가 나온다", async () => {
    const { playEngineGame } = await import("./playEngineGame");
    // 항상 합법 수의 첫 후보(가장 작은 pile·count)를 고르는 결정적 선택기.
    const chooseFirst = (state: NimEngineState): NimMove =>
      legalNimMoves(state.piles)[0]!;
    const result = playEngineGame(createNimEngine(), (s) => chooseFirst(s));
    expect(result.status.over).toBe(true);
    expect(result.status.draw).toBe(false);
    expect(isNimGameOver(result.finalState.piles)).toBe(true);
    // 님은 무승부가 없으므로 항상 승자가 존재한다.
    expect(result.status.winner === "p1" || result.status.winner === "p2").toBe(
      true,
    );
  });
});
