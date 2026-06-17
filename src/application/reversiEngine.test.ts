import { describe, it, expect } from "vitest";
import { createReversiEngine, type ReversiMove } from "./reversiEngine";
import { startReversiGame, type ReversiState } from "./playReversi";
import { createReversiBoard, type Board, type Stone } from "../domain/reversi";
import { legalReversiMoves, hasLegalReversiMove } from "../domain/reversiMoves";

const engine = createReversiEngine();

/** 보드 깊은 스냅샷(불변 검증용). */
function snapshot(board: Board): Board {
  return board.map((row) => row.slice());
}

/** 모든 칸이 black인 8×8 보드. */
function allBlackBoard(): Board {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => "black" as Stone),
  );
}

describe("createReversiEngine — interface & side mapping", () => {
  it("init() 후 turn()은 p1(black 선), 초기 status는 미종료", () => {
    const state = engine.init();
    expect(state.board).toEqual(createReversiBoard());
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("init(config)는 config를 무시하고 표준 초기 상태를 반환한다", () => {
    const state = engine.init({ size: 19 });
    expect(state).toEqual(startReversiGame());
  });

  it("white 차례 상태의 turn()은 p2", () => {
    const state: ReversiState = { ...startReversiGame(), next: "white" };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createReversiEngine — isLegal (throw 금지)", () => {
  it("초기 보드에서 흑(p1)의 합법 수 4개는 모두 isLegal=true", () => {
    const state = engine.init();
    const moves = legalReversiMoves(state.board, "black");
    expect(moves.length).toBe(4);
    for (const m of moves) {
      expect(engine.isLegal(state, m, "p1")).toBe(true);
    }
  });

  it("뒤집힘 0개인 빈 칸은 불법", () => {
    const state = engine.init();
    // (0,0)은 어떤 디스크도 뒤집지 못한다.
    expect(engine.isLegal(state, { x: 0, y: 0 }, "p1")).toBe(false);
  });

  it("차례가 아니면 불법(throw 금지)", () => {
    const state = engine.init();
    const move = legalReversiMoves(state.board, "black")[0]!;
    expect(engine.isLegal(state, move, "p2")).toBe(false);
  });

  it("범위 밖/점유된 칸은 불법(throw 금지)", () => {
    const state = engine.init();
    expect(engine.isLegal(state, { x: -1, y: 0 }, "p1")).toBe(false);
    expect(engine.isLegal(state, { x: 8, y: 0 }, "p1")).toBe(false);
    // 중앙 점유 칸.
    expect(engine.isLegal(state, { x: 3, y: 3 }, "p1")).toBe(false);
  });

  it("종료된 게임에서는 모든 수가 불법", () => {
    const finished: ReversiState = {
      board: allBlackBoard(),
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(engine.isLegal(finished, { x: 0, y: 0 }, "p1")).toBe(false);
  });
});

describe("createReversiEngine — apply", () => {
  it("합법 수 적용 후 디스크가 놓이고 차례가 백(p2)으로 토글된다", () => {
    const state = engine.init();
    const move = legalReversiMoves(state.board, "black")[0]!;
    const next = engine.apply(state, move, "p1");
    expect(next.board[move.y]![move.x]).toBe("black");
    expect(engine.turn(next)).toBe("p2");
    expect(next.finished).toBe(false);
  });

  it("불법 수(차례 아님)는 throw", () => {
    const state = engine.init();
    const move = legalReversiMoves(state.board, "black")[0]!;
    expect(() => engine.apply(state, move, "p2")).toThrow();
  });

  it("불법 수(뒤집힘 0개)는 throw", () => {
    const state = engine.init();
    expect(() => engine.apply(state, { x: 0, y: 0 }, "p1")).toThrow();
  });

  it("종료 후 apply는 throw", () => {
    const finished: ReversiState = {
      board: allBlackBoard(),
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(() => engine.apply(finished, { x: 0, y: 0 }, "p1")).toThrow();
  });

  it("입력 state/board/move를 변형하지 않는다(불변)", () => {
    const state = engine.init();
    const boardBefore = snapshot(state.board);
    const move: ReversiMove = legalReversiMoves(state.board, "black")[0]!;
    const moveBefore = { ...move };
    engine.apply(state, move, "p1");
    expect(state.board).toEqual(boardBefore);
    expect(state.next).toBe("black");
    expect(state.finished).toBe(false);
    expect(move).toEqual(moveBefore);
  });
});

describe("createReversiEngine — 자동 패스", () => {
  it("상대가 둘 곳이 없으면 차례가 같은 쪽으로 유지된다(자동 패스)", () => {
    // (0,0), (2,0)만 비우고 각 +x에 white. 흑만 둘 수 있고 백은 어디에도 못 둔다.
    const board = allBlackBoard();
    board[0]![0] = null;
    board[0]![1] = "white";
    board[2]![0] = null;
    board[2]![1] = "white";
    expect(hasLegalReversiMove(board, "black")).toBe(true);
    expect(hasLegalReversiMove(board, "white")).toBe(false);

    const state: ReversiState = {
      board,
      next: "black",
      finished: false,
      lastWasPass: false,
    };
    const next = engine.apply(state, { x: 0, y: 0 }, "p1");
    expect(next.finished).toBe(false);
    expect(next.lastWasPass).toBe(true);
    // 백은 자동 패스되어 차례가 흑(p1)에게 되돌아온다.
    expect(engine.turn(next)).toBe("p1");
    expect(engine.status(next).over).toBe(false);
  });
});

describe("createReversiEngine — status (승자/무승부 매핑)", () => {
  it("미종료면 over=false", () => {
    expect(engine.status(engine.init())).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("종료 후 착수로 보드가 흑으로 가득 차면 winner=p1", () => {
    // (0,0)만 비우고 +x에 white. 흑이 두면 보드가 가득 차 종료된다.
    const board = allBlackBoard();
    board[0]![0] = null;
    board[0]![1] = "white";
    const state: ReversiState = {
      board,
      next: "black",
      finished: false,
      lastWasPass: false,
    };
    const next = engine.apply(state, { x: 0, y: 0 }, "p1");
    expect(next.finished).toBe(true);
    expect(engine.status(next)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("종료 시 백이 더 많으면 winner=p2", () => {
    const board: Board = Array.from({ length: 8 }, (_unused, y) =>
      Array.from({ length: 8 }, () => (y < 5 ? "white" : "black") as Stone),
    );
    const state: ReversiState = {
      board,
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: "p2",
      draw: false,
    });
  });

  it("종료 시 디스크 수가 같으면 draw", () => {
    const board: Board = Array.from({ length: 8 }, (_unused, y) =>
      Array.from({ length: 8 }, () => (y < 4 ? "black" : "white") as Stone),
    );
    const state: ReversiState = {
      board,
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(engine.status(state)).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });
});
