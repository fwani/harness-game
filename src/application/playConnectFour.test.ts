import { describe, it, expect } from "vitest";
import {
  chooseRandomConnectFourColumn,
  playConnectFourMove,
} from "./playConnectFour";
import {
  createConnectFourBoard,
  findConnectFourWinner,
  legalColumns,
  type Board,
} from "../domain/connectFour";
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

/** row-major 행 문자열 배열을 보드로 만든다(상단 → 하단). '.'=0, '1'/'2'=Player. */
function boardFrom(rows: string[]): Board {
  return rows.map(
    (line) => [...line].map((ch) => (ch === "1" ? 1 : ch === "2" ? 2 : 0)) as Board[number],
  );
}

describe("chooseRandomConnectFourColumn", () => {
  it("빈 보드의 합법 열은 7개이고, 주입 인덱스로 결정적으로 고른다", () => {
    const board = createConnectFourBoard();
    const cols = legalColumns(board);
    expect(cols).toHaveLength(7);
    for (let i = 0; i < cols.length; i += 1) {
      expect(chooseRandomConnectFourColumn(board, fixedRng(i))).toBe(cols[i]);
    }
  });

  it("선택 결과는 항상 합법 열에만 속한다(가득 찬 열은 제외)", () => {
    // 0,3,6열을 가득 채운다 → 합법 열은 1,2,4,5.
    const board = boardFrom([
      "1..1..1",
      "2..2..2",
      "1..1..1",
      "2..2..2",
      "1..1..1",
      "2..2..2",
    ]);
    const cols = legalColumns(board);
    expect(cols).toEqual([1, 2, 4, 5]);
    for (let i = 0; i < cols.length; i += 1) {
      expect(chooseRandomConnectFourColumn(board, fixedRng(i))).toBe(cols[i]);
    }
  });

  it("가득 찬 보드에서는 null을 반환한다", () => {
    const board = boardFrom([
      "1221221",
      "2112112",
      "1221221",
      "2112112",
      "1221221",
      "2112112",
    ]);
    expect(legalColumns(board)).toHaveLength(0);
    expect(chooseRandomConnectFourColumn(board, fixedRng(0))).toBeNull();
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createConnectFourBoard(); // 합법 열 7개
    expect(() => chooseRandomConnectFourColumn(board, fixedRng(7))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createConnectFourBoard();
    const snapshot = JSON.stringify(board);
    chooseRandomConnectFourColumn(board, fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("playConnectFourMove", () => {
  it("착수 후 보드를 반환하고 입력 board를 변형하지 않는다(불변)", () => {
    const board = createConnectFourBoard();
    const snapshot = JSON.stringify(board);
    const result = playConnectFourMove(board, 3, 1);
    expect(JSON.stringify(board)).toBe(snapshot); // 입력 불변
    expect(result.board[5]![3]).toBe(1); // 중력으로 바닥 행에 놓임
    expect(result.over).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(false);
  });

  it("가로 4목 승자를 감지한다", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "111....",
    ]);
    const result = playConnectFourMove(board, 3, 1);
    expect(result.winner).toBe(1);
    expect(result.over).toBe(true);
    expect(result.draw).toBe(false);
  });

  it("세로 4목 승자를 감지한다", () => {
    const board = boardFrom([
      ".......",
      ".......",
      "2......",
      "2......",
      "2......",
      ".......",
    ]);
    const result = playConnectFourMove(board, 0, 2);
    expect(result.winner).toBe(2);
    expect(result.over).toBe(true);
  });

  it("대각(↗) 4목 승자를 감지한다", () => {
    // 1이 (5,0),(4,1),(3,2)에 있고 col3에 떨어뜨리면 row2에 놓여 ↗ 대각 4목 완성.
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "..12...",
      ".122...",
      "1222...",
    ]);
    const result = playConnectFourMove(board, 3, 1);
    expect(result.board[2]![3]).toBe(1);
    expect(result.winner).toBe(1);
    expect(result.over).toBe(true);
  });

  it("무승부: 마지막 한 칸을 채워 가득 차고 승자가 없으면 draw=true, over=true", () => {
    // (5,0)만 비운 보드(승자 없음)를 채워 가득 채운다.
    const board = boardFrom([
      "1221221",
      "2112112",
      "1221221",
      "2112112",
      "1221221",
      ".112112",
    ]);
    expect(findConnectFourWinner(board)).toBeNull();
    const result = playConnectFourMove(board, 0, 2);
    expect(result.board[5]![0]).toBe(2);
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(true);
    expect(result.over).toBe(true);
  });

  it("가득 찬 열에 두면 throw 한다", () => {
    const board = boardFrom([
      "1......",
      "2......",
      "1......",
      "2......",
      "1......",
      "2......",
    ]);
    expect(() => playConnectFourMove(board, 0, 1)).toThrow(/illegal move/);
  });

  it("범위 밖 열에 두면 throw 한다", () => {
    const board = createConnectFourBoard();
    expect(() => playConnectFourMove(board, 7, 1)).toThrow(/illegal move/);
    expect(() => playConnectFourMove(board, -1, 1)).toThrow(/illegal move/);
  });
});
