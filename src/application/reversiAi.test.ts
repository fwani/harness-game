import { describe, it, expect } from "vitest";
import { chooseRandomReversiMove } from "./reversiAi";
import { legalReversiMoves } from "../domain/reversiMoves";
import { createReversiBoard, type Board } from "../domain/reversi";
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

/** 모든 칸이 빈 8×8 보드(어떤 색도 둘 곳이 없다 → 합법 수 0). */
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("chooseRandomReversiMove", () => {
  it("표준 초기 보드에서 흑의 합법 수는 4개이고 선택 결과가 그 안에 있다", () => {
    const board = createReversiBoard();
    const legal = legalReversiMoves(board, "black");
    expect(legal).toHaveLength(4);
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseRandomReversiMove(board, "black", fixedRng(i));
      expect(legal).toContainEqual(move);
      // 도메인 함수의 순서를 그대로 사용한다.
      expect(move).toEqual(legal[i]);
    }
  });

  it("결정적 stub(고정 idx)로 특정 합법 수를 선택한다", () => {
    const board = createReversiBoard();
    // 도메인 순서(y→x): (3,2),(2,3),(5,4),(4,5).
    expect(chooseRandomReversiMove(board, "black", fixedRng(0))).toEqual({ x: 3, y: 2 });
    expect(chooseRandomReversiMove(board, "black", fixedRng(3))).toEqual({ x: 4, y: 5 });
  });

  it("합법 수가 하나도 없으면 throw 한다", () => {
    const board = emptyBoard();
    expect(legalReversiMoves(board, "black")).toHaveLength(0);
    expect(() => chooseRandomReversiMove(board, "black", fixedRng(0))).toThrow(
      /no legal moves/,
    );
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createReversiBoard(); // 흑 합법 수 4개
    expect(() => chooseRandomReversiMove(board, "black", fixedRng(4))).toThrow(
      /out-of-range/,
    );
  });

  it("RandomSource가 정수가 아닌 값을 주면 throw 한다", () => {
    const board = createReversiBoard();
    expect(() => chooseRandomReversiMove(board, "black", fixedRng(1.5))).toThrow(
      /out-of-range/,
    );
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    chooseRandomReversiMove(board, "black", fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
