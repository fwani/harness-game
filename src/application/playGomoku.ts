// Application layer: orchestrates a single 2-player gomoku game. Depends on domain only.
import {
  createBoard,
  placeStone,
  checkWin,
  isBoardFull,
  type Board,
  type Stone,
} from "../domain/gomoku";

export interface GomokuState {
  board: Board;
  /** 다음에 둘 차례. 시작은 "black". */
  next: Stone;
  /** 승자(없으면 null). winner가 정해지면 게임 종료. */
  winner: Stone | null;
  /** 승자 없이 보드가 가득 차 종료된 무승부면 true(승자 있으면 false). */
  isDraw: boolean;
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
    isDraw: false,
  };
}

/** 게임이 종료됐는지: 5목 승자가 있거나 무승부(보드 가득)면 true. */
export function isFinished(state: GomokuState): boolean {
  return state.winner !== null || state.isDraw;
}

/**
 * 현재 차례(state.next)의 돌을 (x,y)에 둔 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 게임이 끝났으면(승자 또는 무승부) throw.
 * - placeStone이 throw하는 경우(범위 밖/이미 점유)는 그대로 전파한다.
 * - 착수 후 checkWin이 승자를 반환하면 winner를 채우고(종료),
 *   승자가 없고 보드가 가득 차면 isDraw=true로 두고 종료(next 토글 중단),
 *   그 외에는 next를 상대 색으로 토글한다.
 */
export function applyMove(state: GomokuState, x: number, y: number): GomokuState {
  if (isFinished(state)) {
    throw new Error("applyMove: game already finished");
  }
  const stone = state.next;
  const board = placeStone(state.board, x, y, stone);
  const winner = checkWin(board, x, y);
  const isDraw = winner === null && isBoardFull(board);
  return {
    board,
    next: winner === null && !isDraw ? opponent(stone) : stone,
    winner,
    isDraw,
  };
}
