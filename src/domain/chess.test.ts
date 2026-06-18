import { describe, it, expect } from "vitest";
import {
  colorLegalMoves,
  createChessBoard,
  findKing,
  isCheckmate,
  isKingInCheck,
  isOnBoard,
  isSquareAttacked,
  isStalemate,
  legalChessMoves,
  pieceAt,
  pieceColorMoves,
  pseudoLegalMoves,
  squareName,
  type ChessBoard,
  type ChessColor,
  type ChessPiece,
  type ChessPieceType,
  type ChessSquare,
} from "./chess";

/** 모든 칸이 빈 8×8 보드. 인공 배치 테스트용. */
function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

/** {row,col} 정렬 후 "row,col" 문자열 집합으로 비교(순서 무관). */
function squareKeys(squares: ChessSquare[]): string[] {
  return squares.map((s) => `${s.row},${s.col}`).sort();
}

/** 보드 위 주어진 색 기물 수를 센다. */
function countByColor(board: ChessBoard, color: ChessColor): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.color === color) {
        count++;
      }
    }
  }
  return count;
}

/** 보드 위 주어진 색·타입 기물 수를 센다. */
function countByPiece(board: ChessBoard, color: ChessColor, type: ChessPieceType): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.color === color && cell.type === type) {
        count++;
      }
    }
  }
  return count;
}

describe("chess isOnBoard", () => {
  it("accepts coordinates within 0..7", () => {
    expect(isOnBoard(0, 0)).toBe(true);
    expect(isOnBoard(7, 7)).toBe(true);
    expect(isOnBoard(3, 4)).toBe(true);
  });

  it("rejects coordinates outside the board", () => {
    expect(isOnBoard(-1, 0)).toBe(false);
    expect(isOnBoard(0, -1)).toBe(false);
    expect(isOnBoard(8, 0)).toBe(false);
    expect(isOnBoard(0, 8)).toBe(false);
  });

  it("rejects non-integer coordinates", () => {
    expect(isOnBoard(1.5, 0)).toBe(false);
    expect(isOnBoard(0, 2.1)).toBe(false);
    expect(isOnBoard(Number.NaN, 0)).toBe(false);
  });
});

describe("chess createChessBoard", () => {
  it("creates an 8×8 board", () => {
    const board = createChessBoard();
    expect(board.length).toBe(8);
    for (const row of board) {
      expect(row.length).toBe(8);
    }
  });

  it("places back ranks and pawns correctly", () => {
    const board = createChessBoard();
    const order: ChessPieceType[] = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    for (let col = 0; col < 8; col++) {
      expect(board[0]![col]).toEqual({ color: "black", type: order[col] });
      expect(board[1]![col]).toEqual({ color: "black", type: "pawn" });
      expect(board[6]![col]).toEqual({ color: "white", type: "pawn" });
      expect(board[7]![col]).toEqual({ color: "white", type: order[col] });
    }
  });

  it("leaves rows 2..5 empty", () => {
    const board = createChessBoard();
    for (let row = 2; row <= 5; row++) {
      for (let col = 0; col < 8; col++) {
        expect(board[row]![col]).toBeNull();
      }
    }
  });

  it("has exactly 16 pieces of each color with correct counts", () => {
    const board = createChessBoard();
    for (const color of ["white", "black"] as ChessColor[]) {
      expect(countByColor(board, color)).toBe(16);
      expect(countByPiece(board, color, "king")).toBe(1);
      expect(countByPiece(board, color, "queen")).toBe(1);
      expect(countByPiece(board, color, "rook")).toBe(2);
      expect(countByPiece(board, color, "knight")).toBe(2);
      expect(countByPiece(board, color, "bishop")).toBe(2);
      expect(countByPiece(board, color, "pawn")).toBe(8);
    }
  });

  it("places each queen on her own color (white d1, black d8)", () => {
    const board = createChessBoard();
    // d1 = row7/col3 (white), d8 = row0/col3 (black). 둘 다 col 3.
    expect(board[7]![3]).toEqual({ color: "white", type: "queen" });
    expect(board[0]![3]).toEqual({ color: "black", type: "queen" });
  });

  it("returns a fresh board and fresh piece objects on each call (no shared references)", () => {
    const a = createChessBoard();
    const b = createChessBoard();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]![0]).not.toBe(b[0]![0]);
    // 한 보드를 변형해도 다른 보드에 영향이 없다.
    a[0]![0] = null;
    expect(b[0]![0]).toEqual({ color: "black", type: "rook" });
  });
});

