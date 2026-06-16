import { describe, it, expect } from "vitest";
import { legalGomokuMoves, chooseRandomGomokuMove } from "./gomokuAi";
import { createBoard, placeStone, type Board } from "../domain/gomoku";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("legalGomokuMoves", () => {
  it("빈 3×3 보드는 9개 좌표를 row-major 순서로 반환한다", () => {
    const moves = legalGomokuMoves(createBoard(3));
    expect(moves).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it("채워진 칸은 결과에서 제외한다", () => {
    const board = placeStone(placeStone(createBoard(3), 1, 0, "black"), 0, 2, "white");
    const moves = legalGomokuMoves(board);
    expect(moves).not.toContainEqual({ x: 1, y: 0 });
    expect(moves).not.toContainEqual({ x: 0, y: 2 });
    expect(moves).toHaveLength(7);
  });

  it("가득 찬 보드는 빈 배열을 반환한다(throw 하지 않음)", () => {
    const board: Board = [
      ["black", "white"],
      ["white", "black"],
    ];
    expect(legalGomokuMoves(board)).toEqual([]);
  });

  it("입력 board를 변형하지 않는다", () => {
    const board = createBoard(2);
    const snapshot = JSON.stringify(board);
    legalGomokuMoves(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("chooseRandomGomokuMove", () => {
  it("RandomSource 인덱스로 결정적으로 좌표를 고른다", () => {
    const board = createBoard(3);
    // index 0 -> 첫 합법 수 (0,0)
    expect(chooseRandomGomokuMove(board, fixedRng(0))).toEqual({ x: 0, y: 0 });
    // index 4 -> 다섯 번째 합법 수 (1,1)
    expect(chooseRandomGomokuMove(board, fixedRng(4))).toEqual({ x: 1, y: 1 });
    // index 8 -> 마지막 합법 수 (2,2)
    expect(chooseRandomGomokuMove(board, fixedRng(8))).toEqual({ x: 2, y: 2 });
  });

  it("채워진 칸을 건너뛴 합법 수 목록 기준으로 선택한다", () => {
    const board = placeStone(createBoard(2), 0, 0, "black");
    // 합법 수: (1,0),(0,1),(1,1) — index 0 은 (1,0)
    expect(chooseRandomGomokuMove(board, fixedRng(0))).toEqual({ x: 1, y: 0 });
  });

  it("가득 찬 보드면 throw 한다", () => {
    const board: Board = [
      ["black", "white"],
      ["white", "black"],
    ];
    expect(() => chooseRandomGomokuMove(board, fixedRng(0))).toThrow(/no legal moves/);
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createBoard(2); // 4 legal moves
    expect(() => chooseRandomGomokuMove(board, fixedRng(4))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다", () => {
    const board = createBoard(3);
    const snapshot = JSON.stringify(board);
    chooseRandomGomokuMove(board, fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
