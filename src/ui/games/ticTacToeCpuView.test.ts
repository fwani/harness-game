import { describe, it, expect } from "vitest";
import { chooseCpuTicTacToeMove } from "./ticTacToeCpuView";
import {
  createTicTacToeBoard,
  applyTicTacToeMove,
  type Board,
} from "../../domain/ticTacToe";
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

describe("chooseCpuTicTacToeMove", () => {
  it("(a) 빈 칸이 있으면 합법(빈) 좌표를 반환한다", () => {
    const board = createTicTacToeBoard();
    const move = chooseCpuTicTacToeMove(board, fixedRng(0));
    expect(move).toEqual({ row: 0, col: 0 });
    // 선택한 좌표는 비어 있어야 한다(합법 수).
    expect(board[move!.row]![move!.col]).toBeNull();
  });

  it("(b) 보드가 가득 차면 null을 반환한다", () => {
    // 승자 없이 가득 찬 무승부 보드.
    const full: Board = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", "X"],
    ];
    expect(chooseCpuTicTacToeMove(full, fixedRng(0))).toBeNull();
  });

  it("(b) 이미 승자가 있으면(종료) 빈 칸이 남아도 null을 반환한다", () => {
    // 첫 행 X 3목 — 승부가 났으므로 빈 칸이 남아도 두지 않는다.
    const won: Board = [
      ["X", "X", "X"],
      ["O", "O", null],
      [null, null, null],
    ];
    expect(chooseCpuTicTacToeMove(won, fixedRng(0))).toBeNull();
  });

  it("(c) 입력 board를 변형하지 않는다", () => {
    const board = createTicTacToeBoard();
    const snapshot = JSON.stringify(board);
    chooseCpuTicTacToeMove(board, fixedRng(4));
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("(d) 한 칸만 비었을 때 그 빈 칸 좌표를 반환한다", () => {
    // (2,2)만 비운 보드. 승자 없음. 합법 수가 1개이므로 어떤 인덱스든 그 칸이어야 한다.
    const board: Board = [
      ["X", "O", "X"],
      ["X", "O", "O"],
      ["O", "X", null],
    ];
    const move = chooseCpuTicTacToeMove(board, fixedRng(0));
    expect(move).toEqual({ row: 2, col: 2 });
  });

  it("(d) 반환 좌표는 항상 빈 칸이다(여러 인덱스 검증)", () => {
    // 일부 칸을 채워 합법 수를 줄인다(승자는 없음).
    let board = createTicTacToeBoard();
    board = applyTicTacToeMove(board, 0, 0, "X");
    board = applyTicTacToeMove(board, 1, 1, "O");
    board = applyTicTacToeMove(board, 2, 0, "X");
    for (let i = 0; i < 6; i++) {
      const move = chooseCpuTicTacToeMove(board, fixedRng(i));
      expect(move).not.toBeNull();
      expect(board[move!.row]![move!.col]).toBeNull();
    }
  });
});
