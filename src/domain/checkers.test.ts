import { describe, it, expect } from "vitest";
import {
  applyCheckersMove,
  canJumpAgain,
  countCheckersPieces,
  createCheckersBoard,
  findCheckersWinner,
  hasAnyLegalMove,
  isDarkSquare,
  legalCheckersMoves,
  pieceAt,
  type CheckersBoard,
  type CheckersMove,
} from "./checkers";

/** 8×8 빈 보드를 만든다. */
function emptyBoard(): CheckersBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("checkers isDarkSquare", () => {
  it("identifies dark squares as (row+col) odd", () => {
    expect(isDarkSquare(0, 1)).toBe(true);
    expect(isDarkSquare(1, 0)).toBe(true);
    expect(isDarkSquare(7, 0)).toBe(true);
    expect(isDarkSquare(0, 7)).toBe(true);
  });

  it("identifies light squares as (row+col) even", () => {
    expect(isDarkSquare(0, 0)).toBe(false);
    expect(isDarkSquare(1, 1)).toBe(false);
    expect(isDarkSquare(7, 7)).toBe(false);
    expect(isDarkSquare(4, 2)).toBe(false);
  });
});

describe("checkers createCheckersBoard", () => {
  it("creates an 8×8 board", () => {
    const board = createCheckersBoard();
    expect(board.length).toBe(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
  });

  it("places exactly 12 pieces per color", () => {
    const board = createCheckersBoard();
    expect(countCheckersPieces(board, "light")).toBe(12);
    expect(countCheckersPieces(board, "dark")).toBe(12);
  });

  it("places light on the top 3 rows and dark on the bottom 3 rows", () => {
    const board = createCheckersBoard();
    for (let row = 0; row <= 2; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row]![col];
        if (isDarkSquare(row, col)) {
          expect(cell).toEqual({ color: "light", king: false });
        } else {
          expect(cell).toBeNull();
        }
      }
    }
    for (let row = 5; row <= 7; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row]![col];
        if (isDarkSquare(row, col)) {
          expect(cell).toEqual({ color: "dark", king: false });
        } else {
          expect(cell).toBeNull();
        }
      }
    }
  });

  it("leaves the two middle rows empty", () => {
    const board = createCheckersBoard();
    expect(board[3]!.every((cell) => cell === null)).toBe(true);
    expect(board[4]!.every((cell) => cell === null)).toBe(true);
  });

  it("places every piece on a dark square and none as a king", () => {
    const board = createCheckersBoard();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = pieceAt(board, row, col);
        if (cell !== null) {
          expect(isDarkSquare(row, col)).toBe(true);
          expect(cell.king).toBe(false);
        }
      }
    }
  });

  it("returns a fresh instance (and fresh piece objects) on each call", () => {
    const a = createCheckersBoard();
    const b = createCheckersBoard();
    expect(a).not.toBe(b);
    // 기물 객체도 공유하지 않는다.
    expect(a[0]![1]).not.toBe(b[0]![1]);
    // 한쪽 변경이 다른 쪽에 영향 없음.
    a[0]![1] = null;
    expect(b[0]![1]).toEqual({ color: "light", king: false });
    expect(countCheckersPieces(b, "light")).toBe(12);
  });
});

describe("checkers pieceAt", () => {
  it("returns the cell value for in-bounds coordinates", () => {
    const board = createCheckersBoard();
    expect(pieceAt(board, 0, 1)).toEqual({ color: "light", king: false });
    expect(pieceAt(board, 7, 0)).toEqual({ color: "dark", king: false });
    expect(pieceAt(board, 3, 0)).toBeNull();
    expect(pieceAt(board, 0, 0)).toBeNull();
  });

  it("returns null for out-of-bounds coordinates (negative or >=8)", () => {
    const board = createCheckersBoard();
    expect(pieceAt(board, -1, 0)).toBeNull();
    expect(pieceAt(board, 0, -1)).toBeNull();
    expect(pieceAt(board, 8, 0)).toBeNull();
    expect(pieceAt(board, 0, 8)).toBeNull();
    expect(pieceAt(board, 100, 100)).toBeNull();
  });
});

describe("checkers countCheckersPieces", () => {
  it("counts 0 on an empty board", () => {
    const board = emptyBoard();
    expect(countCheckersPieces(board, "dark")).toBe(0);
    expect(countCheckersPieces(board, "light")).toBe(0);
  });

  it("counts a partial board including kings", () => {
    const board = emptyBoard();
    board[0]![1] = { color: "dark", king: false };
    board[2]![3] = { color: "dark", king: true };
    board[5]![4] = { color: "light", king: false };
    expect(countCheckersPieces(board, "dark")).toBe(2);
    expect(countCheckersPieces(board, "light")).toBe(1);
  });
});

