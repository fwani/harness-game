// Application layer: game-agnostic GameEngine adapter for Checkers (체커 / 서양 장기, Draughts).
// 체커 도메인 규칙(checkers)과 기존 application 오케스트레이터(playCheckers)를 게임 무관
// GameEngine 계약으로 감싼다. domain + 기존 application(playCheckers, gameEngine)에만 의존하고
// infrastructure/ui는 import 하지 않는다.
// playCheckers/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(dotsAndBoxesEngine와 동일 원칙).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import { playCheckersMove } from "./playCheckers";
import type {
  CheckersBoard,
  CheckersColor,
  CheckersMove,
} from "../domain/checkers";
import {
  createCheckersBoard,
  findCheckersWinner,
  legalCheckersMoves,
} from "../domain/checkers";

/** 체커 표준 선공 색(영국식 체커는 dark가 선). */
const FIRST_COLOR: CheckersColor = "dark";

/**
 * 어댑터 전용 진행 상태.
 * 도메인 보드(CheckersBoard)에는 "다음에 둘 색" 정보가 없으므로
 * dotsAndBoxesEngine의 DotsEngineState처럼 "보드 + 다음에 둘 색"을 묶어 GameEngine<S,M>의 S로 쓴다.
 */
export interface CheckersEngineState {
  /** domain CheckersBoard. */
  board: CheckersBoard;
  /** 다음에 둘 색. 멀티 점프 연속이면 같은 색이 유지된다. */
  next: CheckersColor;
}

/** 체커 색을 게임 무관 Side로 매핑한다(선(先)=dark=p1, light=p2). */
function sideOf(color: CheckersColor): Side {
  return color === FIRST_COLOR ? "p1" : "p2";
}

/** 두 수가 같은 착수인지(from/to/captured 동등) 비교한다. */
function sameMove(a: CheckersMove, b: CheckersMove): boolean {
  if (a.from.row !== b.from.row || a.from.col !== b.from.col) {
    return false;
  }
  if (a.to.row !== b.to.row || a.to.col !== b.to.col) {
    return false;
  }
  const ac = a.captured;
  const bc = b.captured;
  if (ac === undefined || bc === undefined) {
    return ac === bc;
  }
  return ac.row === bc.row && ac.col === bc.col;
}

/**
 * playCheckersMove 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playCheckersMove와 도메인 규약(불변·강제 점프·승급 즉시 턴 종료)을 그대로 계승하며,
 * 멀티 점프 연속(continues) 시 같은 색이 한 번 더 두도록 turn(state)에 정확히 반영한다.
 */
export function createCheckersEngine(): GameEngine<CheckersEngineState, CheckersMove> {
  function status(state: CheckersEngineState): GameStatus {
    // 승부 판정은 도메인 findCheckersWinner 규약을 따른다(재구현 금지). 다음 둘 색(state.next)
    // 기준으로 스테일메이트/기물 소멸을 판정한다.
    const winner = findCheckersWinner(state.board, state.next);
    if (winner === null) {
      return { over: false, winner: null, draw: false };
    }
    // 도메인이 무승부를 표현하지 않으므로 draw=false로 둔다.
    return { over: true, winner: sideOf(winner), draw: false };
  }

  function turn(state: CheckersEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: CheckersEngineState, move: CheckersMove, by: Side): boolean {
    if (status(state).over) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 합법성은 도메인 legalCheckersMoves(강제 점프 반영) 기준으로 판정(재구현 금지).
    return legalCheckersMoves(state.board, state.next).some((m) => sameMove(m, move));
  }

  return {
    init(): CheckersEngineState {
      return { board: createCheckersBoard(), next: FIRST_COLOR };
    },
    turn,
    isLegal,
    apply(state: CheckersEngineState, move: CheckersMove, by: Side): CheckersEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createCheckersEngine.apply: illegal move");
      }
      const result = playCheckersMove(state.board, move, state.next);
      // 멀티 점프 연속 보장: result.continues면 nextToMove===state.next → turn이 같은 색을 유지.
      // king 승급 즉시 턴 종료도 playCheckersMove가 이미 nextToMove에 반영한다.
      return { board: result.board, next: result.nextToMove };
    },
    status,
  };
}
