// Application layer: game-agnostic GameEngine adapter for Reversi (오델로).
// 오델로(Reversi) 오케스트레이터(playReversi)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure는 import 하지 않는다.
// playReversi/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import {
  startReversiGame,
  applyReversiTurn,
  reversiResult,
  type ReversiState,
} from "./playReversi";
import { legalReversiMoves } from "../domain/reversiMoves";
import type { Stone } from "../domain/reversi";

/** 오델로의 한 행위: 좌표 착수(자동 패스는 applyReversiTurn 내부 처리). */
export type ReversiMove = { x: number; y: number };

/** 오델로 진영(black/white)을 게임 무관 Side로 매핑한다(선(先)인 black=p1, white=p2). */
function sideOf(stone: Stone): Side {
  return stone === "black" ? "p1" : "p2";
}

/**
 * playReversi 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 startReversiGame/applyReversiTurn/reversiResult와 도메인 규약(불변·자동 패스)을
 * 그대로 계승하며, 종료 시 승패는 reversiResult(디스크 계가)로 판정한다.
 * 명시적 pass move는 두지 않는다(자동 패스는 applyReversiTurn이 내부 처리).
 */
export function createReversiEngine(): GameEngine<ReversiState, ReversiMove> {
  function status(state: ReversiState): GameStatus {
    if (!state.finished) {
      return { over: false, winner: null, draw: false };
    }
    const result = reversiResult(state);
    if (result === null || result === "draw") {
      return { over: true, winner: null, draw: true };
    }
    return { over: true, winner: sideOf(result), draw: false };
  }

  function turn(state: ReversiState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: ReversiState, move: ReversiMove, by: Side): boolean {
    if (state.finished) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 좌표 착수는 legalReversiMoves 기준으로 판정(범위 밖·점유·뒤집힘 0개면 불법).
    return legalReversiMoves(state.board, state.next).some(
      (m) => m.x === move.x && m.y === move.y,
    );
  }

  return {
    init(): ReversiState {
      // startReversiGame은 인자 없음 — config는 받지 않고 무시한다.
      return startReversiGame();
    },
    turn,
    isLegal,
    apply(state: ReversiState, move: ReversiMove, by: Side): ReversiState {
      if (!isLegal(state, move, by)) {
        throw new Error("createReversiEngine.apply: illegal move");
      }
      return applyReversiTurn(state, move.x, move.y);
    },
    status,
  };
}
