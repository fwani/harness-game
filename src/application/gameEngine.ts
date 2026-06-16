// Application layer: game-agnostic match-progression core.
// Depends on domain and existing application orchestrators only — no infrastructure.
import { isBoardFull, type Stone } from "../domain/gomoku";
import {
  startGame,
  applyMove,
  type GomokuState,
} from "./playGomoku";

/** 게임 무관 진영 식별자. p1이 선(先). */
export type Side = "p1" | "p2";

export interface GameStatus {
  over: boolean;
  winner: Side | null;
  draw: boolean;
}

/**
 * 게임 무관(game-agnostic) 진행 인터페이스.
 * "어떤 게임인지 몰라도 한 수 진행/종료 판정"을 가능하게 하는 통일 어댑터 계약이다.
 */
export interface GameEngine<S, M> {
  init(config?: unknown): S;
  /** 현재 둘 차례. */
  turn(state: S): Side;
  /** 합법 여부만 boolean으로 반환한다(throw 금지). */
  isLegal(state: S, move: M, by: Side): boolean;
  /** 한 수를 적용한 새 상태(불변 — 기존 applyMove 규약 계승). */
  apply(state: S, move: M, by: Side): S;
  status(state: S): GameStatus;
}

export interface GomokuMove {
  x: number;
  y: number;
}

/** gomoku의 Stone을 게임 무관 Side로 매핑한다(black=선=p1). */
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
 * playGomoku 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playGomoku.startGame/applyMove와 도메인 규약을 그대로 계승하며,
 * GomokuState/playGomoku/도메인 코드는 수정하지 않고 파생 계산만 한다.
 */
export function createGomokuEngine(): GameEngine<GomokuState, GomokuMove> {
  function status(state: GomokuState): GameStatus {
    const full = isBoardFull(state.board);
    const over = state.winner !== null || full;
    const winner = state.winner === null ? null : sideOf(state.winner);
    const draw = state.winner === null && full;
    return { over, winner, draw };
  }

  function turn(state: GomokuState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: GomokuState, move: GomokuMove, by: Side): boolean {
    if (status(state).over) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    const { x, y } = move;
    const size = state.board.length;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return false;
    }
    if (x < 0 || x >= size || y < 0 || y >= size) {
      return false;
    }
    return state.board[y]![x] === null;
  }

  return {
    init(config?: unknown): GomokuState {
      return startGame(sizeFromConfig(config));
    },
    turn,
    isLegal,
    apply(state: GomokuState, move: GomokuMove, by: Side): GomokuState {
      if (!isLegal(state, move, by)) {
        throw new Error("createGomokuEngine.apply: illegal move");
      }
      return applyMove(state, move.x, move.y);
    },
    status,
  };
}