describe("chess pieceAt", () => {
  it("returns the piece at an occupied square", () => {
    const board = createChessBoard();
    expect(pieceAt(board, 7, 4)).toEqual({ color: "white", type: "king" });
    expect(pieceAt(board, 0, 4)).toEqual({ color: "black", type: "king" });
  });

  it("returns null for an empty square", () => {
    const board = createChessBoard();
    expect(pieceAt(board, 4, 4)).toBeNull();
  });

  it("returns null for out-of-range coordinates (no throw)", () => {
    const board = createChessBoard();
    expect(pieceAt(board, -1, 0)).toBeNull();
    expect(pieceAt(board, 8, 0)).toBeNull();
    expect(pieceAt(board, 0, 8)).toBeNull();
  });
});

describe("chess squareName", () => {
  it("maps representative coordinates to algebraic notation", () => {
    expect(squareName(7, 0)).toBe("a1");
    expect(squareName(0, 7)).toBe("h8");
    expect(squareName(7, 4)).toBe("e1");
    expect(squareName(0, 3)).toBe("d8");
    expect(squareName(0, 0)).toBe("a8");
    expect(squareName(7, 7)).toBe("h1");
  });

  it("throws for out-of-range coordinates", () => {
    expect(() => squareName(-1, 0)).toThrow();
    expect(() => squareName(8, 0)).toThrow();
    expect(() => squareName(0, 8)).toThrow();
  });
});

describe("chess pseudoLegalMoves — empty/out-of-range", () => {
  it("returns [] for an empty square", () => {
    const board = createChessBoard();
    expect(pseudoLegalMoves(board, 4, 4)).toEqual([]);
  });

  it("returns [] for out-of-range coordinates", () => {
    const board = createChessBoard();
    expect(pseudoLegalMoves(board, -1, 0)).toEqual([]);
    expect(pseudoLegalMoves(board, 8, 0)).toEqual([]);
    expect(pseudoLegalMoves(board, 0, 8)).toEqual([]);
  });

  it("does not mutate the input board (pure function)", () => {
    const board = createChessBoard();
    const before = JSON.stringify(board);
    pseudoLegalMoves(board, 6, 4); // white pawn e2
    pseudoLegalMoves(board, 7, 1); // white knight b1
    pseudoLegalMoves(board, 0, 3); // black queen
    expect(JSON.stringify(board)).toBe(before);
  });
});

describe("chess pseudoLegalMoves — pawn", () => {
  it("white pawn on its start rank can advance one or two squares", () => {
    const board = createChessBoard();
    // e2 = row6/col4.
    expect(squareKeys(pseudoLegalMoves(board, 6, 4))).toEqual(["4,4", "5,4"]);
  });

  it("black pawn on its start rank can advance one or two squares", () => {
    const board = createChessBoard();
    // e7 = row1/col4 → advances toward increasing row.
    expect(squareKeys(pseudoLegalMoves(board, 1, 4))).toEqual(["2,4", "3,4"]);
  });

  it("cannot advance through a blocking piece (no one- or two-square move)", () => {
    const board = emptyBoard();
    board[6]![4] = { color: "white", type: "pawn" };
    board[5]![4] = { color: "black", type: "pawn" }; // directly in front
    expect(pseudoLegalMoves(board, 6, 4)).toEqual([]);
  });

  it("cannot make the two-square move when the second square is blocked", () => {
    const board = emptyBoard();
    board[6]![4] = { color: "white", type: "pawn" };
    board[4]![4] = { color: "black", type: "pawn" }; // two squares ahead
    expect(squareKeys(pseudoLegalMoves(board, 6, 4))).toEqual(["5,4"]);
  });

  it("captures diagonally only, and never captures forward", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "pawn" }; // not on start rank
    board[3]![3] = { color: "black", type: "pawn" }; // capturable
    board[3]![5] = { color: "white", type: "pawn" }; // own piece — not capturable
    board[3]![4] = { color: "black", type: "knight" }; // forward — blocks, not capture
    // Forward blocked, so only the diagonal capture on the left remains.
    expect(squareKeys(pseudoLegalMoves(board, 4, 4))).toEqual(["3,3"]);
  });

  it("does not advance two squares when not on the start rank", () => {
    const board = emptyBoard();
    board[5]![4] = { color: "white", type: "pawn" };
    expect(squareKeys(pseudoLegalMoves(board, 5, 4))).toEqual(["4,4"]);
  });
});

