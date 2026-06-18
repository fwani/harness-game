import { describe, it, expect } from "vitest";

import {
  type Ship,
  type BattleshipBoard,
  STANDARD_FLEET,
  createBattleshipBoard,
  isValidPlacement,
  shipCellsAt,
  fireShot,
  isHit,
  isShipSunk,
  isFleetDestroyed,
} from "./battleship";

const SHIP_A: Ship = { id: "a", row: 0, col: 0, size: 3, orientation: "h" }; // (0,0)(0,1)(0,2)
const SHIP_B: Ship = { id: "b", row: 2, col: 1, size: 2, orientation: "v" }; // (2,1)(3,1)

describe("STANDARD_FLEET", () => {
  it("표준 함대 길이 목록(5/4/3/3/2)을 제공한다", () => {
    expect([...STANDARD_FLEET]).toEqual([5, 4, 3, 3, 2]);
  });
});

describe("isValidPlacement", () => {
  it("범위 안 + 겹치지 않으면 true", () => {
    expect(isValidPlacement(5, [SHIP_A, SHIP_B])).toBe(true);
  });

  it("함선이 범위를 벗어나면 false", () => {
    expect(isValidPlacement(5, [{ id: "x", row: 0, col: 3, size: 3, orientation: "h" }])).toBe(
      false,
    ); // (0,3)(0,4)(0,5) → 5 밖
  });

  it("음수 좌표면 false", () => {
    expect(isValidPlacement(5, [{ id: "x", row: -1, col: 0, size: 2, orientation: "v" }])).toBe(
      false,
    );
  });

  it("두 함선이 겹치면 false", () => {
    const overlap: Ship = { id: "c", row: 0, col: 2, size: 2, orientation: "v" }; // (0,2)(1,2) — A의 (0,2)와 겹침
    expect(isValidPlacement(5, [SHIP_A, overlap])).toBe(false);
  });

  it("size<1 또는 잘못된 보드 크기면 false", () => {
    expect(isValidPlacement(0, [SHIP_A])).toBe(false);
    expect(isValidPlacement(5, [{ id: "z", row: 0, col: 0, size: 0, orientation: "h" }])).toBe(
      false,
    );
  });
});

describe("shipCellsAt", () => {
  it("가로 함선은 열 증가 방향으로 칸을 만든다", () => {
    expect(shipCellsAt(1, 2, 3, "h")).toEqual([
      [1, 2],
      [1, 3],
      [1, 4],
    ]);
  });

  it("세로 함선은 행 증가 방향으로 칸을 만든다", () => {
    expect(shipCellsAt(0, 0, 2, "v")).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });

  it("비정상 입력(size<1)이면 빈 배열", () => {
    expect(shipCellsAt(0, 0, 0, "h")).toEqual([]);
  });
});

describe("createBattleshipBoard", () => {
  it("격자를 만들고 함선을 배치한다", () => {
    const board = createBattleshipBoard(5, [SHIP_A, SHIP_B]);
    expect(board.length).toBe(5);
    expect(board[0]!.length).toBe(5);
    expect(board[0]![0]).toEqual({ hasShip: true, shipId: "a", hit: false });
    expect(board[0]![2]).toEqual({ hasShip: true, shipId: "a", hit: false });
    expect(board[3]![1]).toEqual({ hasShip: true, shipId: "b", hit: false });
    expect(board[1]![1]).toEqual({ hasShip: false, shipId: null, hit: false });
  });

  it("잘못된 보드 크기면 throw", () => {
    expect(() => createBattleshipBoard(0, [])).toThrow();
    expect(() => createBattleshipBoard(1.5, [])).toThrow();
  });

  it("배치가 무효(범위 밖/겹침)면 throw", () => {
    expect(() =>
      createBattleshipBoard(3, [{ id: "x", row: 0, col: 2, size: 3, orientation: "h" }]),
    ).toThrow();
  });

  it("함선 id가 중복되면 throw", () => {
    expect(() =>
      createBattleshipBoard(5, [
        { id: "dup", row: 0, col: 0, size: 2, orientation: "h" },
        { id: "dup", row: 2, col: 0, size: 2, orientation: "h" },
      ]),
    ).toThrow();
  });
});

describe("fireShot", () => {
  it("빈 칸 사격은 빗나감(hit=true, 명중 아님), 원본 불변", () => {
    const board = createBattleshipBoard(5, [SHIP_A]);
    const after = fireShot(board, 4, 4);
    expect(after[4]![4]!.hit).toBe(true);
    expect(isHit(after, 4, 4)).toBe(false); // 함선 없음 → 빗나감
    expect(board[4]![4]!.hit).toBe(false); // 입력 보드 불변
    expect(after).not.toBe(board);
  });

  it("함선 칸 사격은 명중", () => {
    const board = createBattleshipBoard(5, [SHIP_A]);
    const after = fireShot(board, 0, 0);
    expect(isHit(after, 0, 0)).toBe(true);
  });

  it("이미 사격한 칸 재사격은 멱등(불변 복사본)", () => {
    const board = fireShot(createBattleshipBoard(5, [SHIP_A]), 0, 0);
    const again = fireShot(board, 0, 0);
    expect(again[0]![0]!.hit).toBe(true);
    expect(again).not.toBe(board);
  });

  it("범위 밖/비정수 좌표면 throw", () => {
    const board = createBattleshipBoard(5, [SHIP_A]);
    expect(() => fireShot(board, -1, 0)).toThrow();
    expect(() => fireShot(board, 0, 5)).toThrow();
    expect(() => fireShot(board, 0.5, 0)).toThrow();
  });
});

describe("isShipSunk / isFleetDestroyed", () => {
  it("함선의 모든 칸이 맞으면 격침", () => {
    let board: BattleshipBoard = createBattleshipBoard(5, [SHIP_A, SHIP_B]);
    expect(isShipSunk(board, "a")).toBe(false);
    board = fireShot(board, 0, 0);
    board = fireShot(board, 0, 1);
    expect(isShipSunk(board, "a")).toBe(false); // (0,2) 아직
    board = fireShot(board, 0, 2);
    expect(isShipSunk(board, "a")).toBe(true);
    expect(isShipSunk(board, "b")).toBe(false);
  });

  it("없는 함선 id는 격침 아님(false)", () => {
    const board = createBattleshipBoard(5, [SHIP_A]);
    expect(isShipSunk(board, "nope")).toBe(false);
  });

  it("모든 함선 칸이 맞으면 전 함대 격침", () => {
    let board: BattleshipBoard = createBattleshipBoard(5, [SHIP_A, SHIP_B]);
    expect(isFleetDestroyed(board)).toBe(false);
    for (const [r, c] of [
      [0, 0],
      [0, 1],
      [0, 2],
      [2, 1],
      [3, 1],
    ] as const) {
      board = fireShot(board, r, c);
    }
    expect(isFleetDestroyed(board)).toBe(true);
  });

  it("함선이 없는 보드는 전 함대 격침 아님(false)", () => {
    const board = createBattleshipBoard(5, []);
    expect(isFleetDestroyed(board)).toBe(false);
  });
});

describe("STANDARD_FLEET 배치 호환", () => {
  it("표준 함대를 한 줄씩 배치하면 보드가 유효하다", () => {
    const ships: Ship[] = STANDARD_FLEET.map((size, i) => ({
      id: `s${i}`,
      row: i,
      col: 0,
      size,
      orientation: "h" as const,
    }));
    expect(isValidPlacement(10, ships)).toBe(true);
    expect(() => createBattleshipBoard(10, ships)).not.toThrow();
  });
});
