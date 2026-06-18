import { describe, it, expect } from "vitest";
import {
  createBattleshipEngine,
  redactBattleshipState,
  redactOpponentBoard,
  DEFAULT_BATTLESHIP_SIZE,
  type BattleshipEngineState,
} from "./battleshipEngine";
import {
  createBattleshipBoard,
  fireShot,
  isFleetDestroyed,
  type Ship,
} from "../domain/battleship";

const engine = createBattleshipEngine();

// 5×5 격자에 함선 1척(길이 2, 수평 (0,0)-(0,1))을 둔 단순 함대. 테스트 전멸이 쉽다.
const FLEET2: Ship[] = [{ id: "s", row: 0, col: 0, size: 2, orientation: "h" }];

/** 양측 동일 함대(FLEET2)·size 5로 초기 상태를 만든다. */
function initSmall(): BattleshipEngineState {
  return engine.init({ size: 5, p1Ships: FLEET2, p2Ships: FLEET2 });
}

describe("createBattleshipEngine — init & turn", () => {
  it("config로 양측 보드를 만들고 선=p1", () => {
    const state = initSmall();
    expect(state.p1Board).toHaveLength(5);
    expect(state.p2Board).toHaveLength(5);
    expect(state.p1Board[0]![0]!.hasShip).toBe(true); // (0,0) 함선
    expect(state.p2Board[0]![1]!.hasShip).toBe(true); // (0,1) 함선
    expect(state.next).toBe("p1");
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("size 미지정 시 기본 10×10", () => {
    const state = engine.init({ p1Ships: FLEET2, p2Ships: FLEET2 });
    expect(DEFAULT_BATTLESHIP_SIZE).toBe(10);
    expect(state.p1Board).toHaveLength(10);
    expect(state.p1Board[0]).toHaveLength(10);
    expect(state.p2Board).toHaveLength(10);
  });

  it("config가 없거나 p1Ships/p2Ships가 없으면 throw", () => {
    expect(() => engine.init()).toThrow();
    expect(() => engine.init({})).toThrow();
    expect(() => engine.init({ p1Ships: FLEET2 })).toThrow();
    expect(() => engine.init({ p2Ships: FLEET2 })).toThrow();
  });

  it("next:p2 상태의 turn()은 p2", () => {
    const state: BattleshipEngineState = { ...initSmall(), next: "p2" };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createBattleshipEngine — isLegal (throw 금지)", () => {
  it("상대 보드의 미사격 칸을 차례에 맞게 쏘면 true", () => {
    const state = initSmall();
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p1")).toBe(true);
    expect(engine.isLegal(state, { row: 4, col: 4 }, "p1")).toBe(true);
  });

  it("차례가 아니면 false", () => {
    const state = initSmall();
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p2")).toBe(false);
  });

  it("범위 밖·비정수 좌표는 false(throw 금지)", () => {
    const state = initSmall();
    expect(engine.isLegal(state, { row: -1, col: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { row: 0, col: 5 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { row: 5, col: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { row: 0.5, col: 0 }, "p1")).toBe(false);
  });

  it("이미 사격한 칸은 false", () => {
    // p1이 사격하는 상대 보드(p2Board)의 (0,0)을 미리 사격해 둔 상태.
    const base = initSmall();
    const state: BattleshipEngineState = {
      ...base,
      p2Board: fireShot(base.p2Board, 0, 0),
    };
    expect(engine.isLegal(state, { row: 0, col: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { row: 0, col: 1 }, "p1")).toBe(true);
  });

  it("종료된 게임에서는 모든 수가 false", () => {
    const dead = fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 0, 1);
    expect(isFleetDestroyed(dead)).toBe(true);
    const state: BattleshipEngineState = {
      p1Board: createBattleshipBoard(5, FLEET2),
      p2Board: dead, // p2 전멸 → p1 승, 종료
      next: "p1",
    };
    expect(engine.status(state).over).toBe(true);
    expect(engine.isLegal(state, { row: 2, col: 2 }, "p1")).toBe(false);
  });
});

describe("createBattleshipEngine — apply", () => {
  it("p1이 상대 보드에 사격하고 p2 차례로 전환", () => {
    const state = initSmall();
    const next = engine.apply(state, { row: 0, col: 0 }, "p1");
    // p1은 p2Board에 사격한다(명중).
    expect(next.p2Board[0]![0]!.hit).toBe(true);
    expect(next.p1Board[0]![0]!.hit).toBe(false); // p1 보드는 그대로
    expect(next.next).toBe("p2");
    expect(engine.turn(next)).toBe("p2");
  });

  it("명중해도 한 발씩 교대한다(p2가 다음에 사격)", () => {
    const s0 = initSmall();
    const s1 = engine.apply(s0, { row: 0, col: 0 }, "p1"); // 명중, 그래도 교대
    expect(s1.next).toBe("p2");
    const s2 = engine.apply(s1, { row: 4, col: 4 }, "p2"); // p2가 p1Board 사격(빗나감)
    expect(s2.p1Board[4]![4]!.hit).toBe(true);
    expect(s2.p1Board[4]![4]!.hasShip).toBe(false); // 빗나감
    expect(s2.next).toBe("p1");
  });

  it("입력 state/보드를 변형하지 않는다(불변)", () => {
    const state = initSmall();
    engine.apply(state, { row: 0, col: 0 }, "p1");
    expect(state.p2Board[0]![0]!.hit).toBe(false);
    expect(state.next).toBe("p1");
  });

  it("불법 수 apply는 throw (차례 아님 / 범위 밖 / 이미 쏜 칸 / 종료)", () => {
    const state = initSmall();
    expect(() => engine.apply(state, { row: 0, col: 0 }, "p2")).toThrow();
    expect(() => engine.apply(state, { row: 5, col: 0 }, "p1")).toThrow();

    const fired: BattleshipEngineState = {
      ...state,
      p2Board: fireShot(state.p2Board, 0, 0),
    };
    expect(() => engine.apply(fired, { row: 0, col: 0 }, "p1")).toThrow();

    const over: BattleshipEngineState = {
      p1Board: createBattleshipBoard(5, FLEET2),
      p2Board: fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 0, 1),
      next: "p1",
    };
    expect(() => engine.apply(over, { row: 2, col: 2 }, "p1")).toThrow();
  });
});

describe("createBattleshipEngine — status (전멸 승자·무승부 없음)", () => {
  it("진행 중이면 over=false", () => {
    expect(engine.status(initSmall())).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("p2 함대 전멸이면 p1 승", () => {
    const dead = fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 0, 1);
    const state: BattleshipEngineState = {
      p1Board: createBattleshipBoard(5, FLEET2),
      p2Board: dead,
      next: "p2",
    };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("p1 함대 전멸이면 p2 승", () => {
    const dead = fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 0, 1);
    const state: BattleshipEngineState = {
      p1Board: dead,
      p2Board: createBattleshipBoard(5, FLEET2),
      next: "p1",
    };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p2",
      draw: false,
    });
  });

  it("apply로 상대 함대를 마지막 칸까지 격침하면 승자가 나온다(교대 진행)", () => {
    // p1이 p2Board (0,0)·(0,1)을 격침. 사이에 p2가 빗나감 사격.
    let s = initSmall();
    s = engine.apply(s, { row: 0, col: 0 }, "p1"); // 명중
    expect(engine.status(s).over).toBe(false);
    s = engine.apply(s, { row: 4, col: 4 }, "p2"); // 빗나감
    s = engine.apply(s, { row: 0, col: 1 }, "p1"); // 두 번째 명중 → p2 전멸
    const status = engine.status(s);
    expect(status).toEqual({ over: true, winner: "p1", draw: false });
    expect(isFleetDestroyed(s.p2Board)).toBe(true);
  });
});

describe("redactOpponentBoard — 상대 보드 안개 가림", () => {
  it("미사격 함선 칸은 hasShip:false·shipId:null로 가려진다", () => {
    const board = createBattleshipBoard(5, FLEET2); // (0,0)·(0,1)에 함선, 전부 미사격
    const redacted = redactOpponentBoard(board);
    expect(redacted[0]![0]).toEqual({ hasShip: false, shipId: null, hit: false });
    expect(redacted[0]![1]).toEqual({ hasShip: false, shipId: null, hit: false });
    // 원래 빈 바다 칸도 그대로 빈 바다.
    expect(redacted[2]![2]).toEqual({ hasShip: false, shipId: null, hit: false });
  });

  it("사격된 칸(명중·빗나감)은 그대로 보존된다", () => {
    // (0,0) 명중(함선), (2,2) 빗나감(빈 바다)으로 사격해 둔다.
    const board = fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 2, 2);
    const redacted = redactOpponentBoard(board);
    // 명중: hit이라 함선 정보 보존.
    expect(redacted[0]![0]).toEqual({ hasShip: true, shipId: "s", hit: true });
    // 빗나감: hit이지만 함선 없음 — 그대로.
    expect(redacted[2]![2]).toEqual({ hasShip: false, shipId: null, hit: true });
    // 미사격 함선 칸 (0,1)은 여전히 가려진다.
    expect(redacted[0]![1]).toEqual({ hasShip: false, shipId: null, hit: false });
  });

  it("입력 보드/셀을 변형하지 않는다(불변·새 객체)", () => {
    const board = createBattleshipBoard(5, FLEET2);
    const redacted = redactOpponentBoard(board);
    expect(board[0]![0]!.hasShip).toBe(true); // 원본 보존
    expect(redacted[0]![0]).not.toBe(board[0]![0]); // 새 셀 객체
  });
});

describe("redactBattleshipState — 시점별 가림", () => {
  /** p1Board (0,0) 명중·(2,2) 빗나감, p2Board (0,1) 명중인 진행 상태. */
  function midGame(): BattleshipEngineState {
    return {
      p1Board: fireShot(fireShot(createBattleshipBoard(5, FLEET2), 0, 0), 2, 2),
      p2Board: fireShot(createBattleshipBoard(5, FLEET2), 0, 1),
      next: "p2",
    };
  }

  it("viewer=p1: 자기 보드(p1Board) 전부 보존, 상대 보드(p2Board) 미사격 함선 가림", () => {
    const state = midGame();
    const view = redactBattleshipState(state, "p1");
    // 자기 보드(p1Board)는 그대로: (0,0) 명중·(0,1) 미사격 함선도 노출.
    expect(view.p1Board[0]![0]).toEqual({ hasShip: true, shipId: "s", hit: true });
    expect(view.p1Board[0]![1]).toEqual({ hasShip: true, shipId: "s", hit: false });
    // 상대 보드(p2Board): (0,1)은 사격됨(명중) → 보존, (0,0)은 미사격 함선 → 가림.
    expect(view.p2Board[0]![1]).toEqual({ hasShip: true, shipId: "s", hit: true });
    expect(view.p2Board[0]![0]).toEqual({ hasShip: false, shipId: null, hit: false });
    expect(view.next).toBe("p2"); // next 보존
  });

  it("viewer=p2: 자기 보드(p2Board) 전부 보존, 상대 보드(p1Board) 미사격 함선 가림", () => {
    const state = midGame();
    const view = redactBattleshipState(state, "p2");
    // 자기 보드(p2Board)는 그대로: (0,0) 미사격 함선도 노출.
    expect(view.p2Board[0]![0]).toEqual({ hasShip: true, shipId: "s", hit: false });
    // 상대 보드(p1Board): (0,0) 명중 보존·(2,2) 빗나감 보존·(0,1) 미사격 함선 가림.
    expect(view.p1Board[0]![0]).toEqual({ hasShip: true, shipId: "s", hit: true });
    expect(view.p1Board[2]![2]).toEqual({ hasShip: false, shipId: null, hit: true });
    expect(view.p1Board[0]![1]).toEqual({ hasShip: false, shipId: null, hit: false });
    expect(view.next).toBe("p2");
  });

  it("입력 상태/보드를 변형하지 않는다(불변·새 객체 반환)", () => {
    const state = midGame();
    const view = redactBattleshipState(state, "p1");
    // 원본의 상대 미사격 함선 칸은 그대로 노출 상태.
    expect(state.p2Board[0]![0]!.hasShip).toBe(true);
    expect(view).not.toBe(state);
    expect(view.p1Board).not.toBe(state.p1Board);
    expect(view.p2Board).not.toBe(state.p2Board);
  });

  it("사격된 칸이 전혀 없으면 상대 함대가 통째로 가려진다(대칭)", () => {
    const fresh: BattleshipEngineState = engine.init({
      size: 5,
      p1Ships: FLEET2,
      p2Ships: FLEET2,
    });
    const p1View = redactBattleshipState(fresh, "p1");
    const p2View = redactBattleshipState(fresh, "p2");
    // p1 시점: 상대(p2Board) 함선 전부 가림.
    expect(p1View.p2Board[0]![1]!.hasShip).toBe(false);
    // p2 시점: 상대(p1Board) 함선 전부 가림.
    expect(p2View.p1Board[0]![0]!.hasShip).toBe(false);
    // 각자 자기 보드 함선은 노출.
    expect(p1View.p1Board[0]![0]!.hasShip).toBe(true);
    expect(p2View.p2Board[0]![1]!.hasShip).toBe(true);
  });
});
