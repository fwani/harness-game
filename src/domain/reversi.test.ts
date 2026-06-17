import { describe, it, expect } from "vitest";
import {
  applyReversiMove,
  createReversiBoard,
  flipsForMove,
  isLegalReversiMove,
  type Board,
  type Stone,
} from "./reversi";

/** 8×8 빈 보드를 만든다. */
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

/** (x,y) 좌표쌍을 정렬 가능한 문자열로 직렬화한다. */
function asKeys(coords: ReadonlyArray<[number, number]>): string[] {
  return coords.map(([x, y]) => `${x},${y}`);
}

describe("reversi createReversiBoard", () => {
  it("creates an 8×8 board", () => {
    const board = createReversiBoard();
    expect(board.length).toBe(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
  });

  it("places exactly the 4 central discs with correct colors", () => {
    const board = createReversiBoard();
    expect(board[3]![3]).toBe("white");
    expect(board[4]![4]).toBe("white");
    expect(board[3]![4]).toBe("black");
    expect(board[4]![3]).toBe("black");
    // 정확히 4개만 배치되고 나머지는 null.
    const occupied = board.flat().filter((cell) => cell !== null);
    expect(occupied.length).toBe(4);
  });

  it("returns a fresh instance on each call", () => {
    const a = createReversiBoard();
    const b = createReversiBoard();
    expect(a).not.toBe(b);
    a[0]![0] = "black";
    expect(b[0]![0]).toBeNull();
  });
});

describe("reversi flipsForMove", () => {
  it("returns the single flip for each of black's 4 opening moves", () => {
    const board = createReversiBoard();
    const opening: Array<{ move: [number, number]; flip: [number, number] }> = [
      { move: [3, 2], flip: [3, 3] },
      { move: [2, 3], flip: [3, 3] },
      { move: [5, 4], flip: [4, 4] },
      { move: [4, 5], flip: [4, 4] },
    ];
    for (const { move, flip } of opening) {
      const flips = flipsForMove(board, move[0], move[1], "black");
      expect(flips).toEqual([flip]);
    }
  });

  it("flips multiple opponent discs in a row", () => {
    // y=3 행: x=1 black, x=2..4 white, x=5 빈칸. black이 (5,3)에 두면 (2,3)(3,3)(4,3) 뒤집힘.
    const board = emptyBoard();
    board[3]![1] = "black";
    board[3]![2] = "white";
    board[3]![3] = "white";
    board[3]![4] = "white";
    const flips = flipsForMove(board, 5, 3, "black");
    expect(asKeys(flips)).toEqual(["2,3", "3,3", "4,3"]);
  });

  it("returns sorted coordinates (y asc, then x asc) across directions", () => {
    // 중앙(4,4)에 black을 두고 가로/세로/대각으로 각각 white 1개 + black 종결을 둔다.
    const board = emptyBoard();
    // 가로(왼쪽): (3,4)=white, (2,4)=black
    board[4]![3] = "white";
    board[4]![2] = "black";
    // 세로(위): (4,3)=white, (4,2)=black
    board[3]![4] = "white";
    board[2]![4] = "black";
    // 대각(좌상): (3,3)=white, (2,2)=black
    board[3]![3] = "white";
    board[2]![2] = "black";
    const flips = flipsForMove(board, 4, 4, "black");
    expect(asKeys(flips)).toEqual(["3,3", "4,3", "3,4"]);
  });

  it("returns empty when the run is not capped by own disc (board edge / empty)", () => {
    // (0,0) black, (1,0) white, (2,0) 빈칸 → white로 끝나 막히지 않음.
    const board = emptyBoard();
    board[0]![1] = "white";
    const noCap = flipsForMove(board, 0, 0, "black");
    expect(noCap).toEqual([]);
    // 상대 디스크가 보드 끝까지 이어져 막을 내 디스크가 없는 경우.
    const edge = emptyBoard();
    edge[0]![6] = "white";
    edge[0]![7] = "white";
    expect(flipsForMove(edge, 5, 0, "black")).toEqual([]);
  });

  it("returns empty for an occupied target cell", () => {
    const board = createReversiBoard();
    expect(flipsForMove(board, 3, 3, "black")).toEqual([]);
  });

  it("does not mutate the input board", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    flipsForMove(board, 3, 2, "black");
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("throws on out-of-bounds or non-integer coordinates (consistent contract)", () => {
    const board = createReversiBoard();
    expect(() => flipsForMove(board, -1, 0, "black")).toThrow();
    expect(() => flipsForMove(board, 8, 0, "black")).toThrow();
    expect(() => flipsForMove(board, 0, 8, "black")).toThrow();
    expect(() => flipsForMove(board, 1.5, 0, "black")).toThrow();
  });
});

describe("reversi isLegalReversiMove", () => {
  it("recognizes legal opening moves and rejects non-flipping cells", () => {
    const board = createReversiBoard();
    const legal: Array<[number, number]> = [
      [3, 2],
      [2, 3],
      [5, 4],
      [4, 5],
    ];
    for (const [x, y] of legal) {
      expect(isLegalReversiMove(board, x, y, "black")).toBe(true);
    }
    // 빈 칸이지만 뒤집힘이 없는 자리.
    expect(isLegalReversiMove(board, 0, 0, "black")).toBe(false);
    // 이미 점유된 칸.
    expect(isLegalReversiMove(board, 3, 3, "black")).toBe(false);
  });

  it("shares the throwing contract for invalid coordinates", () => {
    const board = createReversiBoard();
    expect(() => isLegalReversiMove(board, -1, 0, "white")).toThrow();
    expect(() => isLegalReversiMove(board, 0, 2.2, "white")).toThrow();
  });
});

describe("reversi applyReversiMove", () => {
  it("places the stone and flips captured discs on the standard opening", () => {
    const board = createReversiBoard();
    // 흑이 (3,2)에 두면 사이의 (3,3) white가 뒤집힌다.
    const next = applyReversiMove(board, 3, 2, "black");
    expect(next[2]![3]).toBe("black"); // 놓은 자리
    expect(next[3]![3]).toBe("black"); // 뒤집힌 자리
    // 디스크 총수는 +1 (놓은 1개만 새로 추가; 뒤집힘은 색 전환이라 총수를 늘리지 않음).
    const before = board.flat().filter((cell) => cell !== null).length;
    const after = next.flat().filter((cell) => cell !== null).length;
    expect(after).toBe(before + 1);
    // 흑 디스크는 +2 (놓은 1 + 뒤집힌 1).
    const blackBefore = board.flat().filter((cell) => cell === "black").length;
    const blackAfter = next.flat().filter((cell) => cell === "black").length;
    expect(blackAfter).toBe(blackBefore + 2);
  });

  it("returns a new board and does not mutate the input", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    const next = applyReversiMove(board, 3, 2, "black");
    expect(next).not.toBe(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("flips multiple discs across a run", () => {
    // y=3 행: x=1 black, x=2..4 white. black이 (5,3)에 두면 (2,3)(3,3)(4,3) 모두 흑이 된다.
    const board = emptyBoard();
    board[3]![1] = "black";
    board[3]![2] = "white";
    board[3]![3] = "white";
    board[3]![4] = "white";
    const next = applyReversiMove(board, 5, 3, "black");
    expect(next[3]![2]).toBe("black");
    expect(next[3]![3]).toBe("black");
    expect(next[3]![4]).toBe("black");
    expect(next[3]![5]).toBe("black");
  });

  it("throws on an illegal move (no flips)", () => {
    const board = createReversiBoard();
    expect(() => applyReversiMove(board, 0, 0, "black")).toThrow();
    // 이미 점유된 칸.
    expect(() => applyReversiMove(board, 3, 3, "black")).toThrow();
  });

  it("throws on out-of-bounds or non-integer coordinates (consistent contract)", () => {
    const board = createReversiBoard();
    expect(() => applyReversiMove(board, -1, 0, "black")).toThrow();
    expect(() => applyReversiMove(board, 8, 0, "black")).toThrow();
    expect(() => applyReversiMove(board, 1.5, 0, "black")).toThrow();
  });
});

// 타입이 ./gomoku에서 재사용됨을 컴파일 타임에 보장.
const _stone: Stone = "black";
void _stone;
