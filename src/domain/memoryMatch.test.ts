import { describe, it, expect } from "vitest";
import {
  createMemoryBoard,
  faceUpIndices,
  flipUp,
  resolveFlips,
  countMatchedPairs,
  isMemoryGameOver,
  type MemoryBoard,
} from "./memoryMatch";

describe("memoryMatch createMemoryBoard", () => {
  it("creates 2*pairCount cards, all down, each value exactly twice", () => {
    const board = createMemoryBoard(3);
    expect(board.length).toBe(6);
    expect(board.every((card) => card.status === "down")).toBe(true);
    for (let value = 0; value < 3; value++) {
      expect(board.filter((card) => card.value === value).length).toBe(2);
    }
  });

  it("orders values deterministically as [0,0,1,1,...]", () => {
    const board = createMemoryBoard(2);
    expect(board.map((card) => card.value)).toEqual([0, 0, 1, 1]);
  });

  it("returns a fresh instance each call", () => {
    expect(createMemoryBoard(1)).not.toBe(createMemoryBoard(1));
  });

  it("throws on pairCount < 1 or non-integer", () => {
    expect(() => createMemoryBoard(0)).toThrow();
    expect(() => createMemoryBoard(-2)).toThrow();
    expect(() => createMemoryBoard(1.5)).toThrow();
    expect(() => createMemoryBoard(Number.NaN)).toThrow();
  });
});

describe("memoryMatch flipUp / faceUpIndices", () => {
  it("flips a down card to up and returns a new board (original unchanged)", () => {
    const board = createMemoryBoard(2);
    const next = flipUp(board, 0);
    expect(next).not.toBe(board);
    expect(next[0]!.status).toBe("up");
    expect(board[0]!.status).toBe("down"); // 원본 불변
  });

  it("faceUpIndices returns 0, 1, or 2 indices accurately", () => {
    const board = createMemoryBoard(3);
    expect(faceUpIndices(board)).toEqual([]);
    const one = flipUp(board, 0);
    expect(faceUpIndices(one)).toEqual([0]);
    const two = flipUp(one, 3);
    expect(faceUpIndices(two)).toEqual([0, 3]);
  });

  it("throws on out-of-range or non-integer index", () => {
    const board = createMemoryBoard(2);
    expect(() => flipUp(board, -1)).toThrow();
    expect(() => flipUp(board, 4)).toThrow();
    expect(() => flipUp(board, 1.5)).toThrow();
  });

  it("throws when card is already up or matched", () => {
    const board = flipUp(createMemoryBoard(2), 0);
    expect(() => flipUp(board, 0)).toThrow();
    const { board: matched } = resolveFlips(flipUp(board, 1));
    expect(() => flipUp(matched, 0)).toThrow();
  });

  it("throws when two cards are already up", () => {
    let board = createMemoryBoard(3);
    board = flipUp(board, 0);
    board = flipUp(board, 1);
    expect(() => flipUp(board, 2)).toThrow();
  });
});

describe("memoryMatch resolveFlips", () => {
  it("marks both matched when values are equal (matched:true)", () => {
    let board = createMemoryBoard(2); // [0,0,1,1]
    board = flipUp(board, 0);
    board = flipUp(board, 1); // 두 카드 모두 value 0
    const result = resolveFlips(board);
    expect(result.matched).toBe(true);
    expect(result.board[0]!.status).toBe("matched");
    expect(result.board[1]!.status).toBe("matched");
    expect(board[0]!.status).toBe("up"); // 원본 불변
  });

  it("returns both to down when values differ (matched:false)", () => {
    let board = createMemoryBoard(2); // [0,0,1,1]
    board = flipUp(board, 0); // value 0
    board = flipUp(board, 2); // value 1
    const result = resolveFlips(board);
    expect(result.matched).toBe(false);
    expect(result.board[0]!.status).toBe("down");
    expect(result.board[2]!.status).toBe("down");
    expect(board[0]!.status).toBe("up"); // 원본 불변
  });

  it("throws when not exactly two cards are up", () => {
    const empty = createMemoryBoard(2);
    expect(() => resolveFlips(empty)).toThrow();
    expect(() => resolveFlips(flipUp(empty, 0))).toThrow();
  });
});

describe("memoryMatch countMatchedPairs / isMemoryGameOver", () => {
  it("is false / 0 during play", () => {
    const board = createMemoryBoard(2);
    expect(countMatchedPairs(board)).toBe(0);
    expect(isMemoryGameOver(board)).toBe(false);
  });

  // value [0,0,1,1] 순서를 이용한 짧은 결정적 시퀀스로 끝까지 푼다.
  it("solves a board end-to-end via a deterministic sequence", () => {
    let board: MemoryBoard = createMemoryBoard(2); // [0,0,1,1]

    // 첫 짝: 인덱스 0,1 (둘 다 value 0)
    board = flipUp(board, 0);
    board = flipUp(board, 1);
    let r = resolveFlips(board);
    expect(r.matched).toBe(true);
    board = r.board;
    expect(countMatchedPairs(board)).toBe(1);
    expect(isMemoryGameOver(board)).toBe(false);

    // 둘째 짝: 인덱스 2,3 (둘 다 value 1)
    board = flipUp(board, 2);
    board = flipUp(board, 3);
    r = resolveFlips(board);
    expect(r.matched).toBe(true);
    board = r.board;

    expect(countMatchedPairs(board)).toBe(2);
    expect(isMemoryGameOver(board)).toBe(true);
  });

  it("counts a single completed pair while another stays down", () => {
    let board = createMemoryBoard(2);
    board = flipUp(board, 0);
    board = flipUp(board, 1);
    board = resolveFlips(board).board;
    expect(countMatchedPairs(board)).toBe(1);
    expect(isMemoryGameOver(board)).toBe(false);
  });
});
