// Application layer: game-agnostic GameEngine adapter for Go (바둑).
// 바둑(Go) 오케스트레이터(playGo)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure는 import 하지 않는다.
// playGo/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import {
  startGame,
  applyMove,
  pass,
  type GoState,
} from "./playGo";
import { legalGoMoves } from "../domain/goMoves";
import { scoreArea } from "../domain/goScore";
import type { Stone } from "../domain/go";

/** 바둑의 한 행위: 좌표 착수 또는 패스(pass). */
export type GoMove = { x: number; y: number } | "pass";

/** 바둑 진영(black/white)을 게임 무관 Side로 매핑한다(선(先)인 black=p1, white=p2). */
function sideOf(stone: Stone): Side {
  return stone === "black" ? "p1" : "p2";
}

/** init config가 { size?: number } 형태면 size를 추출한다. */
function sizeFromConfig(config: unknown): number | undefined {
  if (typeof config === "object" && config !== null && "size" in config) {
    const size = (config as { size?: unknown }).size;
    if (typeof size === "number") {
      return size;
    }
  }
  return undefined;
}

/**
 * playGo 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 startGame/applyMove/pass와 도메인 규약(불변)을 그대로 계승하며,
 * 종료 시 승패는 도메인 scoreArea(영역 계가, komi 포함)로 판정한다.
 *
 * @param komi 백(white)에 더할 덤. 기본 0(동점=무승부 가능).
 */
export function createGoEngine(komi?: number): GameEngine<GoState, GoMove> {
  function status(state: GoState): GameStatus {
    if (!state.finished) {
      return { over: false, winner: null, draw: false };
    }
    const score = scoreArea(state.board, komi);
    if (score.winner === null) {
      return { over: true, winner: null, draw: true };
    }
    return { over: true, winner: sideOf(score.winner), draw: false };
  }

  function turn(state: GoState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: GoState, move: GoMove, by: Side): boolean {
    if (state.finished) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 패스는 미종료·차례 일치면 항상 합법.
    if (move === "pass") {
      return true;
    }
    // 좌표 착수는 legalGoMoves 기준으로 판정(범위 밖·점유·자살수면 불법).
    return legalGoMoves(state.board, state.next).some(
      (m) => m.x === move.x && m.y === move.y,
    );
  }

  return {
    init(config?: unknown): GoState {
      return startGame(sizeFromConfig(config));
    },
    turn,
    isLegal,
    apply(state: GoState, move: GoMove, by: Side): GoState {
      if (!isLegal(state, move, by)) {
        throw new Error("createGoEngine.apply: illegal move");
      }
      if (move === "pass") {
        return pass(state);
      }
      return applyMove(state, move.x, move.y);
    },
    status,
  };
}
