import { describe, it, expect } from "vitest";
import { chooseRandomGoMove } from "./goAi";
import { legalGoMoves } from "../domain/goMoves";
import { createBoard, type Board, type Stone } from "../domain/go";
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

/** 테스트 헬퍼: 빈 보드에 좌표 목록을 직접 배치한다(포획 없이 국면을 그대로 구성). */
function setup(size: number, stones: Array<[number, number, Stone]>): Board {
  const board = createBoard(size);
  for (const [x, y, stone] of stones) {
    board[y]![x] = stone;
  }
  return board;
}

describe("chooseRandomGoMove", () => {
  it("합법 수가 여러 개일 때 주입한 인덱스로 결정적으로 고른다", () => {
    const board = createBoard(3);
    // 합법 수는 legalGoMoves와 동일한 y→x 순서 — index 0 은 (0,0).
    expect(chooseRandomGoMove(board, "black", fixedRng(0))).toEqual({ x: 0, y: 0 });
    // index 4 -> 다섯 번째 합법 수 (1,1).
    expect(chooseRandomGoMove(board, "black", fixedRng(4))).toEqual({ x: 1, y: 1 });
    // index 8 -> 마지막 합법 수 (2,2).
    expect(chooseRandomGoMove(board, "black", fixedRng(8))).toEqual({ x: 2, y: 2 });
  });

  it("선택 결과는 항상 legalGoMoves 후보 안에 있다", () => {
    const board = setup(3, [[0, 0, "black"], [1, 1, "white"]]);
    const legal = legalGoMoves(board, "black");
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseRandomGoMove(board, "black", fixedRng(i));
      expect(legal).toContainEqual(move);
      expect(move).toEqual(legal[i]);
    }
  });

  // 전형적인 패(ko) 모양(goMoves.test.ts와 동일 구성).
  const BLACK_RING: Array<[number, number, Stone]> = [
    [2, 1, "black"],
    [2, 3, "black"],
    [1, 2, "black"],
  ];
  const WHITE_RING: Array<[number, number, Stone]> = [
    [3, 1, "white"],
    [3, 3, "white"],
    [4, 2, "white"],
  ];
  // 직전 국면: a=(2,2)에 백, b=(3,2)는 빈 칸.
  function previousState(): Board {
    return setup(5, [...BLACK_RING, ...WHITE_RING, [2, 2, "white"]]);
  }
  // 현재 국면: b=(3,2)에 흑, a=(2,2)는 빈 칸. 흑이 백 한 점을 따낸 직후.
  function currentState(): Board {
    return setup(5, [...BLACK_RING, ...WHITE_RING, [3, 2, "black"]]);
  }

  it("previousBoard를 넘기면 패(ko) 금지 지점은 후보에서 제외되어 선택되지 않는다", () => {
    const board = currentState();
    const prev = previousState();
    // 패 검사를 적용한 합법 수 목록 안에서만 선택된다.
    const legal = legalGoMoves(board, "white", prev);
    expect(legal).not.toContainEqual({ x: 2, y: 2 });
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseRandomGoMove(board, "white", fixedRng(i), prev);
      expect(move).not.toEqual({ x: 2, y: 2 });
      expect(move).toEqual(legal[i]);
    }
  });

  it("합법 수가 하나도 없으면 throw 한다", () => {
    // 가득 찬 2×2 보드: 빈 칸이 없다.
    const board = setup(2, [
      [0, 0, "black"],
      [1, 0, "white"],
      [0, 1, "white"],
      [1, 1, "black"],
    ]);
    expect(() => chooseRandomGoMove(board, "black", fixedRng(0))).toThrow(/no legal moves/);
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createBoard(3); // 9개 합법 수
    expect(() => chooseRandomGoMove(board, "black", fixedRng(9))).toThrow(/out-of-range/);
  });

  it("입력 board / previousBoard를 변형하지 않는다(불변)", () => {
    const board = currentState();
    const prev = previousState();
    const boardSnapshot = JSON.stringify(board);
    const prevSnapshot = JSON.stringify(prev);
    chooseRandomGoMove(board, "white", fixedRng(0), prev);
    expect(JSON.stringify(board)).toBe(boardSnapshot);
    expect(JSON.stringify(prev)).toBe(prevSnapshot);
  });
});
