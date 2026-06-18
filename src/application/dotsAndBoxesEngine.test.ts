import { describe, it, expect } from "vitest";
import {
  createDotsAndBoxesEngine,
  type DotsEngineState,
} from "./dotsAndBoxesEngine";
import { chooseRandomDotsEdge } from "./playDotsAndBoxes";
import {
  createDotsAndBoxesBoard,
  drawEdge,
  findDotsWinner,
  isDotsGameOver,
  type DotsBoard,
  type DotsEdge,
  type DotsPlayer,
} from "../domain/dotsAndBoxes";
import type { RandomSource } from "./dealCards";

const engine = createDotsAndBoxesEngine();

/** 깊은 스냅샷(불변 검증용). */
function snapshot(board: DotsBoard): DotsBoard {
  return {
    rows: board.rows,
    cols: board.cols,
    edges: {
      h: board.edges.h.map((r) => r.slice()),
      v: board.edges.v.map((r) => r.slice()),
    },
    boxes: board.boxes.map((r) => r.slice()),
  };
}

/** 여러 변을 순서대로 그어 보드 픽스처를 만든다(완성 여부 무관). */
function drawAll(
  board: DotsBoard,
  edges: DotsEdge[],
  player: DotsPlayer,
): DotsBoard {
  return edges.reduce((b, e) => drawEdge(b, e, player).board, board);
}