/** 점프(captured 있는) 수만 골라낸다. */
function jumpsOnly(moves: CheckersMove[]): CheckersMove[] {
  return moves.filter((m) => m.captured !== undefined);
}

describe("checkers legalCheckersMoves", () => {
  it("lists only forward simple moves for each color on the initial board (7 each, no jumps)", () => {
    const board = createCheckersBoard();
    const lightMoves = legalCheckersMoves(board, "light");
    const darkMoves = legalCheckersMoves(board, "dark");
    // 표준 오프닝: 각 색 7개의 단순 전진 이동, 점프 없음.
    expect(lightMoves).toHaveLength(7);
    expect(darkMoves).toHaveLength(7);
    expect(jumpsOnly(lightMoves)).toHaveLength(0);
    expect(jumpsOnly(darkMoves)).toHaveLength(0);
    // light는 아래(+1)로만, dark는 위(-1)로만 전진(man 후진 없음).
    expect(lightMoves.every((m) => m.to.row === m.from.row + 1)).toBe(true);
    expect(darkMoves.every((m) => m.to.row === m.from.row - 1)).toBe(true);
    // 모든 이동은 대각선 한 칸.
    expect(lightMoves.every((m) => Math.abs(m.to.col - m.from.col) === 1)).toBe(true);
  });

  it("does not allow a man to move backward", () => {
    const board = emptyBoard();
    board[4]![3] = { color: "light", king: false };
    const moves = legalCheckersMoves(board, "light");
    // light man은 +1(아래)로만: (5,2),(5,4) 두 수, 후진(row 3) 없음.
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.to.row === 5)).toBe(true);
  });

  it("returns only jump moves when a capture is available (forced capture)", () => {
    const board = emptyBoard();
    board[2]![1] = { color: "light", king: false }; // 점프 가능 기물
    board[3]![2] = { color: "dark", king: false }; // 포획 대상
    // (4,3)은 비어 있음 → 점프 착지 가능.
    board[2]![5] = { color: "light", king: false }; // 단순 이동만 가능한 다른 기물
    const moves = legalCheckersMoves(board, "light");
    expect(moves).toHaveLength(1);
    expect(moves[0]).toEqual({
      from: { row: 2, col: 1 },
      to: { row: 4, col: 3 },
      captured: { row: 3, col: 2 },
    });
  });

  it("lets a king move and jump in both directions", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "light", king: true };
    const moves = legalCheckersMoves(board, "light");
    // 전진/후진 4방향 대각선.
    expect(moves).toHaveLength(4);
    const targets = moves.map((m) => `${m.to.row},${m.to.col}`).sort();
    expect(targets).toEqual(["3,3", "3,5", "5,3", "5,5"]);

    // 후진 점프도 가능: 위쪽 대각선에 상대 기물.
    const jumpBoard = emptyBoard();
    jumpBoard[4]![4] = { color: "light", king: true };
    jumpBoard[3]![3] = { color: "dark", king: false }; // (2,2) 비어 있음
    const jumpMoves = legalCheckersMoves(jumpBoard, "light");
    expect(jumpMoves).toHaveLength(1);
    expect(jumpMoves[0]).toEqual({
      from: { row: 4, col: 4 },
      to: { row: 2, col: 2 },
      captured: { row: 3, col: 3 },
    });
  });
});

