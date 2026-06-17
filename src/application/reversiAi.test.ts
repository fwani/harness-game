import { describe, it, expect } from "vitest";
import { chooseRandomReversiMove } from "./reversiAi";
import { legalReversiMoves } from "../domain/reversiMoves";
import { createReversiBoard, type Board, type Stone } from "../domain/reversi";
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

/** 테스트 헬퍼: 빈 8×8 보드에 좌표 목록을 직접 배치한다. */
function setup(stones: Array<[number, number, Stone]>): Board {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );
  for (const [x, y, stone] of stones) {
    board[y]![x] = stone;
  }
  return board;
}

describe("chooseRandomReversiMove", () => {
  it("표준 초기 보드에서 흑의 합법 수는 4개다", () => {
    const board = createReversiBoard();
    expect(legalReversiMoves(board, "black")).toHaveLength(4);
  });

  it("선택 결과는 항상 legalReversiMoves 후보 안에 있고 주입 인덱스로 결정적으로 고른다", () => {
    const board = createReversiBoard();
    const legal = legalReversiMoves(board, "black");
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseRandomReversiMove(board, "black", fixedRng(i));
      expect(legal).toContainEqual(move);
      expect(move).toEqual(legal[i]);
    }
  });

  it("합법 수가 하나도 없으면 throw 한다", () => {
    // 디스크가 한 줄 뿐이면 어떤 빈 칸도 뒤집힘을 만들 수 없다(흑 합법 수 0개).
    const board = setup([[0, 0, "black"]]);
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

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    chooseRandomReversiMove(board, "black", fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