describe("createDotsAndBoxesEngine — init & turn", () => {
  it("init() 후 turn()은 p1(선), 빈 격자에서 status.over===false", () => {
    const state = engine.init();
    expect(state.board).toEqual(createDotsAndBoxesBoard(3, 3));
    expect(state.next).toBe(1);
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("기본 크기는 3×3이고 생성 인자로 크기를 바꿀 수 있다", () => {
    const small = createDotsAndBoxesEngine(1, 2).init();
    expect(small.board.rows).toBe(1);
    expect(small.board.cols).toBe(2);
  });

  it("config.rows/cols가 있으면 생성 인자보다 우선한다", () => {
    const state = createDotsAndBoxesEngine(3, 3).init({ rows: 2, cols: 4 });
    expect(state.board.rows).toBe(2);
    expect(state.board.cols).toBe(4);
  });

  it("next:2 상태의 turn()은 p2", () => {
    const state: DotsEngineState = { board: createDotsAndBoxesBoard(3, 3), next: 2 };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createDotsAndBoxesEngine — isLegal (throw 금지)", () => {
  it("합법 변은 true, 이미 그은 변은 false", () => {
    const state = engine.init();
    const edge: DotsEdge = { orientation: "h", row: 0, col: 0 };
    expect(engine.isLegal(state, edge, "p1")).toBe(true);

    const after = engine.apply(state, edge, "p1");
    // 같은 변을 다시 두려고 하면 불법(after.next는 p2).
    expect(engine.isLegal(after, edge, "p2")).toBe(false);
  });

  it("범위 밖 변은 false", () => {
    const state = engine.init();
    expect(
      engine.isLegal(state, { orientation: "h", row: -1, col: 0 }, "p1"),
    ).toBe(false);
    expect(
      engine.isLegal(state, { orientation: "v", row: 0, col: 99 }, "p1"),
    ).toBe(false);
  });

  it("차례가 아니면 false(throw 금지)", () => {
    const state = engine.init();
    expect(
      engine.isLegal(state, { orientation: "h", row: 0, col: 0 }, "p2"),
    ).toBe(false);
  });

  it("종료된 게임에서는 모든 수가 false", () => {
    // 1×1 보드의 모든 변을 그으면 종료된다.
    const full = drawAll(createDotsAndBoxesBoard(1, 1), [
      { orientation: "h", row: 0, col: 0 },
      { orientation: "h", row: 1, col: 0 },
      { orientation: "v", row: 0, col: 0 },
      { orientation: "v", row: 0, col: 1 },
    ], 1);
    expect(isDotsGameOver(full)).toBe(true);
    const state: DotsEngineState = { board: full, next: 1 };
    expect(
      engine.isLegal(state, { orientation: "h", row: 0, col: 0 }, "p1"),
    ).toBe(false);
  });
});

describe("createDotsAndBoxesEngine — apply & 보너스 턴", () => {
  it("박스를 완성하지 않는 수는 상대 턴으로 전환된다", () => {
    const state = engine.init();
    const next = engine.apply(state, { orientation: "h", row: 0, col: 0 }, "p1");
    expect(next.next).toBe(2);
    expect(engine.turn(next)).toBe("p2");
  });

  it("박스를 완성하는 수는 같은 플레이어가 한 번 더 둔다(보너스 턴)", () => {
    // 1×2 보드에서 box(0,0)의 변 3개를 미리 긋고, 4번째 변으로 완성시킨다.
    // box(0,1)은 비어 있어 게임은 종료되지 않는다.
    const board = drawAll(createDotsAndBoxesBoard(1, 2), [
      { orientation: "h", row: 0, col: 0 }, // box(0,0) 위
      { orientation: "h", row: 1, col: 0 }, // box(0,0) 아래
      { orientation: "v", row: 0, col: 0 }, // box(0,0) 왼쪽
    ], 1);
    const state: DotsEngineState = { board, next: 1 };
    expect(isDotsGameOver(board)).toBe(false);

    // v[0][1]을 그으면 box(0,0) 완성 → 보너스 턴.
    const after = engine.apply(state, { orientation: "v", row: 0, col: 1 }, "p1");
    expect(after.board.boxes[0]![0]).toBe(1);
    expect(after.next).toBe(1);
    expect(engine.turn(after)).toBe("p1");
    expect(engine.status(after).over).toBe(false);
  });

  it("불법 수는 throw (차례 아님 / 이미 그은 변)", () => {
    const state = engine.init();
    expect(() =>
      engine.apply(state, { orientation: "h", row: 0, col: 0 }, "p2"),
    ).toThrow();

    const after = engine.apply(state, { orientation: "h", row: 0, col: 0 }, "p1");
    expect(() =>
      engine.apply(after, { orientation: "h", row: 0, col: 0 }, "p2"),
    ).toThrow();
  });

  it("입력 state/board를 변형하지 않는다(불변)", () => {
    const state = engine.init();
    const boardBefore = snapshot(state.board);
    engine.apply(state, { orientation: "h", row: 0, col: 0 }, "p1");
    expect(state.board).toEqual(boardBefore);
    expect(state.next).toBe(1);
  });
});

describe("createDotsAndBoxesEngine — status (승자/무승부)", () => {
  it("종료 시 박스가 많은 쪽이 승자(p1)로 매핑된다", () => {
    // 1×2 보드: box(0,0)은 p1, box(0,1)도 p1 소유가 되도록 구성.
    let board = createDotsAndBoxesBoard(1, 2);
    // 두 박스의 모든 변을 그어 종료시키되 소유는 drawEdge가 마지막 변 긋는 player로 정해진다.
    // box(0,0): 마지막 변을 p1이 긋게, box(0,1): 마지막 변을 p1이 긋게 한다.
    board = drawAll(board, [
      { orientation: "h", row: 0, col: 0 },
      { orientation: "h", row: 1, col: 0 },
      { orientation: "v", row: 0, col: 0 },
      { orientation: "h", row: 0, col: 1 },
      { orientation: "h", row: 1, col: 1 },
      { orientation: "v", row: 0, col: 2 },
      { orientation: "v", row: 0, col: 1 }, // 공유 변: box(0,0)·box(0,1) 동시 완성
    ], 1);
    expect(isDotsGameOver(board)).toBe(true);
    expect(findDotsWinner(board)).toBe(1);
    expect(engine.status({ board, next: 1 })).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
  });

  it("종료 시 동수면 무승부(draw)", () => {
    // 1×2 보드: box(0,0)은 p1, box(0,1)은 p2 소유.
    let board = createDotsAndBoxesBoard(1, 2);
    // box(0,0)을 p1이 완성.
    board = drawAll(board, [
      { orientation: "h", row: 0, col: 0 },
      { orientation: "h", row: 1, col: 0 },
      { orientation: "v", row: 0, col: 0 },
      { orientation: "v", row: 0, col: 1 }, // p1 완성 box(0,0)
    ], 1);
    expect(board.boxes[0]![0]).toBe(1);
    // box(0,1)을 p2가 완성.
    board = drawAll(board, [
      { orientation: "h", row: 0, col: 1 },
      { orientation: "h", row: 1, col: 1 },
      { orientation: "v", row: 0, col: 2 }, // p2 완성 box(0,1)
    ], 2);
    expect(board.boxes[0]![1]).toBe(2);
    expect(isDotsGameOver(board)).toBe(true);
    expect(findDotsWinner(board)).toBe(null);
    expect(engine.status({ board, next: 1 })).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });
});

describe("createDotsAndBoxesEngine — playEngineGame 종국", () => {
  it("결정적 rng로 한 판이 끝까지 진행돼 종료된다", async () => {
    const { playEngineGame } = await import("./playEngineGame");
    // 항상 첫 후보(index 0)를 고르는 결정적 RandomSource.
    const rng: RandomSource = { nextInt: () => 0 };
    const result = playEngineGame(
      createDotsAndBoxesEngine(2, 2),
      (s) => chooseRandomDotsEdge(s.board, rng)!,
    );
    expect(result.status.over).toBe(true);
    // 2×2 보드는 변이 12개 → 정확히 12수로 종국.
    expect(result.moveCount).toBe(12);
    expect(isDotsGameOver(result.finalState.board)).toBe(true);
    // status 승부가 findDotsWinner와 일치.
    const winner = findDotsWinner(result.finalState.board);
    if (winner === null) {
      expect(result.status).toEqual({ over: true, winner: null, draw: true });
    } else {
      expect(result.status.winner).toBe(winner === 1 ? "p1" : "p2");
    }
  });
});
