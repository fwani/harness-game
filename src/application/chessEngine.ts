// Application layer: game-agnostic GameEngine adapter for Chess (체스).
// 체스 오케스트레이터(playChess)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터(playChess, gameEngine)에만 의존하고
// infrastructure는 import 하지 않는다. playChess/gameEngine/도메인 코드는 수정하지 않고
// 파생 계산만 한다(janggiEngine/checkersEngine와 동일 원칙·레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import {
  startChessGame,
  applyChessMove,
  chessLegalMoves,
  type ChessGameState,
  type Square,
} from "./playChess";
import type { ChessColor } from "../domain/chess";

export interface ChessMove {
  from: Square;
  to: Square;
}

/** 체스 색(white/black)을 게임 무관 Side로 매핑한다(선(先)=white=p1, black=p2). */
function sideOf(color: ChessColor): Side {
  return color === "white" ? "p1" : "p2";
}

/** 두 칸이 같은 좌표인지. */
function sameSquare(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * playChess 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 startChessGame/applyChessMove/chessLegalMoves와 도메인 규약(불변·외통/스테일메이트
 * 종료)을 그대로 계승하며, 규칙/합법 수/종료 판정은 재구현하지 않고 재사용한다.
 */
export function createChessEngine(): GameEngine<ChessGameState, ChessMove> {
  function status(state: ChessGameState): GameStatus {
    return {
      over: state.finished,
      winner: state.winner === null ? null : sideOf(state.winner),
      // 스테일메이트(외통이 아닌 종료)는 무승부: finished && winner===null.
      draw: state.finished && state.winner === null,
    };
  }

  function turn(state: ChessGameState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: ChessGameState, move: ChessMove, by: Side): boolean {
    if (state.finished) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 합법성은 도메인/오케스트레이터 chessLegalMoves(현재 차례 합법 수) 기준으로 판정(재구현 금지).
    return chessLegalMoves(state).some(
      (m) => sameSquare(m.from, move.from) && sameSquare(m.to, move.to),
    );
  }

  return {
    init(): ChessGameState {
      return startChessGame();
    },
    turn,
    isLegal,
    apply(state: ChessGameState, move: ChessMove, by: Side): ChessGameState {
      if (!isLegal(state, move, by)) {
        throw new Error("createChessEngine.apply: illegal move");
      }
      return applyChessMove(state, move.from, move.to);
    },
    status,
  };
}
