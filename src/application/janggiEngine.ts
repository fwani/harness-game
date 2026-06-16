// Application layer: game-agnostic GameEngine adapter for Janggi.
// 장기(Janggi) 오케스트레이터(playJanggi)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure는 import 하지 않는다.
// playJanggi/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import {
  startGame,
  applyMove,
  legalMoves,
  type JanggiState,
} from "./playJanggi";
import type { Side as JanggiSide, Pos } from "../domain/janggi";

export interface JanggiMove {
  from: Pos;
  to: Pos;
}

/** 장기 진영(cho/han)을 게임 무관 Side로 매핑한다(선(先)인 cho=p1, han=p2). */
function sideOf(side: JanggiSide): Side {
  return side === "cho" ? "p1" : "p2";
}

/** 두 좌표가 같은지. */
function posEq(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * playJanggi 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 startGame/applyMove/legalMoves와 도메인 규약(불변)을 그대로 계승한다.
 */
export function createJanggiEngine(): GameEngine<JanggiState, JanggiMove> {
  function status(state: JanggiState): GameStatus {
    return {
      over: state.finished,
      winner: state.winner === null ? null : sideOf(state.winner),
      // JanggiState에는 무승부 표현이 없으므로 draw는 항상 false.
      draw: false,
    };
  }

  function turn(state: JanggiState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: JanggiState, move: JanggiMove, by: Side): boolean {
    if (state.finished) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    return legalMoves(state).some(
      (m) => posEq(m.from, move.from) && posEq(m.to, move.to),
    );
  }

  return {
    init(): JanggiState {
      return startGame();
    },
    turn,
    isLegal,
    apply(state: JanggiState, move: JanggiMove, by: Side): JanggiState {
      if (!isLegal(state, move, by)) {
        throw new Error("createJanggiEngine.apply: illegal move");
      }
      return applyMove(state, move.from, move.to);
    },
    status,
  };
}
