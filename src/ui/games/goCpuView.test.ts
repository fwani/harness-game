import { describe, it, expect } from "vitest";
import { chooseCpuGoMove } from "./goCpuView";
import { createBoard, placeStone, type Board } from "../../domain/go";
import { legalGoMoves } from "../../domain/goMoves";
import type { RandomSource } from "../../application/dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("chooseCpuGoMove", () => {
  it("(a) 둘 곳이 있으면 합법 좌표를 반환한다", () => {
    const board = createBoard(3);
    const move = chooseCpuGoMove(board, "black", fixedRng(0));
    // 빈 3×3 보드의 첫 합법 수(y,x 오름차순)는 (0,0).
    expect(move).toEqual({ x: 0, y: 0 });
    // 선택한 좌표는 비어 있어야 한다(합법 수).
    expect(board[move!.y]![move!.x]).toBeNull();
  });

  it("(b) 둘 곳이 없으면(빈 칸 없음) null을 반환한다(throw 금지)", () => {
    // 빈 칸이 하나도 없으면 합법 수가 없다 → 패스 대상이므로 null.
    const full: Board = [
      ["black", "white"],
      ["white", "black"],
    ];
    expect(chooseCpuGoMove(full, "white", fixedRng(0))).toBeNull();
  });

  it("(c) 입력 board를 변형하지 않는다", () => {
    const board = createBoard(3);
    const snapshot = JSON.stringify(board);
    chooseCpuGoMove(board, "white", fixedRng(4));
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("(d) 반환 좌표는 항상 그 색의 합법 수다(여러 인덱스 검증)", () => {
    // 일부 칸을 채워 합법 수를 줄인 5×5 보드.
    let board = createBoard(5);
    board = placeStone(board, 0, 0, "black").board;
    board = placeStone(board, 1, 1, "white").board;
    board = placeStone(board, 2, 2, "black").board;

    const legal = legalGoMoves(board, "white");
    expect(legal.length).toBeGreaterThan(0);

    for (let i = 0; i < legal.length; i++) {
      const move = chooseCpuGoMove(board, "white", fixedRng(i));
      expect(move).not.toBeNull();
      // 반환 좌표는 합법 수 목록에 들어 있어야 한다(실제로 둘 수 있는 칸).
      expect(legal).toContainEqual(move);
      // 빈 칸이어야 한다.
      expect(board[move!.y]![move!.x]).toBeNull();
    }
  });
});
