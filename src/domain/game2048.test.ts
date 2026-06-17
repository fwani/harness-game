import { describe, it, expect } from "vitest";
import {
  createBoard,
  slideLine,
  applyMove,
  canMove,
  hasReachedTarget,
  BOARD_SIZE,
  DEFAULT_TARGET,
  type Board,
} from "./game2048";

describe("game2048 createBoard", () => {
  it("creates an empty 4×4 board of zeros", () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_SIZE);
    expect(board.every((row) => row.length === BOARD_SIZE)).toBe(true);
    expect(board.every((row) => row.every((tile) => tile === 0))).toBe(true);
  });

  it("returns a fresh independent instance each call", () => {
    const a = createBoard();
    const b = createBoard();
    expect(a).not.toBe(b);
    a[0]![0] = 2;
    expect(b[0]![0]).toBe(0); // 한 보드 변경이 다른 보드에 영향 없음
  });
});

describe("game2048 slideLine", () => {
  it("compacts non-zero tiles toward the left", () => {
    expect(slideLine([0, 2, 0, 4])).toEqual({ line: [2, 4, 0, 0], gained: 0 });
  });

  it("merges a single adjacent equal pair", () => {
    expect(slideLine([2, 2, 0, 0])).toEqual({ line: [4, 0, 0, 0], gained: 4 });
  });

  it("merges each tile at most once per slide ([2,2,2,2] → [4,4])", () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8 });
  });

  it("leaves a leftover tile unmerged ([2,2,2] → [4,2])", () => {
    expect(slideLine([2, 2, 2])).toEqual({ line: [4, 2, 0], gained: 4 });
  });

  it("sums all merges gained in one line", () => {
    expect(slideLine([4, 4, 2, 2])).toEqual({ line: [8, 4, 0, 0], gained: 12 });
  });

  it("does not merge unequal neighbors", () => {
    expect(slideLine([2, 4, 8, 16])).toEqual({ line: [2, 4, 8, 16], gained: 0 });
  });

  it("does not mutate the input line", () => {
    const input = [2, 2, 0, 0];
    slideLine(input);
    expect(input).toEqual([2, 2, 0, 0]);
  });

  it("handles an all-zero line", () => {
    expect(slideLine([0, 0, 0, 0])).toEqual({ line: [0, 0, 0, 0], gained: 0 });
  });
});

describe("game2048 applyMove", () => {
  const board: Board = [
    [2, 2, 0, 0],
    [0, 4, 4, 0],
    [0, 0, 0, 0],
    [8, 0, 0, 8],
  ];

  it("slides and merges left", () => {
    const result = applyMove(board, "left");
    expect(result.board).toEqual([
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [0, 0, 0, 0],
      [16, 0, 0, 0],
    ]);
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(4 + 8 + 16);
  });

  it("slides and merges right", () => {
    const result = applyMove(board, "right");
    expect(result.board).toEqual([
      [0, 0, 0, 4],
      [0, 0, 0, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 16],
    ]);
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(4 + 8 + 16);
  });

  it("slides and merges up", () => {
    const result = applyMove(
      [
        [2, 0, 0, 0],
        [2, 4, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
      ],
      "up",
    );
    expect(result.board).toEqual([
      [4, 8, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(4 + 8);
  });

  it("slides and merges down", () => {
    const result = applyMove(
      [
        [2, 0, 0, 0],
        [2, 4, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
      ],
      "down",
    );
    expect(result.board).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 8, 0, 0],
    ]);
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(4 + 8);
  });

  it("reports moved=false and gained=0 when nothing changes", () => {
    const settled: Board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = applyMove(settled, "left");
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toEqual(settled);
  });

  it("does not mutate the input board", () => {
    const input: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const snapshot = input.map((row) => [...row]);
    applyMove(input, "left");
    expect(input).toEqual(snapshot);
  });

  it("safely handles an empty board", () => {
    const result = applyMove([], "left");
    expect(result).toEqual({ board: [], moved: false, gained: 0 });
  });
});

describe("game2048 canMove", () => {
  it("returns true when an empty cell exists", () => {
    const board = createBoard();
    board[0]![0] = 2;
    expect(canMove(board)).toBe(true);
  });

  it("returns true when a horizontal merge is possible on a full board", () => {
    const board: Board = [
      [2, 2, 4, 8],
      [4, 8, 16, 32],
      [2, 4, 8, 16],
      [4, 8, 16, 32],
    ];
    expect(canMove(board)).toBe(true);
  });

  it("returns true when a vertical merge is possible on a full board", () => {
    const board: Board = [
      [2, 4, 8, 16],
      [2, 8, 16, 32],
      [4, 16, 32, 64],
      [8, 32, 64, 128],
    ];
    expect(canMove(board)).toBe(true);
  });

  it("returns false on a full board with no adjacent equal pair (game over)", () => {
    const board: Board = [
      [2, 4, 8, 16],
      [4, 2, 16, 8],
      [2, 4, 8, 16],
      [4, 2, 16, 8],
    ];
    expect(canMove(board)).toBe(false);
  });

  it("returns false for an empty board", () => {
    expect(canMove([])).toBe(false);
  });
});

describe("game2048 hasReachedTarget", () => {
  it("returns true when a tile reaches the default target", () => {
    const board = createBoard();
    board[1]![2] = DEFAULT_TARGET;
    expect(hasReachedTarget(board)).toBe(true);
  });

  it("returns true when a tile exceeds the target", () => {
    const board = createBoard();
    board[0]![0] = 4096;
    expect(hasReachedTarget(board)).toBe(true);
  });

  it("returns false when no tile reaches the target", () => {
    const board: Board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(hasReachedTarget(board)).toBe(false);
  });

  it("supports a custom target", () => {
    const board = createBoard();
    board[0]![0] = 64;
    expect(hasReachedTarget(board, 64)).toBe(true);
    expect(hasReachedTarget(board, 128)).toBe(false);
  });

  it("returns false for a non-positive target", () => {
    const board = createBoard();
    board[0]![0] = 2;
    expect(hasReachedTarget(board, 0)).toBe(false);
  });
});
