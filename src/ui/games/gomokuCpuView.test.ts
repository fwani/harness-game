import { describe, it, expect } from "vitest";
import { chooseCpuGomokuMove } from "./gomokuCpuView";
import { createBoard, placeStone, type Board } from "../../domain/gomoku";
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

describe("chooseCpuGomokuMove", () => {
  it("(a) 빈 칸이 있으면 합법(빈) 좌표를 반환한다", () => {
    const board = createBoard(3);
    const move = chooseCpuGomokuMove(board, fixedRng(0));
    expect(move).toEqual({ x: 0, y: 0 });
    // 선택한 좌표는 비어 있어야 한다(합법 수).
    expect(board[move!.y]![move!.x]).toBeNull();
  });

  it("(b) 보드가 가득 차면 null을 반환한다", () => {
    const full: Board = [
      ["black", "white"],
      ["white", "black"],
    ];
    expect(chooseCpuGomokuMove(full, fixedRng(0))).toBeNull();
  });

  it("(b) 이미 5목 승자가 있으면(종료) null을 반환한다", () => {
    // 5×5 보드의 첫 행에 흑 5목 — 승부가 났으므로 빈 칸이 남아도 두지 않는다.
    let board = createBoard(5);
    for (let x = 0; x < 5; x++) {
      board = placeStone(board, x, 0, "black");
    }
    expect(chooseCpuGomokuMove(board, fixedRng(0))).toBeNull();
  });

  it("(c) 입력 board를 변형하지 않는다", () => {
    const board = createBoard(3);
    const snapshot = JSON.stringify(board);
    chooseCpuGomokuMove(board, fixedRng(4));
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("(d) 한 칸만 비었을 때 그 빈 칸 좌표를 반환한다", () => {
    // 3×3에서 (2,2)만 비움. 합법 수가 1개이므로 어떤 인덱스든 그 칸이어야 한다.
    let board = createBoard(3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (x === 2 && y === 2) continue;
        board = placeStone(board, x, y, (x + y) % 2 === 0 ? "black" : "white");
      }
    }
    const move = chooseCpuGomokuMove(board, fixedRng(0));
    expect(move).toEqual({ x: 2, y: 2 });
  });

  it("(d) 반환 좌표는 항상 빈 칸이다(여러 인덱스 검증)", () => {
    let board = createBoard(4);
    // 일부 칸을 채워 합법 수를 줄인다.
    board = placeStone(board, 0, 0, "black");
    board = placeStone(board, 1, 1, "white");
    board = placeStone(board, 2, 2, "black");
    for (let i = 0; i < 13; i++) {
      const move = chooseCpuGomokuMove(board, fixedRng(i));
      expect(move).not.toBeNull();
      expect(board[move!.y]![move!.x]).toBeNull();
    }
  });
});
