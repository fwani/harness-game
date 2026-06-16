// Application layer: orchestrates a single 2-player gomoku game. Depends on domain only.
import { createBoard, placeStone, checkWin, type Board, type Stone } from "../domain/gomoku";

export interface GomokuState {
  board: Board;
  /** 다음에 둘 차례. 시작은 "black". */
  next: Stone;
  /** 승자(없으면 null). winner가 정해지면 게임 종료. */
  winner: Stone | null;
}

/** 상대 색으로 토글한다. */
function opponent(stone: Stone): Stone {
  return stone === "black" ? "white" : "black";
}

/** size×size 빈 보드로 새 게임을 시작한다(흑 선). */
export function startGame(size?: number): GomokuState {
  return {
    board: createBoard(size),
    next: "black",
    winner: null,
  };
}

/**
 * 현재 차례(state.next)의 돌을 (x,y)에 둔 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 게임이 끝났으면(winner != null) throw.
 * - placeStone이 throw하는 경우(범위 밖/이미 점유)는 그대로 전파한다.
 * - 착수 후 checkWin이 승자를 반환하면 winner를 채우고, 아니면 next를 상대 색으로 토글한다.
 */
export function applyMove(state: GomokuState, x: number, y: number): GomokuState {
  if (state.winner !== null) {
    throw new Error("applyMove: game already finished");
  }
  const stone = state.next;
  const board = placeStone(state.board, x, y, stone);
  const winner = checkWin(board, x, y);
  return {
    board,
    next: winner === null ? opponent(stone) : stone,
    winner,
  };
}
