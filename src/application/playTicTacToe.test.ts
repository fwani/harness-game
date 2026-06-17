import { describe, it, expect } from "vitest";
import {
  chooseRandomTicTacToeMove,
  legalTicTacToeMoves,
  playTicTacToeMove,
} from "./playTicTacToe";
import { createTicTacToeBoard, type Board } from "../domain/ticTacToe";
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

/** row-major 행 문자열 배열을 보드로 만든다(상단 → 하단). '.'=null, 'X'/'O'=Mark. */
function boardFrom(rows: string[]): Board {
  return rows.map(
    (line) => [...line].map((ch) => (ch === "X" ? "X" : ch === "O" ? "O" : null)) as Board[number],
  );
}

describe("legalTicTacToeMoves", () => {
  it("빈 보드는 9칸을 행 우선으로 모두 반환한다", () => {
    const board = createTicTacToeBoard();
    const moves = legalTicTacToeMoves(board);
    expect(moves).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it("빈 칸만 행 우선으로 반환한다(점유 칸 제외)", () => {
    const board = boardFrom([
      "X.O",
      ".X.",
      "O.X",
    ]);
    expect(legalTicTacToeMoves(board)).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ]);
  });

  it("가득 찬 보드는 빈 배열을 반환한다", () => {
    const board = boardFrom([
      "XOX",
      "XOO",
      "OXX",
    ]);
    expect(legalTicTacToeMoves(board)).toEqual([]);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createTicTacToeBoard();
    const snapshot = JSON.stringify(board);
    legalTicTacToeMoves(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("chooseRandomTicTacToeMove", () => {
  it("주입 인덱스로 합법 수를 결정적으로 고른다", () => {
    const board = createTicTacToeBoard();
    const moves = legalTicTacToeMoves(board);
    for (let i = 0; i < moves.length; i += 1) {
      expect(chooseRandomTicTacToeMove(board, fixedRng(i))).toEqual(moves[i]);
    }
  });

  it("선택 결과는 항상 빈 칸(합법 수)에만 속한다", () => {
    const board = boardFrom([
      "X.O",
      ".X.",
      "O.X",
    ]);
    const moves = legalTicTacToeMoves(board);
    for (let i = 0; i < moves.length; i += 1) {
      expect(chooseRandomTicTacToeMove(board, fixedRng(i))).toEqual(moves[i]);
    }
  });

  it("합법 수가 없으면(가득 찬 보드) null을 반환한다", () => {
    const board = boardFrom([
      "XOX",
      "XOO",
      "OXX",
    ]);
    expect(chooseRandomTicTacToeMove(board, fixedRng(0))).toBeNull();
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createTicTacToeBoard(); // 합법 수 9개
    expect(() => chooseRandomTicTacToeMove(board, fixedRng(9))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createTicTacToeBoard();
    const snapshot = JSON.stringify(board);
    chooseRandomTicTacToeMove(board, fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("playTicTacToeMove", () => {
  it("착수 후 보드에 반영하고 입력 board를 변형하지 않는다(불변)", () => {
    const board = createTicTacToeBoard();
    const snapshot = JSON.stringify(board);
    const result = playTicTacToeMove(board, 1, 1, "X");
    expect(JSON.stringify(board)).toBe(snapshot); // 입력 불변
    expect(result.board[1]![1]).toBe("X");
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(false);
    expect(result.over).toBe(false);
  });

  it("가로 승리 라인을 감지한다", () => {
    const board = boardFrom([
      "XX.",
      "OO.",
      "...",
    ]);
    const result = playTicTacToeMove(board, 0, 2, "X");
    expect(result.winner).toBe("X");
    expect(result.over).toBe(true);
    expect(result.draw).toBe(false);
  });

  it("세로 승리 라인을 감지한다", () => {
    const board = boardFrom([
      "O..",
      "OX.",
      ".X.",
    ]);
    const result = playTicTacToeMove(board, 0, 1, "X");
    expect(result.winner).toBe("X");
    expect(result.over).toBe(true);
  });

  it("대각 승리 라인을 감지한다", () => {
    const board = boardFrom([
      "X.O",
      "OX.",
      "...",
    ]);
    const result = playTicTacToeMove(board, 2, 2, "X");
    expect(result.winner).toBe("X");
    expect(result.over).toBe(true);
  });

  it("마지막 한 칸을 채워 가득 차고 승자가 없으면 draw=true, over=true", () => {
    // (2,2)만 비운 보드(승자 없음)를 채워 무승부 완성.
    const board = boardFrom([
      "XOX",
      "XOO",
      "OX.",
    ]);
    const result = playTicTacToeMove(board, 2, 2, "X");
    expect(result.board[2]![2]).toBe("X");
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(true);
    expect(result.over).toBe(true);
  });

  it("이미 점유한 칸에 두면 도메인 throw를 그대로 전파한다", () => {
    const board = boardFrom([
      "X..",
      "...",
      "...",
    ]);
    expect(() => playTicTacToeMove(board, 0, 0, "O")).toThrow(/occupied/);
  });

  it("범위 밖 좌표에 두면 도메인 throw를 그대로 전파한다", () => {
    const board = createTicTacToeBoard();
    expect(() => playTicTacToeMove(board, 3, 0, "X")).toThrow(/out of bounds/);
    expect(() => playTicTacToeMove(board, -1, 0, "X")).toThrow(/out of bounds/);
  });
});
