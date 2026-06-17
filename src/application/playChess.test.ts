import { describe, it, expect } from "vitest";
import {
  startChessGame,
  applyChessMove,
  chessLegalMoves,
  type ChessGameState,
  type Square,
} from "./playChess";
import {
  pieceAt,
  colorLegalMoves,
  type ChessBoard,
  type ChessPiece,
  type ChessColor,
} from "../domain/chess";

// 보드 깊은 스냅샷(불변 검증용).
function snapshot(board: ChessBoard): ChessBoard {
  return board.map((row) => row.slice());
}

// 빈 8×8 보드.
function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

// 기물들을 배치한 커스텀 게임 상태(미종료).
function stateWith(
  pieces: { row: number; col: number; piece: ChessPiece }[],
  next: ChessColor,
): ChessGameState {
  const board = emptyBoard();
  for (const { row, col, piece } of pieces) {
    board[row]![col] = piece;
  }
  return { board, next, finished: false, winner: null, endReason: null };
}

describe("playChess application", () => {
  it("startChessGame sets the standard initial board with white to move", () => {
    const state = startChessGame();
    expect(state.next).toBe("white");
    expect(state.finished).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.endReason).toBeNull();
    // 표준 배치: 색당 16개, 합 32개.
    const pieces = state.board.flat().filter((c) => c !== null);
    expect(pieces.length).toBe(32);
    // 백 킹 e1(row7,col4), 흑 킹 e8(row0,col4).
    expect(pieceAt(state.board, 7, 4)).toEqual({ color: "white", type: "king" });
    expect(pieceAt(state.board, 0, 4)).toEqual({ color: "black", type: "king" });
  });

  it("applies a legal move, toggles the turn, and updates the board (immutably)", () => {
    const state = startChessGame();
    const before = snapshot(state.board);
    // 백 폰 e2(row6,col4) → e4(row4,col4).
    const next = applyChessMove(state, { row: 6, col: 4 }, { row: 4, col: 4 });
    expect(next.next).toBe("black");
    expect(next.finished).toBe(false);
    expect(pieceAt(next.board, 4, 4)).toEqual({ color: "white", type: "pawn" });
    expect(pieceAt(next.board, 6, 4)).toBeNull();
    // 입력 state는 변형되지 않는다.
    expect(state.board).toEqual(before);
    expect(state.next).toBe("white");
  });

  it("throws when moving from an empty square", () => {
    const state = startChessGame();
    expect(() => applyChessMove(state, { row: 4, col: 4 }, { row: 3, col: 4 })).toThrow();
  });

  it("throws when moving the opponent's piece", () => {
    const state = startChessGame(); // white to move
    // 흑 폰 e7(row1,col4)를 백 차례에 움직이려 하면 throw.
    expect(() => applyChessMove(state, { row: 1, col: 4 }, { row: 2, col: 4 })).toThrow();
  });

  it("throws on an illegal destination", () => {
    const state = startChessGame();
    // 백 폰 e2 → e5(3칸 전진)는 불법.
    expect(() => applyChessMove(state, { row: 6, col: 4 }, { row: 3, col: 4 })).toThrow();
  });

  it("throws when a move would leave the own king in check (도메인 위임)", () => {
    // 백 킹 e1(row7,col4), 백 비숍 e2(row6,col4)이 흑 룩 e8(row0,col4)의 핀에 묶임.
    const state = stateWith(
      [
        { row: 7, col: 4, piece: { color: "white", type: "king" } },
        { row: 6, col: 4, piece: { color: "white", type: "bishop" } },
        { row: 0, col: 4, piece: { color: "black", type: "rook" } },
        { row: 0, col: 0, piece: { color: "black", type: "king" } },
      ],
      "white",
    );
    // 비숍이 e파일을 벗어나면 킹이 룩에 노출됨 → 불법 수로 throw.
    expect(() => applyChessMove(state, { row: 6, col: 4 }, { row: 5, col: 3 })).toThrow();
  });

  it("throws when applying a move to an already finished game", () => {
    const finished: ChessGameState = {
      ...startChessGame(),
      finished: true,
      winner: "white",
      endReason: "checkmate",
    };
    expect(() => applyChessMove(finished, { row: 6, col: 4 }, { row: 4, col: 4 })).toThrow();
  });

  it("detects checkmate (fool's mate) with the moving side as winner", () => {
    let state = startChessGame();
    // 1. f3 (백 폰 f2 row6,col5 → f3 row5,col5)
    state = applyChessMove(state, { row: 6, col: 5 }, { row: 5, col: 5 });
    // 1... e5 (흑 폰 e7 row1,col4 → e5 row3,col4)
    state = applyChessMove(state, { row: 1, col: 4 }, { row: 3, col: 4 });
    // 2. g4 (백 폰 g2 row6,col6 → g4 row4,col6)
    state = applyChessMove(state, { row: 6, col: 6 }, { row: 4, col: 6 });
    expect(state.finished).toBe(false);
    // 2... Qh4# (흑 퀸 d8 row0,col3 → h4 row4,col7) 외통.
    state = applyChessMove(state, { row: 0, col: 3 }, { row: 4, col: 7 });
    expect(state.finished).toBe(true);
    expect(state.winner).toBe("black");
    expect(state.endReason).toBe("checkmate");
    // 종료 후 차례는 둔 쪽으로 고정.
    expect(state.next).toBe("black");
  });

  it("detects stalemate as a draw (winner null)", () => {
    // 흑 킹 h8(row0,col7). 백 킹 f7(row1,col5), 백 퀸 g3(row5,col6).
    // 백이 퀸을 g6(row2,col6)로 옮기면 흑은 장군이 아니지만 둘 수 있는 합법 수가 없다(스테일메이트).
    const state = stateWith(
      [
        { row: 0, col: 7, piece: { color: "black", type: "king" } },
        { row: 1, col: 5, piece: { color: "white", type: "king" } },
        { row: 5, col: 6, piece: { color: "white", type: "queen" } },
      ],
      "white",
    );
    const next = applyChessMove(state, { row: 5, col: 6 }, { row: 2, col: 6 });
    expect(next.finished).toBe(true);
    expect(next.winner).toBeNull();
    expect(next.endReason).toBe("stalemate");
  });

  it("chessLegalMoves matches the domain legal moves for the side to move", () => {
    const state = startChessGame();
    const fromApp = chessLegalMoves(state);
    const fromDomain = colorLegalMoves(state.board, "white");
    expect(fromApp).toEqual(fromDomain);
    // 표준 시작은 백에게 20개의 합법 수(폰 16 + 나이트 4).
    expect(fromApp.length).toBe(20);
    // 반환 항목 형태 확인.
    const sample: { from: Square; to: Square } = fromApp[0]!;
    expect(sample.from).toHaveProperty("row");
    expect(sample.to).toHaveProperty("col");
  });
});