describe("chess pseudoLegalMoves — knight", () => {
  it("has two opening moves from b1", () => {
    const board = createChessBoard();
    // b1 = row7/col1 → a3(row5/col0), c3(row5/col2).
    expect(squareKeys(pseudoLegalMoves(board, 7, 1))).toEqual(["5,0", "5,2"]);
  });

  it("covers all eight L-shapes from the center and can capture enemies", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "knight" };
    board[2]![5] = { color: "black", type: "pawn" }; // enemy on one target → capturable
    board[6]![5] = { color: "white", type: "pawn" }; // own piece on one target → excluded
    const keys = squareKeys(pseudoLegalMoves(board, 4, 4));
    // 8 targets minus the own-piece one (6,5) = 7.
    expect(keys).toEqual(
      ["2,3", "2,5", "3,2", "3,6", "5,2", "5,6", "6,3"].sort(),
    );
  });

  it("drops targets off the board from a corner", () => {
    const board = emptyBoard();
    board[0]![0] = { color: "white", type: "knight" };
    expect(squareKeys(pseudoLegalMoves(board, 0, 0))).toEqual(["1,2", "2,1"]);
  });
});

describe("chess pseudoLegalMoves — sliding pieces", () => {
  it("rook slides until blocked, stopping before own piece and capturing enemy", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "rook" };
    board[4]![6] = { color: "white", type: "pawn" }; // own piece to the right → stop before (4,5)
    board[4]![1] = { color: "black", type: "pawn" }; // enemy to the left → capture at (4,1)
    const keys = squareKeys(pseudoLegalMoves(board, 4, 4));
    expect(keys).toEqual(
      [
        // up
        "0,4",
        "1,4",
        "2,4",
        "3,4",
        // down
        "5,4",
        "6,4",
        "7,4",
        // right (stop before own pawn at col6)
        "4,5",
        // left (capture enemy at col1, stop there)
        "4,1",
        "4,2",
        "4,3",
      ].sort(),
    );
  });

  it("bishop slides diagonally and captures the first enemy", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "bishop" };
    board[2]![2] = { color: "black", type: "pawn" }; // up-left enemy → capture, stop
    board[6]![6] = { color: "white", type: "pawn" }; // down-right own → stop before (5,5)
    const keys = squareKeys(pseudoLegalMoves(board, 4, 4));
    expect(keys).toEqual(
      [
        // up-left: stop at enemy (2,2)
        "3,3",
        "2,2",
        // up-right
        "3,5",
        "2,6",
        "1,7",
        // down-left
        "5,3",
        "6,2",
        "7,1",
        // down-right: stop before own (6,6)
        "5,5",
      ].sort(),
    );
  });

  it("queen combines rook and bishop directions", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "queen" };
    const rookKeys = new Set(squareKeys(pseudoLegalMoves(board, 4, 4)));
    // On an otherwise empty board a centered queen reaches 27 squares.
    expect(rookKeys.size).toBe(27);
  });

  it("king moves one square in eight directions, excluding own pieces", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "king" };
    board[3]![4] = { color: "white", type: "pawn" }; // own piece above → excluded
    board[5]![4] = { color: "black", type: "pawn" }; // enemy below → capturable
    const keys = squareKeys(pseudoLegalMoves(board, 4, 4));
    expect(keys).toEqual(
      ["3,3", "3,5", "4,3", "4,5", "5,3", "5,4", "5,5"].sort(),
    );
  });
});

