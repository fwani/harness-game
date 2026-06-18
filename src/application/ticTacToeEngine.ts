// Application layer: game-agnostic GameEngine adapter for Tic-Tac-Toe(틱택토).
// 틱택토 오케스트레이터(playTicTacToe)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure는 import 하지 않는다.
// playTicTacToe/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import { legalTicTacToeMoves, playTicTacToeMove } from "./playTicTacToe";
import {
  createTicTacToeBoard,
  findTicTacToeWinner,
  isTicTacToeDraw,
  type Board,
  type Mark,
} from "../domain/ticTacToe";

/** 틱택토의 한 행위: 좌표 착수. */
export type TicTacToeMove = { row: number; col: number };

/** GameEngine 상태: 보드 + 다음에 둘 마크(선=X=p1). */
export interface TicTacToeEngineState {
  board: Board;
  next: Mark;
}

/** 틱택토 마크(X/O)를 게임 무관 Side로 매핑한다(선(先)인 X=p1, O=p2). */
function sideOf(mark: Mark): Side {
  return mark === "X" ? "p1" : "p2";
}

/**
 * playTicTacToe 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playTicTacToeMove/legalTicTacToeMoves와 도메인 규약(불변·승/무 판정)을 그대로
 * 계승하며, 승부는 findTicTacToeWinner/isTicTacToeDraw(도메인)로 판정한다(재구현 금지).
 */
export function createTicTacToeEngine(): GameEngine<
  TicTacToeEngineState,
  TicTacToeMove
> {
  function status(state: TicTacToeEngineState): GameStatus {
    const winner = findTicTacToeWinner(state.board);
    if (winner !== null) {
      return { over: true, winner: sideOf(winner), draw: false };
    }
    if (isTicTacToeDraw(state.board)) {
      return { over: true, winner: null, draw: true };
    }
    return { over: false, winner: null, draw: false };
  }

  function turn(state: TicTacToeEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(
    state: TicTacToeEngineState,
    move: TicTacToeMove,
    by: Side,
  ): boolean {
    if (status(state).over) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 합법 수는 도메인 기반 legalTicTacToeMoves(빈 칸 열거) 기준으로 판정(범위 밖·점유면 불법).
    return legalTicTacToeMoves(state.board).some(
      (m) => m.row === move.row && m.col === move.col,
    );
  }

  return {
    init(): TicTacToeEngineState {
      return { board: createTicTacToeBoard(), next: "X" };
    },
    turn,
    isLegal,
    apply(
      state: TicTacToeEngineState,
      move: TicTacToeMove,
      by: Side,
    ): TicTacToeEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createTicTacToeEngine.apply: illegal move");
      }
      const result = playTicTacToeMove(
        state.board,
        move.row,
        move.col,
        state.next,
      );
      return { board: result.board, next: state.next === "X" ? "O" : "X" };
    },
    status,
  };
}
