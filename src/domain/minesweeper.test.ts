import { describe, it, expect } from "vitest";
import { createMinefield, revealCell, isWin, isLoss } from "./minesweeper";

describe("minesweeper createMinefield", () => {
  it("creates a rows×cols board, all cells unrevealed", () => {
    const board = createMinefield(4, 5, []);
    expect(board.length).toBe(4);
    expect(board.every((row) => row.length === 5)).toBe(true);
    expect(board.flat().every((cell) => !cell.revealed)).toBe(true);
    expect(board.flat().every((cell) => !cell.mine)).toBe(true);
  });

  it("places mines at the given coordinates", () => {
    const board = createMinefield(3, 3, [
      [0, 0],
      [2, 2],
    ]);
    expect(board[0]![0]!.mine).toBe(true);
    expect(board[2]![2]!.mine).toBe(true);
    expect(board[1]![1]!.mine).toBe(false);
  });

  it("computes adjacent mine counts (0~8) correctly", () => {
    // 가운데 칸을 둘러싼 8칸이 모두 지뢰 → 중앙 adjacent = 8.
    const mines: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
    const board = createMinefield(3, 3, mines);
    expect(board[1]![1]!.adjacent).toBe(8);
    // 모서리 칸(0,0)은 이웃 지뢰가 (0,1),(1,0) 2개 → 2.
    expect(board[0]![0]!.adjacent).toBe(2);
  });

  it("computes adjacent = 0 for a board with no mines", () => {
    const board = createMinefield(3, 3, []);
    expect(board.flat().every((cell) => cell.adjacent === 0)).toBe(true);
  });

  it("returns a fresh instance with no shared cells on each call", () => {
    const a = createMinefield(2, 2, []);
    const b = createMinefield(2, 2, []);
    a[0]![0]!.revealed = true;
    expect(b[0]![0]!.revealed).toBe(false);
  });

  it("returns an empty board for abnormal sizes", () => {
    expect(createMinefield(0, 5, [])).toEqual([]);
    expect(createMinefield(5, 0, [])).toEqual([]);
    expect(createMinefield(-1, 3, [])).toEqual([]);
    expect(createMinefield(2.5, 3, [])).toEqual([]);
  });

  it("safely ignores out-of-range and duplicate mine coordinates", () => {
    const board = createMinefield(2, 2, [
      [0, 0],
      [0, 0], // 중복 → 한 칸
      [5, 5], // 범위 밖 → 무시
      [-1, 0], // 범위 밖 → 무시
      [0.5, 1], // 비정수 → 무시
    ]);
    const mineCount = board.flat().filter((cell) => cell.mine).length;
    expect(mineCount).toBe(1);
    expect(board[0]![0]!.mine).toBe(true);
  });
});

describe("minesweeper revealCell", () => {
  it("reveals a single number cell without spreading", () => {
    // (0,1)에 지뢰 → (0,0)은 adjacent 1인 숫자 칸.
    const board = createMinefield(1, 3, [[0, 1]]);
    const next = revealCell(board, 0, 0);
    expect(next[0]![0]!.revealed).toBe(true);
    expect(next[0]![1]!.revealed).toBe(false);
    expect(next[0]![2]!.revealed).toBe(false);
  });

  it("reveals only the mine cell when a mine is opened (loss)", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    const next = revealCell(board, 0, 0);
    expect(next[0]![0]!.revealed).toBe(true);
    expect(isLoss(next)).toBe(true);
    // 다른 칸은 그대로 미공개.
    expect(next[0]![1]!.revealed).toBe(false);
  });

  it("flood-fills empty (adjacent 0) cells and stops at number cells / borders", () => {
    // 5×5, 지뢰 1개 (4,4). (0,0)을 열면 지뢰에서 먼 빈 영역이 연쇄로 열리고
    // 지뢰 인접 숫자 칸에서 멈춘다.
    const board = createMinefield(5, 5, [[4, 4]]);
    const next = revealCell(board, 0, 0);
    // 지뢰는 절대 열리지 않는다.
    expect(next[4]![4]!.revealed).toBe(false);
    // 지뢰에서 멀리 떨어진 빈 칸은 열린다.
    expect(next[0]![0]!.revealed).toBe(true);
    expect(next[0]![4]!.revealed).toBe(true);
    expect(next[4]![0]!.revealed).toBe(true);
    // 지뢰 인접 숫자 칸(3,3 adjacent=1)도 연쇄 경계로서 열린다.
    expect(next[3]![3]!.revealed).toBe(true);
    expect(next[3]![3]!.adjacent).toBe(1);
  });

  it("does not mutate the input board", () => {
    const board = createMinefield(3, 3, []);
    const snapshot = JSON.stringify(board);
    revealCell(board, 1, 1);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("returns the board unchanged for out-of-range coordinates", () => {
    const board = createMinefield(2, 2, []);
    expect(revealCell(board, 5, 5)).toEqual(board);
    expect(revealCell(board, -1, 0)).toEqual(board);
    expect(revealCell(board, 0.5, 0)).toEqual(board);
  });

  it("returns the board unchanged when the cell is already revealed", () => {
    const board = createMinefield(1, 3, [[0, 1]]);
    const once = revealCell(board, 0, 0);
    const twice = revealCell(once, 0, 0);
    expect(twice).toEqual(once);
  });

  it("safely handles an empty board", () => {
    expect(revealCell([], 0, 0)).toEqual([]);
  });
});

describe("minesweeper isWin", () => {
  it("is true when every non-mine cell is revealed", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    // 지뢰(0,0)를 제외한 세 칸(모두 adjacent=1 숫자 칸)을 연다.
    const onlyNonMine = revealCell(revealCell(revealCell(board, 0, 1), 1, 0), 1, 1);
    expect(isWin(onlyNonMine)).toBe(true);
    expect(isLoss(onlyNonMine)).toBe(false);
  });

  it("is false when some non-mine cell is still hidden", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    const next = revealCell(board, 0, 1);
    expect(isWin(next)).toBe(false);
  });

  it("is false for an empty board", () => {
    expect(isWin([])).toBe(false);
    expect(isWin(createMinefield(0, 0, []))).toBe(false);
  });
});

describe("minesweeper isLoss", () => {
  it("is true when a mine cell is revealed", () => {
    const board = createMinefield(2, 2, [[1, 1]]);
    const next = revealCell(board, 1, 1);
    expect(isLoss(next)).toBe(true);
  });

  it("is false when no mine is revealed", () => {
    const board = createMinefield(2, 2, [[1, 1]]);
    const next = revealCell(board, 0, 0);
    expect(isLoss(next)).toBe(false);
  });

  it("is false for an empty board", () => {
    expect(isLoss([])).toBe(false);
  });
});