describe("chess pieceColorMoves", () => {
  it("enumerates every pseudo-legal move for a color in the opening position", () => {
    const board = createChessBoard();
    // 8 pawns × 2 + 2 knights × 2 = 20 opening moves for each side.
    expect(pieceColorMoves(board, "white")).toHaveLength(20);
    expect(pieceColorMoves(board, "black")).toHaveLength(20);
  });

  it("returns from/to pairs that match pseudoLegalMoves per piece", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    board[0]![0] = { color: "white", type: "king" } satisfies ChessPiece;
    const moves = pieceColorMoves(board, "white");
    const rookMoves = moves.filter((m) => m.from.row === 4 && m.from.col === 4);
    expect(rookMoves).toHaveLength(pseudoLegalMoves(board, 4, 4).length);
    // Every entry's from-square holds a white piece.
    for (const m of moves) {
      expect(pieceAt(board, m.from.row, m.from.col)?.color).toBe("white");
    }
  });

  it("does not mutate the input board", () => {
    const board = createChessBoard();
    const before = JSON.stringify(board);
    pieceColorMoves(board, "white");
    pieceColorMoves(board, "black");
    expect(JSON.stringify(board)).toBe(before);
  });
});

describe("chess findKing", () => {
  it("locates both kings in the initial setup", () => {
    const board = createChessBoard();
    expect(findKing(board, "black")).toEqual({ row: 0, col: 4 });
    expect(findKing(board, "white")).toEqual({ row: 7, col: 4 });
  });

  it("returns null when the color has no king", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    expect(findKing(board, "white")).toBeNull();
    expect(findKing(board, "black")).toBeNull();
  });
});

describe("chess isSquareAttacked", () => {
  it("detects a rook attacking along a clear rank/file", () => {
    const board = emptyBoard();
    board[4]![0] = { color: "white", type: "rook" } satisfies ChessPiece;
    // Same rank, clear path.
    expect(isSquareAttacked(board, 4, 5, "white")).toBe(true);
    // Same file, clear path.
    expect(isSquareAttacked(board, 0, 0, "white")).toBe(true);
    // Off the rook's lines.
    expect(isSquareAttacked(board, 5, 5, "white")).toBe(false);
  });

  it("detects a bishop attacking along a diagonal", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "black", type: "bishop" } satisfies ChessPiece;
    expect(isSquareAttacked(board, 6, 6, "black")).toBe(true);
    expect(isSquareAttacked(board, 1, 1, "black")).toBe(true);
    expect(isSquareAttacked(board, 4, 6, "black")).toBe(false); // straight, not diagonal
  });

  it("detects a knight attack", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "knight" } satisfies ChessPiece;
    expect(isSquareAttacked(board, 2, 3, "white")).toBe(true);
    expect(isSquareAttacked(board, 6, 5, "white")).toBe(true);
    expect(isSquareAttacked(board, 5, 5, "white")).toBe(false); // adjacent, not an L
  });

  it("counts a pawn's diagonal attacks but not its forward push", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "pawn" } satisfies ChessPiece;
    // White pawn attacks the two diagonally-forward squares (row decreases).
    expect(isSquareAttacked(board, 3, 3, "white")).toBe(true);
    expect(isSquareAttacked(board, 3, 5, "white")).toBe(true);
    // Forward push square is NOT an attack.
    expect(isSquareAttacked(board, 3, 4, "white")).toBe(false);
    // Behind the pawn is not attacked.
    expect(isSquareAttacked(board, 5, 3, "white")).toBe(false);
  });

  it("counts a black pawn's diagonal attacks downward", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "black", type: "pawn" } satisfies ChessPiece;
    expect(isSquareAttacked(board, 5, 3, "black")).toBe(true);
    expect(isSquareAttacked(board, 5, 5, "black")).toBe(true);
    expect(isSquareAttacked(board, 5, 4, "black")).toBe(false); // forward push
  });

  it("does not let a blocked slider attack beyond the blocker", () => {
    const board = emptyBoard();
    board[4]![0] = { color: "white", type: "rook" } satisfies ChessPiece;
    board[4]![3] = { color: "black", type: "pawn" } satisfies ChessPiece; // blocker
    expect(isSquareAttacked(board, 4, 3, "white")).toBe(true); // the blocker itself
    expect(isSquareAttacked(board, 4, 4, "white")).toBe(false); // beyond the blocker
  });

  it("returns false for out-of-bounds squares", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "queen" } satisfies ChessPiece;
    expect(isSquareAttacked(board, -1, 0, "white")).toBe(false);
    expect(isSquareAttacked(board, 0, 8, "white")).toBe(false);
  });
});

