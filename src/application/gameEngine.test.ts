import { describe, it, expect } from "vitest";
import { createGomokuEngine, type GomokuMove, type Side } from "./gameEngine";
import type { GomokuState } from "./playGomoku";

const engine = createGomokuEngine();

/** by 차례를 명시하며 한 수씩 진행하는 헬퍼. */
function play(state: GomokuState, x: number, y: number, by: Side): GomokuState {
  return engine.apply(state, { x, y }, by);
}

describe("createGomokuEngine — interface & side mapping", () => {
  it("init() 후 turn()은 p1(흑 선), 빈 보드 status는 미종료", () => {
    const state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({ over: false, winner: null, draw: false });
  });

  it("init({ size }) 설정이 보드 크기에 반영된다", () => {
    const state = engine.init({ size: 3 });
    expect(state.board.length).toBe(3);
    expect(state.board[0]!.length).toBe(3);
  });

  it("의미 없는 config는 기본 보드(15)로 시작", () => {
    expect(engine.init().board.length).toBe(15);
    expect(engine.init({ size: "big" }).board.length).toBe(15);
    expect(engine.init(null).board.length).toBe(15);
  });
});

describe("createGomokuEngine — isLegal (throw 금지)", () => {
  it("빈 칸 + 올바른 차례 → true", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p1")).toBe(true);
  });

  it("잘못된 차례(by 불일치) → false", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p2")).toBe(false);
  });

  it("점유된 칸 → false", () => {
    const state = play(engine.init(), 0, 0, "p1");
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p2")).toBe(false);
  });

  it("범위 밖 좌표 → false (throw 안 함)", () => {
    const state = engine.init({ size: 3 });
    const cases: GomokuMove[] = [
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 3, y: 0 },
      { x: 0, y: 3 },
      { x: 1.5, y: 0 },
    ];
    for (const move of cases) {
      expect(engine.isLegal(state, move, "p1")).toBe(false);
    }
  });

  it("종료된 게임 → false", () => {
    const won = playBlackWin();
    expect(engine.status(won).over).toBe(true);
    expect(engine.isLegal(won, { x: 10, y: 10 }, "p1")).toBe(false);
  });
});

describe("createGomokuEngine — apply 위임 & 불변", () => {
  it("합법 수 적용 후 보드 반영 + 차례 토글, 입력 state 불변", () => {
    const before = engine.init();
    const after = play(before, 0, 0, "p1");
    expect(after.board[0]![0]).toBe("black");
    expect(engine.turn(after)).toBe("p2");
    // 입력 state는 변형되지 않는다.
    expect(before.board[0]![0]).toBeNull();
    expect(engine.turn(before)).toBe("p1");
  });

  it("불법 수 / 잘못된 차례 apply → throw", () => {
    const state = engine.init();
    expect(() => engine.apply(state, { x: 0, y: 0 }, "p2")).toThrow();
    expect(() => engine.apply(state, { x: -1, y: 0 }, "p1")).toThrow();
    const occupied = play(state, 0, 0, "p1");
    expect(() => engine.apply(occupied, { x: 0, y: 0 }, "p2")).toThrow();
  });
});

/** 흑(p1)이 가로 5목을 완성하는 수순을 진행한 상태를 만든다. */
function playBlackWin(): GomokuState {
  let state = engine.init();
  for (let i = 0; i < 5; i += 1) {
    state = play(state, i, 0, "p1"); // 흑: (0..4, 0)
    if (i < 4) {
      state = play(state, i, 1, "p2"); // 백: (0..3, 1)
    }
  }
  return state;
}

describe("createGomokuEngine — 종료/무승부 판정", () => {
  it("흑 5목 완성 → over=true, winner=p1, draw=false", () => {
    const state = playBlackWin();
    expect(engine.status(state)).toEqual({ over: true, winner: "p1", draw: false });
  });

  it("승자 없이 3×3을 가득 채우면 draw", () => {
    // 5목이 불가능한 3×3을 모두 채운다.
    const order: Array<[number, number, Side]> = [
      [0, 0, "p1"],
      [1, 0, "p2"],
      [2, 0, "p1"],
      [0, 1, "p2"],
      [1, 1, "p1"],
      [2, 1, "p2"],
      [0, 2, "p1"],
      [1, 2, "p2"],
      [2, 2, "p1"],
    ];
    let state = engine.init({ size: 3 });
    for (const [x, y, by] of order) {
      state = play(state, x, y, by);
    }
    expect(engine.status(state)).toEqual({ over: true, winner: null, draw: true });
  });
});
