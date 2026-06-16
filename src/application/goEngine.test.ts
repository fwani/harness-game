import { describe, it, expect } from "vitest";
import { createGoEngine, type GoMove } from "./goEngine";
import { startGame, type GoState } from "./playGo";
import { createBoard, type Board, type Stone } from "../domain/go";

const engine = createGoEngine();

// 보드 깊은 스냅샷(불변 검증용).
function snapshot(board: Board): Board {
  return board.map((row) => row.slice());
}

// size×size를 한 색으로 가득 채운 보드(종료 후 계가 테스트용).
function filledBoard(size: number, stone: Stone): Board {
  const board = createBoard(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      board[y]![x] = stone;
    }
  }
  return board;
}

// 종료 상태(state)를 임의 보드로 구성한다.
function finishedState(board: Board): GoState {
  return {
    board,
    next: "black",
    captures: { black: 0, white: 0 },
    lastWasPass: true,
    finished: true,
  };
}

describe("createGoEngine — interface & side mapping", () => {
  it("init() 후 turn()은 p1(black 선), 초기 status는 미종료", () => {
    const state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("white 차례 상태의 turn()은 p2", () => {
    const state: GoState = { ...startGame(), next: "white" };
    expect(engine.turn(state)).toBe("p2");
  });

  it("init({ size }) 는 해당 크기 보드로 시작한다", () => {
    const state = engine.init({ size: 9 });
    expect(state.board.length).toBe(9);
    expect(state.board[0]!.length).toBe(9);
  });

  it("init()은 기본 크기(19) 보드로 시작한다", () => {
    expect(engine.init().board.length).toBe(19);
  });
});

describe("createGoEngine — isLegal (throw 금지)", () => {
  it("빈 칸 좌표 착수는 현재 차례면 합법", () => {
    const state = engine.init({ size: 5 });
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p1")).toBe(true);
    expect(engine.isLegal(state, { x: 2, y: 3 }, "p1")).toBe(true);
  });

  it("패스는 미종료·차례 일치면 항상 합법", () => {
    const state = engine.init({ size: 5 });
    expect(engine.isLegal(state, "pass", "p1")).toBe(true);
  });

  it("차례가 아니면 좌표·패스 모두 불법(throw 금지)", () => {
    const state = engine.init({ size: 5 });
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p2")).toBe(false);
    expect(engine.isLegal(state, "pass", "p2")).toBe(false);
  });

  it("이미 점유된 칸은 불법", () => {
    const state = engine.apply(engine.init({ size: 5 }), { x: 0, y: 0 }, "p1");
    // 이제 white(p2) 차례. (0,0)은 점유됨.
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p2")).toBe(false);
  });

  it("범위 밖 좌표는 불법(throw 금지)", () => {
    const state = engine.init({ size: 5 });
    expect(engine.isLegal(state, { x: -1, y: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { x: 5, y: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { x: 0, y: 5 }, "p1")).toBe(false);
  });

  it("종료된 게임에서는 좌표·패스 모두 불법", () => {
    const state = finishedState(createBoard(5));
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, "pass", "p1")).toBe(false);
  });
});

describe("createGoEngine — apply", () => {
  it("좌표 착수는 돌을 두고 차례를 토글한다", () => {
    const state = engine.init({ size: 5 });
    const next = engine.apply(state, { x: 1, y: 2 }, "p1");
    expect(next.board[2]![1]).toBe("black");
    expect(engine.turn(next)).toBe("p2");
  });

  it("패스는 차례를 토글하고 lastWasPass를 세운다", () => {
    const state = engine.init({ size: 5 });
    const next = engine.apply(state, "pass", "p1");
    expect(next.lastWasPass).toBe(true);
    expect(next.finished).toBe(false);
    expect(engine.turn(next)).toBe("p2");
  });

  it("불법 수(차례 아님)는 throw", () => {
    const state = engine.init({ size: 5 });
    expect(() => engine.apply(state, { x: 0, y: 0 }, "p2")).toThrow();
  });

  it("종료 후 착수/패스는 throw", () => {
    const state = finishedState(createBoard(5));
    expect(() => engine.apply(state, { x: 0, y: 0 }, "p1")).toThrow();
    expect(() => engine.apply(state, "pass", "p1")).toThrow();
  });

  it("입력 state/board/move를 변형하지 않는다(불변)", () => {
    const state = engine.init({ size: 5 });
    const boardBefore = snapshot(state.board);
    const move: GoMove = { x: 1, y: 1 };
    engine.apply(state, move, "p1");
    expect(state.board).toEqual(boardBefore);
    expect(state.next).toBe("black");
    expect(state.finished).toBe(false);
    expect(move).toEqual({ x: 1, y: 1 });
  });
});

describe("createGoEngine — 연속 2회 패스 종료 & 계가(status)", () => {
  it("연속 2회 패스로 종료된다", () => {
    let state = engine.init({ size: 5 });
    state = engine.apply(state, "pass", "p1"); // black pass
    expect(engine.status(state).over).toBe(false);
    state = engine.apply(state, "pass", "p2"); // white pass → 종료
    expect(engine.status(state).over).toBe(true);
  });

  it("black 우세면 winner=p1", () => {
    const state = finishedState(filledBoard(5, "black"));
    // komi 0: black 25 > white 0.
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("white 우세면 winner=p2 (komi 반영)", () => {
    const engineKomi = createGoEngine(6.5);
    // 빈 보드: black 0, white 0+6.5 → white 우세.
    const state = finishedState(createBoard(5));
    expect(engineKomi.status(state)).toEqual({
      over: true,
      winner: "p2",
      draw: false,
    });
  });

  it("동점이면 winner=null, draw=true", () => {
    // 빈 보드, komi 0: black 0 == white 0 → 무승부.
    const state = finishedState(createBoard(5));
    expect(engine.status(state)).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });
});
