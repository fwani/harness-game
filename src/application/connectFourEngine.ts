// Application layer: game-agnostic GameEngine adapter for Connect Four(커넥트포·사목).
// 커넥트포 오케스트레이터(playConnectFour)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure는 import 하지 않는다.
// playConnectFour/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import { playConnectFourMove } from "./playConnectFour";
import {
  createConnectFourBoard,
  findConnectFourWinner,
  isConnectFourDraw,
  legalColumns,
  type Board,
  type Player,
} from "../domain/connectFour";

/** 커넥트포의 한 행위: 열 선택(중력 낙하는 도메인 dropDisc가 처리). */
export type ConnectFourMove = { col: number };

/** GameEngine 상태: 보드 + 다음에 둘 플레이어(선=1=p1). */
export interface ConnectFourEngineState {
  board: Board;
  next: Player;
}

/** 커넥트포 플레이어(1/2)를 게임 무관 Side로 매핑한다(선(先)인 1=p1, 2=p2). */
function sideOf(player: Player): Side {
  return player === 1 ? "p1" : "p2";
}

/**
 * playConnectFour 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playConnectFourMove와 도메인 규약(불변·중력 낙하·4목 판정)을 그대로 계승하며,
 * 승부는 findConnectFourWinner/isConnectFourDraw(도메인)로 판정한다(재구현 금지).
 */
export function createConnectFourEngine(): GameEngine<
  ConnectFourEngineState,
  ConnectFourMove
> {
  function status(state: ConnectFourEngineState): GameStatus {
    const winner = findConnectFourWinner(state.board);
    if (winner !== null) {
      return { over: true, winner: sideOf(winner), draw: false };
    }
    if (isConnectFourDraw(state.board)) {
      return { over: true, winner: null, draw: true };
    }
    return { over: false, winner: null, draw: false };
  }

  function turn(state: ConnectFourEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(
    state: ConnectFourEngineState,
    move: ConnectFourMove,
    by: Side,
  ): boolean {
    if (status(state).over) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 합법 열은 도메인 legalColumns 기준으로 판정(가득 찬 열/범위 밖이면 불법).
    return legalColumns(state.board).includes(move.col);
  }

  return {
    init(): ConnectFourEngineState {
      return { board: createConnectFourBoard(), next: 1 };
    },
    turn,
    isLegal,
    apply(
      state: ConnectFourEngineState,
      move: ConnectFourMove,
      by: Side,
    ): ConnectFourEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createConnectFourEngine.apply: illegal move");
      }
      const result = playConnectFourMove(state.board, move.col, state.next);
      return { board: result.board, next: state.next === 1 ? 2 : 1 };
    },
    status,
  };
}
