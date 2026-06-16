import { describe, it, expect } from "vitest";
import { startGame, applyMove, legalMoves, type JanggiState } from "./playJanggi";
import {
  createEmptyBoard,
  isLegalMove,
  pieceAt,
  type Board,
  type Pos,
} from "../domain/janggi";

// 보드 깊은 스냅샷(불변 검증용).
function snapshot(board: Board): Board {
  return board.map((row) => row.slice());
}

describe("playJanggi application", () => {
  it("startGame sets the standard initial board with cho to move", () => {
    const state = startGame();
    expect(state.next).toBe("cho");
    expect(state.finished).toBe(false);
    expect(state.winner).toBeNull();
    // 표준 차림: 진영당 16개, 합 32개.
    const pieces = state.board.flat().filter((c) => c !== null);
    expect(pieces.length).toBe(32);
    // han 장은 (4,1), cho 장은 (4,8).
    expect(pieceAt(state.board, 4, 1)).toEqual({ side: "han", type: "general" });
    expect(pieceAt(state.board, 4, 8)).toEqual({ side: "cho", type: "general" });
  });

  it("toggles the turn after a legal move", () => {
    // cho 병(졸)은 y=6에 있다. (0,6)->(0,5) 전진 1칸은 합법.
    const state = startGame();
    const next = applyMove(state, { x: 0, y: 6 }, { x: 0, y: 5 });
    expect(pieceAt(next.board, 0, 5)).toEqual({ side: "cho", type: "soldier" });
    expect(pieceAt(next.board, 0, 6)).toBeNull();
    expect(next.next).toBe("han");
    expect(next.finished).toBe(false);
    expect(next.winner).toBeNull();
  });

  it("does not mutate the input state or board", () => {
    const state = startGame();
    const before = snapshot(state.board);
    applyMove(state, { x: 0, y: 6 }, { x: 0, y: 5 });
    expect(state.next).toBe("cho");
    expect(state.board).toEqual(before);
    expect(pieceAt(state.board, 0, 6)).toEqual({ side: "cho", type: "soldier" });
  });

  it("propagates the domain error for an illegal move", () => {
    const state = startGame();
    // 졸이 후퇴(-y 방향이 전진인 cho에게 +y는 후퇴)하는 수는 불법.
    expect(() => applyMove(state, { x: 0, y: 6 }, { x: 0, y: 7 })).toThrow();
    // 빈 칸에서 두는 수도 불법(from에 cho 기물 없음).
    expect(() => applyMove(state, { x: 4, y: 4 }, { x: 4, y: 3 })).toThrow();
  });

  it("finishes with the mover as winner when the opponent general is captured", () => {
    // 커스텀 보드: han 장 (4,1)을 cho 차(4,5)가 직선 포획. 경로(y=4,3,2)는 비어 있다.
    const board = createEmptyBoard();
    board[1]![4] = { side: "han", type: "general" };
    board[5]![4] = { side: "cho", type: "chariot" };
    board[8]![4] = { side: "cho", type: "general" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
    };
    const from: Pos = { x: 4, y: 5 };
    const to: Pos = { x: 4, y: 1 };
    expect(isLegalMove(board, "cho", from, to)).toBe(true);
    const next = applyMove(state, from, to);
    expect(next.finished).toBe(true);
    expect(next.winner).toBe("cho");
    // general이 포획됐으므로 차례는 토글되지 않는다.
    expect(next.next).toBe("cho");
    expect(pieceAt(next.board, 4, 1)).toEqual({ side: "cho", type: "chariot" });
  });

  it("throws when applying a move after the game is finished", () => {
    const state: JanggiState = {
      board: createEmptyBoard(),
      next: "cho",
      finished: true,
      winner: "cho",
    };
    expect(() => applyMove(state, { x: 0, y: 6 }, { x: 0, y: 5 })).toThrow();
  });

  it("legalMoves returns only legal moves of the current side", () => {
    const state = startGame();
    const moves = legalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const { from, to } of moves) {
      // 모든 from은 cho 기물이고, 각 수는 도메인 기준으로 합법이다.
      expect(pieceAt(state.board, from.x, from.y)?.side).toBe("cho");
      expect(isLegalMove(state.board, "cho", from, to)).toBe(true);
    }
    // han 기물에서 시작하는 수는 포함되지 않는다.
    const fromHan = moves.some(
      (m) => pieceAt(state.board, m.from.x, m.from.y)?.side === "han",
    );
    expect(fromHan).toBe(false);
  });

  it("legalMoves reflects the side whose turn it is", () => {
    const state: JanggiState = {
      board: startGame().board,
      next: "han",
      finished: false,
      winner: null,
    };
    const moves = legalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const { from } of moves) {
      expect(pieceAt(state.board, from.x, from.y)?.side).toBe("han");
    }
  });
});
