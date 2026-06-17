import { describe, it, expect } from "vitest";
import { createCheckersEngine, type CheckersEngineState } from "./checkersEngine";
import {
  countCheckersPieces,
  createCheckersBoard,
  legalCheckersMoves,
  pieceAt,
  type CheckersBoard,
  type CheckersCell,
  type CheckersMove,
} from "../domain/checkers";

/**
 * row-major 행 문자열 배열을 8×8 보드로 만든다(상단 row0 → 하단 row7).
 * '.'=빈 칸, 'd'=dark man, 'D'=dark king, 'l'=light man, 'L'=light king.
 */
function boardFrom(rows: string[]): CheckersBoard {
  return rows.map((line) =>
    [...line].map((ch): CheckersCell => {
      switch (ch) {
        case "d":
          return { color: "dark", king: false };
        case "D":
          return { color: "dark", king: true };
        case "l":
          return { color: "light", king: false };
        case "L":
          return { color: "light", king: true };
        default:
          return null;
      }
    }),
  );
}

/** 보드 + 다음 색으로 어댑터 상태를 만든다. */
function stateOf(board: CheckersBoard, next: CheckersEngineState["next"]): CheckersEngineState {
  return { board, next };
}

describe("createCheckersEngine", () => {
  describe("init / turn", () => {
    it("init은 표준 초기 배치 + 선공(dark) 상태를 만든다", () => {
      const engine = createCheckersEngine();
      const state = engine.init();
      expect(state.next).toBe("dark");
      expect(state.board).toEqual(createCheckersBoard());
      expect(countCheckersPieces(state.board, "dark")).toBe(12);
      expect(countCheckersPieces(state.board, "light")).toBe(12);
    });

    it("turn은 선공 색(dark)을 p1로, 상대(light)를 p2로 매핑한다", () => {
      const engine = createCheckersEngine();
      expect(engine.turn(engine.init())).toBe("p1");
      expect(engine.turn(stateOf(createCheckersBoard(), "light"))).toBe("p2");
    });
  });

  describe("isLegal", () => {
    it("합법 수는 true, 동등하지 않은 불법 수는 false(throw 금지)", () => {
      const engine = createCheckersEngine();
      const state = engine.init();
      const legal = legalCheckersMoves(state.board, "dark");
      expect(legal.length).toBeGreaterThan(0);
      expect(engine.isLegal(state, legal[0]!, "p1")).toBe(true);
      // 빈 칸끼리의 말이 안 되는 수.
      const bogus: CheckersMove = { from: { row: 3, col: 3 }, to: { row: 4, col: 4 } };
      expect(engine.isLegal(state, bogus, "p1")).toBe(false);
    });

    it("차례가 아닌 Side가 두려 하면 false", () => {
      const engine = createCheckersEngine();
      const state = engine.init();
      const legal = legalCheckersMoves(state.board, "dark");
      expect(engine.isLegal(state, legal[0]!, "p2")).toBe(false);
    });

    it("종료된 상태에서는 어떤 수도 false", () => {
      const engine = createCheckersEngine();
      // light 전멸 → dark 승. dark가 둘 차례라도 종료.
      const board = boardFrom([
        "........",
        "........",
        "........",
        "........",
        "........",
        "..d.....",
        "........",
        "........",
      ]);
      const state = stateOf(board, "dark");
      expect(engine.status(state).over).toBe(true);
      const anyMove: CheckersMove = { from: { row: 5, col: 2 }, to: { row: 4, col: 1 } };
      expect(engine.isLegal(state, anyMove, "p1")).toBe(false);
    });

    it("강제 점프 상황에서는 점프 수만 합법으로 인정한다(도메인 규약 계승)", () => {
      const engine = createCheckersEngine();
      // dark (5,2)가 light (4,3)을 점프할 수 있다 → 단순 이동은 불법.
      const board = boardFrom([
        "........",
        "........",
        "........",
        "........",
        "...l....",
        "..d.....",
        "........",
        "........",
      ]);
      const state = stateOf(board, "dark");
      const simpleMove: CheckersMove = { from: { row: 5, col: 2 }, to: { row: 4, col: 1 } };
      const jumpMove: CheckersMove = {
        from: { row: 5, col: 2 },
        to: { row: 3, col: 4 },
        captured: { row: 4, col: 3 },
      };
      expect(engine.isLegal(state, simpleMove, "p1")).toBe(false);
      expect(engine.isLegal(state, jumpMove, "p1")).toBe(true);
    });
  });

  describe("apply", () => {
    it("일반 수는 턴을 상대 색으로 넘긴다", () => {
      const engine = createCheckersEngine();
      const board = boardFrom([
        "........",
        "........",
        "..l.....",
        "........",
        "........",
        "d.......",
        "........",
        "........",
      ]);
      const state = stateOf(board, "dark");
      const move = legalCheckersMoves(board, "dark")[0]!;
      const next = engine.apply(state, move, "p1");
      expect(next.next).toBe("light");
      expect(engine.turn(next)).toBe("p2");
      expect(pieceAt(next.board, 4, 1)).toEqual({ color: "dark", king: false });
    });

    it("멀티 점프가 이어지는 수는 같은 색을 유지한다(continues)", () => {
      const engine = createCheckersEngine();
      // dark (5,2)→(3,4) 점프 후 (2,3) light를 또 점프 가능.
      const board = boardFrom([
        "........",
        "........",
        "...l....",
        "........",
        "...l....",
        "..d.....",
        "........",
        "........",
      ]);
      const state = stateOf(board, "dark");
      const move = legalCheckersMoves(board, "dark")[0]!;
      const next = engine.apply(state, move, "p1");
      expect(next.next).toBe("dark");
      expect(engine.turn(next)).toBe("p1");
    });

    it("불법 수를 주면 throw", () => {
      const engine = createCheckersEngine();
      const state = engine.init();
      const bogus: CheckersMove = { from: { row: 3, col: 3 }, to: { row: 4, col: 4 } };
      expect(() => engine.apply(state, bogus, "p1")).toThrow();
    });

    it("차례가 아닌 Side가 두면 throw", () => {
      const engine = createCheckersEngine();
      const state = engine.init();
      const legal = legalCheckersMoves(state.board, "dark")[0]!;
      expect(() => engine.apply(state, legal, "p2")).toThrow();
    });
  });

  describe("status", () => {
    it("승부가 난 국면에서 over/winner를 올바르게 보고한다", () => {
      const engine = createCheckersEngine();
      // light 전멸 → dark 승(=p1).
      const board = boardFrom([
        "........",
        "........",
        "........",
        "........",
        "........",
        "..d.....",
        "........",
        "........",
      ]);
      const status = engine.status(stateOf(board, "light"));
      expect(status.over).toBe(true);
      expect(status.winner).toBe("p1");
      expect(status.draw).toBe(false);
    });

    it("진행 중 국면에서는 over=false", () => {
      const engine = createCheckersEngine();
      const status = engine.status(engine.init());
      expect(status).toEqual({ over: false, winner: null, draw: false });
    });

    it("스테일메이트(둘 수 없는 색)는 상대 승으로 보고한다", () => {
      const engine = createCheckersEngine();
      // dark man (0,1)은 전진 방향(위쪽)이 보드 밖이라 둘 수 없음 → light(=p2) 승.
      const board = boardFrom([
        ".d......",
        "........",
        "........",
        "........",
        "........",
        "........",
        "......l.",
        "........",
      ]);
      const status = engine.status(stateOf(board, "dark"));
      expect(status.over).toBe(true);
      expect(status.winner).toBe("p2");
    });
  });

  describe("불변성", () => {
    it("apply가 입력 상태/보드를 변형하지 않는다", () => {
      const engine = createCheckersEngine();
      const board = boardFrom([
        "........",
        "........",
        "..l.....",
        "........",
        "........",
        "d.......",
        "........",
        "........",
      ]);
      const state = stateOf(board, "dark");
      const snapshot = JSON.stringify(state);
      const move = legalCheckersMoves(board, "dark")[0]!;
      engine.apply(state, move, "p1");
      expect(JSON.stringify(state)).toBe(snapshot);
    });
  });
});