describe("checkers applyCheckersMove", () => {
  it("applies a simple move on a fresh board without mutating the input", () => {
    const board = emptyBoard();
    board[2]![1] = { color: "light", king: false };
    const move: CheckersMove = { from: { row: 2, col: 1 }, to: { row: 3, col: 2 } };
    const next = applyCheckersMove(board, move);
    expect(next).not.toBe(board);
    expect(pieceAt(next, 2, 1)).toBeNull();
    expect(pieceAt(next, 3, 2)).toEqual({ color: "light", king: false });
    // 입력 보드는 그대로.
    expect(pieceAt(board, 2, 1)).toEqual({ color: "light", king: false });
    expect(pieceAt(board, 3, 2)).toBeNull();
  });

  it("removes the captured piece on a jump", () => {
    const board = emptyBoard();
    board[2]![1] = { color: "light", king: false };
    board[3]![2] = { color: "dark", king: false };
    const move: CheckersMove = {
      from: { row: 2, col: 1 },
      to: { row: 4, col: 3 },
      captured: { row: 3, col: 2 },
    };
    const next = applyCheckersMove(board, move);
    expect(pieceAt(next, 2, 1)).toBeNull();
    expect(pieceAt(next, 3, 2)).toBeNull(); // 포획됨
    expect(pieceAt(next, 4, 3)).toEqual({ color: "light", king: false });
    expect(countCheckersPieces(next, "dark")).toBe(0);
    // 입력 불변.
    expect(pieceAt(board, 3, 2)).toEqual({ color: "dark", king: false });
  });

  it("promotes a light man reaching the last row to king", () => {
    const board = emptyBoard();
    board[6]![1] = { color: "light", king: false };
    const next = applyCheckersMove(board, { from: { row: 6, col: 1 }, to: { row: 7, col: 0 } });
    expect(pieceAt(next, 7, 0)).toEqual({ color: "light", king: true });
  });

  it("promotes a dark man reaching row 0 to king", () => {
    const board = emptyBoard();
    board[1]![2] = { color: "dark", king: false };
    const next = applyCheckersMove(board, { from: { row: 1, col: 2 }, to: { row: 0, col: 1 } });
    expect(pieceAt(next, 0, 1)).toEqual({ color: "dark", king: true });
  });

  it("does not promote a man that does not reach the last row", () => {
    const board = emptyBoard();
    board[5]![2] = { color: "light", king: false };
    const next = applyCheckersMove(board, { from: { row: 5, col: 2 }, to: { row: 6, col: 3 } });
    expect(pieceAt(next, 6, 3)).toEqual({ color: "light", king: false });
  });
});

describe("checkers canJumpAgain", () => {
  it("returns true when the piece can chain another jump", () => {
    const board = emptyBoard();
    // (4,3) light가 (5,4) dark를 (6,5)로 넘어 또 점프할 수 있는 상황.
    board[4]![3] = { color: "light", king: false };
    board[5]![4] = { color: "dark", king: false };
    expect(canJumpAgain(board, { row: 4, col: 3 })).toBe(true);
  });

  it("returns false when no further jump is available", () => {
    const board = emptyBoard();
    board[4]![3] = { color: "light", king: false };
    expect(canJumpAgain(board, { row: 4, col: 3 })).toBe(false);
  });

  it("returns false for an empty cell", () => {
    const board = emptyBoard();
    expect(canJumpAgain(board, { row: 0, col: 0 })).toBe(false);
  });
});

describe("checkers hasAnyLegalMove", () => {
  it("is true on the initial board for both colors", () => {
    const board = createCheckersBoard();
    expect(hasAnyLegalMove(board, "light")).toBe(true);
    expect(hasAnyLegalMove(board, "dark")).toBe(true);
  });

  it("is false when a color has no move", () => {
    const board = emptyBoard();
    board[7]![0] = { color: "light", king: false }; // 전진(+1) 불가, 갇힘
    expect(hasAnyLegalMove(board, "light")).toBe(false);
  });
});

describe("checkers findCheckersWinner", () => {
  it("declares light the winner when dark has no pieces", () => {
    const board = emptyBoard();
    board[3]![2] = { color: "light", king: false };
    expect(findCheckersWinner(board, "dark")).toBe("light");
    expect(findCheckersWinner(board, "light")).toBe("light");
  });

  it("declares dark the winner when light has no pieces", () => {
    const board = emptyBoard();
    board[3]![2] = { color: "dark", king: false };
    expect(findCheckersWinner(board, "light")).toBe("dark");
  });

  it("declares the opponent winner when the side to move is stalemated", () => {
    const board = emptyBoard();
    board[7]![0] = { color: "light", king: false }; // light는 둘 수 없음
    board[5]![0] = { color: "dark", king: false }; // dark는 둘 수 있음
    // light 차례인데 둘 수 없음 → dark 승.
    expect(findCheckersWinner(board, "light")).toBe("dark");
    // dark 차례면 둘 수 있고 양쪽 다 기물 있음 → 진행 중.
    expect(findCheckersWinner(board, "dark")).toBeNull();
  });

  it("returns null while the game is still in progress", () => {
    const board = createCheckersBoard();
    expect(findCheckersWinner(board, "dark")).toBeNull();
    expect(findCheckersWinner(board, "light")).toBeNull();
  });
});