describe("chess isKingInCheck", () => {
  it("reports check when a rook lines up on the king", () => {
    const board = emptyBoard();
    board[0]![4] = { color: "black", type: "king" } satisfies ChessPiece;
    board[5]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    expect(isKingInCheck(board, "black")).toBe(true);
    expect(isKingInCheck(board, "white")).toBe(false);
  });

  it("is false when a piece blocks the checking line", () => {
    const board = emptyBoard();
    board[0]![4] = { color: "black", type: "king" } satisfies ChessPiece;
    board[3]![4] = { color: "black", type: "pawn" } satisfies ChessPiece; // blocks
    board[5]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    expect(isKingInCheck(board, "black")).toBe(false);
  });

  it("is false when the color has no king", () => {
    const board = emptyBoard();
    board[5]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    expect(isKingInCheck(board, "black")).toBe(false);
  });
});

describe("chess legalChessMoves", () => {
  it("equals pseudoLegalMoves when the king is not exposed", () => {
    const board = emptyBoard();
    board[4]![4] = { color: "white", type: "knight" } satisfies ChessPiece;
    board[7]![0] = { color: "white", type: "king" } satisfies ChessPiece;
    expect(squareKeys(legalChessMoves(board, 4, 4))).toEqual(
      squareKeys(pseudoLegalMoves(board, 4, 4)),
    );
  });

  it("forbids moving a pinned piece off the pin line", () => {
    const board = emptyBoard();
    // White king on e1 (row7,col4), white rook on e4 (row4,col4) pinned by black rook on e8 (row0,col4).
    board[7]![4] = { color: "white", type: "king" } satisfies ChessPiece;
    board[4]![4] = { color: "white", type: "rook" } satisfies ChessPiece;
    board[0]![4] = { color: "black", type: "rook" } satisfies ChessPiece;
    const moves = legalChessMoves(board, 4, 4);
    // The pinned rook may only move along the e-file (col 4); never sideways.
    for (const m of moves) {
      expect(m.col).toBe(4);
    }
    // It can capture the pinning rook and slide along the file, but never leave the file.
    expect(moves.some((m) => m.row === 0 && m.col === 4)).toBe(true); // capture the pinner
    expect(moves.some((m) => m.col !== 4)).toBe(false);
  });

  it("when in check, keeps only moves that resolve the check", () => {
    const board = emptyBoard();
    // Black king a8 (row0,col0). White rook a4 (row4,col0) checks along the a-file.
    // Black rook on c6 (row2,col5) can only help by interposing on the a-file at (2,0).
    board[0]![0] = { color: "black", type: "king" } satisfies ChessPiece;
    board[2]![5] = { color: "black", type: "rook" } satisfies ChessPiece;
    board[4]![0] = { color: "white", type: "rook" } satisfies ChessPiece;
    expect(isKingInCheck(board, "black")).toBe(true);
    const rookMoves = legalChessMoves(board, 2, 5);
    // The only legal rook move blocks the check by interposing on the a-file at (2,0).
    for (const m of rookMoves) {
      expect({ row: m.row, col: m.col }).toEqual({ row: 2, col: 0 });
    }
    expect(rookMoves.some((m) => m.row === 2 && m.col === 0)).toBe(true);
  });

  it("returns [] for an empty or out-of-range square", () => {
    const board = createChessBoard();
    expect(legalChessMoves(board, 4, 4)).toEqual([]); // empty middle square
    expect(legalChessMoves(board, -1, 0)).toEqual([]);
  });

  it("does not mutate the input board", () => {
    const board = createChessBoard();
    const before = JSON.stringify(board);
    legalChessMoves(board, 7, 1); // a knight
    legalChessMoves(board, 6, 4); // a pawn
    expect(JSON.stringify(board)).toBe(before);
  });
});

