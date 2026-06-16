import { describe, it, expect } from "vitest";
import { createJanggiEngine, type JanggiMove } from "./janggiEngine";
import { legalMoves, type JanggiState } from "./playJanggi";
import { createEmptyBoard, pieceAt, type Board } from "../domain/janggi";

const engine = createJanggiEngine();

// 보드 깊은 스냅샷(불변 검증용).
function snapshot(board: Board): Board {
  return board.map((row) => row.slice());
}

describe("createJanggiEngine — interface & side mapping", () => {
  it("init() 후 turn()은 p1(cho 선), 초기 status는 미종료", () => {
    const state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("han 차례 상태의 turn()은 p2", () => {
    const state: JanggiState = { ...engine.init(), next: "han" };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createJanggiEngine — isLegal (throw 금지)", () => {
  it("합법 수 + 올바른 차례 → true", () => {
    const state = engine.init();
    const move = legalMoves(state)[0]!;
    expect(engine.isLegal(state, move, "p1")).toBe(true);
  });

  it("잘못된 차례(by 불일치) → false", () => {
    const state = engine.init();
    const move = legalMoves(state)[0]!;
    expect(engine.isLegal(state, move, "p2")).toBe(false);
  });

  it("보드 밖 / 빈 칸 출발 / 불법 이동 → false (throw 안 함)", () => {
    const state = engine.init();
    const cases: JanggiMove[] = [
      // 보드 밖 좌표.
      { from: { x: -1, y: 0 }, to: { x: 0, y: 0 } },
      { from: { x: 0, y: 0 }, to: { x: 99, y: 99 } },
      // 빈 칸 출발(중앙은 비어 있음).
      { from: { x: 4, y: 4 }, to: { x: 4, y: 3 } },
      // cho 졸 후퇴(불법 이동).
      { from: { x: 0, y: 6 }, to: { x: 0, y: 7 } },
    ];
    for (const move of cases) {
      expect(engine.isLegal(state, move, "p1")).toBe(false);
    }
  });

  it("종료된 게임 → false", () => {
    const finished: JanggiState = {
      board: createEmptyBoard(),
      next: "cho",
      finished: true,
      winner: "cho",
    };
    expect(engine.status(finished).over).toBe(true);
    const move: JanggiMove = { from: { x: 0, y: 6 }, to: { x: 0, y: 5 } };
    expect(engine.isLegal(finished, move, "p1")).toBe(false);
  });
});

describe("createJanggiEngine — apply 위임 & 불변", () => {
  it("합법 수 적용 후 차례 토글(p1→p2), 입력 state 불변", () => {
    const before = engine.init();
    const beforeBoard = snapshot(before.board);
    const move = legalMoves(before)[0]!;
    const after = engine.apply(before, move, "p1");
    expect(engine.turn(after)).toBe("p2");
    // 입력 state는 변형되지 않는다.
    expect(before.next).toBe("cho");
    expect(before.board).toEqual(beforeBoard);
  });

  it("불법 수 / 잘못된 차례 apply → throw", () => {
    const state = engine.init();
    const legal = legalMoves(state)[0]!;
    // 잘못된 차례.
    expect(() => engine.apply(state, legal, "p2")).toThrow();
    // 불법 이동(졸 후퇴).
    const illegal: JanggiMove = { from: { x: 0, y: 6 }, to: { x: 0, y: 7 } };
    expect(() => engine.apply(state, illegal, "p1")).toThrow();
  });
});

describe("createJanggiEngine — 종료 판정", () => {
  it("상대 general 포획으로 종료 → over=true, winner=둔 쪽(p1), draw=false", () => {
    // 커스텀 보드: han 장 (4,1)을 cho 차(4,5)가 직선 포획.
    const board = createEmptyBoard();
    board[1]![4] = { side: "han", type: "general" };
    board[5]![4] = { side: "cho", type: "chariot" };
    board[8]![4] = { side: "cho", type: "general" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
    };
    const move: JanggiMove = { from: { x: 4, y: 5 }, to: { x: 4, y: 1 } };
    expect(engine.isLegal(state, move, "p1")).toBe(true);
    const after = engine.apply(state, move, "p1");
    expect(engine.status(after)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
    expect(pieceAt(after.board, 4, 1)).toEqual({ side: "cho", type: "chariot" });
  });
});
