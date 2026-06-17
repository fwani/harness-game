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
      endReason: null,
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

  it("sets endReason to \"capture\" when the opponent general is taken", () => {
    const board = createEmptyBoard();
    board[1]![4] = { side: "han", type: "general" };
    board[5]![4] = { side: "cho", type: "chariot" };
    board[8]![4] = { side: "cho", type: "general" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
      endReason: null,
    };
    const next = applyMove(state, { x: 4, y: 5 }, { x: 4, y: 1 });
    expect(next.finished).toBe(true);
    expect(next.winner).toBe("cho");
    expect(next.endReason).toBe("capture");
  });

  it("finishes with checkmate when the mating move leaves the opponent in mate", () => {
    // han 장은 (4,0)에 갇혀 있다. cho 차 B(8,1)가 y=1행을 제압해 탈출칸 (4,1)을 막고,
    // cho 차 A(0,5)를 (0,0)으로 올려 y=0행으로 장군을 부른다.
    // 장의 탈출칸 (3,0)·(5,0)은 차 A가, (4,1)은 차 B가 모두 제압 → 외통.
    const board = createEmptyBoard();
    board[0]![4] = { side: "han", type: "general" };
    board[5]![0] = { side: "cho", type: "chariot" }; // 차 A
    board[1]![8] = { side: "cho", type: "chariot" }; // 차 B
    board[9]![4] = { side: "cho", type: "general" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
      endReason: null,
    };
    const from: Pos = { x: 0, y: 5 };
    const to: Pos = { x: 0, y: 0 };
    expect(isLegalMove(board, "cho", from, to)).toBe(true);
    const next = applyMove(state, from, to);
    expect(next.finished).toBe(true);
    expect(next.winner).toBe("cho");
    expect(next.endReason).toBe("checkmate");
    // 외통은 장 포획이 아니므로 상대 장은 여전히 보드에 있다.
    expect(pieceAt(next.board, 4, 0)).toEqual({ side: "han", type: "general" });
    // 외통 시에도 차례는 토글되지 않는다.
    expect(next.next).toBe("cho");
  });

  it("does not finish on a check that is not checkmate", () => {
    // han 장 (4,1) 중앙. cho 차(0,3)를 (4,3)으로 옮겨 y열 장군을 부르지만
    // 장이 (3,1)·(5,1)로 피할 수 있어 외통이 아니다 → 미종료, 차례는 han으로.
    const board = createEmptyBoard();
    board[1]![4] = { side: "han", type: "general" };
    board[3]![0] = { side: "cho", type: "chariot" };
    board[9]![4] = { side: "cho", type: "general" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
      endReason: null,
    };
    const next = applyMove(state, { x: 0, y: 3 }, { x: 4, y: 3 });
    expect(next.finished).toBe(false);
    expect(next.winner).toBeNull();
    expect(next.endReason).toBeNull();
    expect(next.next).toBe("han");
  });

  it("finishes as a draw (bikjang) when a move leaves the two generals facing on an open file", () => {
    // 두 장은 같은 세로줄 x=4(han (4,1), cho (4,8))에 있고, 그 사이를 cho 졸(4,5)이 막고 있다.
    // cho가 그 졸을 옆으로(4,5)->(3,5) 치우면 x=4 세로줄이 트여 빅장(무승부)이 성립한다.
    const board = createEmptyBoard();
    board[1]![4] = { side: "han", type: "general" };
    board[8]![4] = { side: "cho", type: "general" };
    board[5]![4] = { side: "cho", type: "soldier" };
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
      endReason: null,
    };
    const from: Pos = { x: 4, y: 5 };
    const to: Pos = { x: 3, y: 5 };
    expect(isLegalMove(board, "cho", from, to)).toBe(true);
    const next = applyMove(state, from, to);
    expect(next.finished).toBe(true);
    // 빅장은 무승부 — 승자가 없다.
    expect(next.winner).toBeNull();
    expect(next.endReason).toBe("bikjang");
    // 무승부도 종료 상태이므로 차례는 토글되지 않는다.
    expect(next.next).toBe("cho");
    // 두 장은 여전히 보드에 있고, 졸은 옆으로 비켰다.
    expect(pieceAt(next.board, 4, 1)).toEqual({ side: "han", type: "general" });
    expect(pieceAt(next.board, 4, 8)).toEqual({ side: "cho", type: "general" });
    expect(pieceAt(next.board, 3, 5)).toEqual({ side: "cho", type: "soldier" });
  });

  it("prefers checkmate over bikjang when a move yields both", () => {
    // 두 장은 같은 세로줄 x=4(han (4,0), cho (4,9))에 있어 보드는 빅장 형태다.
    // 동시에 cho 차 B를 (0,5)->(0,0)으로 올려 y=0 행으로 han 장을 외통에 빠뜨린다.
    // 탈출칸 (3,0)·(5,0)은 차 B가(장이 비키면 행이 트여) 제압, (4,1)은 차 D(1,1)가 제압 → 외통.
    // 외통이 빅장보다 우선이므로 무승부가 아니라 cho 승리여야 한다.
    const board = createEmptyBoard();
    board[0]![4] = { side: "han", type: "general" };
    board[9]![4] = { side: "cho", type: "general" };
    board[5]![0] = { side: "cho", type: "chariot" }; // 차 B(이동 전)
    board[1]![1] = { side: "cho", type: "chariot" }; // 차 D — (4,1) 제압
    const state: JanggiState = {
      board,
      next: "cho",
      finished: false,
      winner: null,
      endReason: null,
    };
    const from: Pos = { x: 0, y: 5 };
    const to: Pos = { x: 0, y: 0 };
    expect(isLegalMove(board, "cho", from, to)).toBe(true);
    const next = applyMove(state, from, to);
    expect(next.finished).toBe(true);
    // 외통 우선: 빅장 형태여도 무승부가 아니라 cho 승리.
    expect(next.winner).toBe("cho");
    expect(next.endReason).toBe("checkmate");
    expect(next.next).toBe("cho");
  });

  it("throws when applying a move after the game is finished", () => {
    const state: JanggiState = {
      board: createEmptyBoard(),
      next: "cho",
      finished: true,
      winner: "cho",
      endReason: "capture",
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
      endReason: null,
    };
    const moves = legalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const { from } of moves) {
      expect(pieceAt(state.board, from.x, from.y)?.side).toBe("han");
    }
  });
});