describe("chess colorLegalMoves", () => {
  it("lists every legal move for a color", () => {
    const board = emptyBoard();
    board[7]![4] = { color: "white", type: "king" } satisfies ChessPiece;
    board[4]![4] = { color: "white", type: "knight" } satisfies ChessPiece;
    const moves = colorLegalMoves(board, "white");
    // King has 5 legal squares from e1 corner-ish + knight has 8 from the center.
    const knightMoves = moves.filter((m) => m.from.row === 4 && m.from.col === 4);
    expect(knightMoves).toHaveLength(8);
    for (const m of moves) {
      expect(pieceAt(board, m.from.row, m.from.col)?.color).toBe("white");
    }
  });
});

describe("chess isCheckmate", () => {
  it("detects a back-rank style mate (true)", () => {
    const board = emptyBoard();
    // Black king h8 (row0,col7), boxed by its own pawns g7,h7; white rook delivers mate on row 0.
    board[0]![7] = { color: "black", type: "king" } satisfies ChessPiece;
    board[1]![6] = { color: "black", type: "pawn" } satisfies ChessPiece;
    board[1]![7] = { color: "black", type: "pawn" } satisfies ChessPiece;
    board[0]![0] = { color: "white", type: "rook" } satisfies ChessPiece; // checks along row 0
    expect(isKingInCheck(board, "black")).toBe(true);
    expect(isCheckmate(board, "black")).toBe(true);
    expect(isStalemate(board, "black")).toBe(false);
  });

  it("is false for a simple check the king can escape", () => {
    const board = emptyBoard();
    board[0]![4] = { color: "black", type: "king" } satisfies ChessPiece;
    board[5]![4] = { color: "white", type: "rook" } satisfies ChessPiece; // check, but king can step aside
    expect(isKingInCheck(board, "black")).toBe(true);
    expect(isCheckmate(board, "black")).toBe(false);
  });

  it("recognizes fool's mate from a played sequence", () => {
    // Fool's mate: 1. f3 e5 2. g4 Qh4# — black queen mates white.
    const board = createChessBoard();
    // 1. f3 : white pawn f2(row6,col5) -> f3(row5,col5)
    board[5]![5] = board[6]![5]!;
    board[6]![5] = null;
    // 1... e5 : black pawn e7(row1,col4) -> e5(row3,col4)
    board[3]![4] = board[1]![4]!;
    board[1]![4] = null;
    // 2. g4 : white pawn g2(row6,col6) -> g4(row4,col6)
    board[4]![6] = board[6]![6]!;
    board[6]![6] = null;
    // 2... Qh4# : black queen d8(row0,col3) -> h4(row4,col7)
    board[4]![7] = board[0]![3]!;
    board[0]![3] = null;
    expect(isKingInCheck(board, "white")).toBe(true);
    expect(isCheckmate(board, "white")).toBe(true);
  });
});

describe("chess isStalemate", () => {
  it("detects a classic king+pawn stalemate (true)", () => {
    const board = emptyBoard();
    // Black king a8 (row0,col0). White king a6 (row2,col0) + white queen b6 (row2,col1).
    // Black is not in check but has no legal move → stalemate.
    board[0]![0] = { color: "black", type: "king" } satisfies ChessPiece;
    board[2]![0] = { color: "white", type: "king" } satisfies ChessPiece;
    board[2]![1] = { color: "white", type: "queen" } satisfies ChessPiece;
    expect(isKingInCheck(board, "black")).toBe(false);
    expect(isStalemate(board, "black")).toBe(true);
    expect(isCheckmate(board, "black")).toBe(false);
  });

  it("is false when the color still has a legal move", () => {
    const board = emptyBoard();
    board[0]![0] = { color: "black", type: "king" } satisfies ChessPiece;
    board[7]![7] = { color: "white", type: "king" } satisfies ChessPiece;
    expect(isStalemate(board, "black")).toBe(false); // king can roam freely
  });
});
