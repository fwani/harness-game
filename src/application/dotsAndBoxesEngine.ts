// Application layer: game-agnostic GameEngine adapter for Dots and Boxes (도트 앤 박스).
// 도트 앤 박스 오케스트레이터(playDotsAndBoxes)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터에만 의존하고 infrastructure/ui는 import 하지 않는다.
// playDotsAndBoxes/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import { playDotsAndBoxesTurn } from "./playDotsAndBoxes";
import type { DotsBoard, DotsEdge, DotsPlayer } from "../domain/dotsAndBoxes";
import {
  availableEdges,
  createDotsAndBoxesBoard,
  findDotsWinner,
  isDotsGameOver,
} from "../domain/dotsAndBoxes";

/** 기본 격자 크기(박스 3×3). config로 덮어쓸 수 있다. */
const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/**
 * 어댑터 전용 진행 상태.
 * playDotsAndBoxesTurn은 보드 기반(board+player→result)이라 진행 상태 객체가 없으므로
 * 여기서 "보드 + 다음에 둘 플레이어"를 묶어 GameEngine<S,M>의 S로 쓴다.
 */
export interface DotsEngineState {
  /** domain DotsBoard. */
  board: DotsBoard;
  /** 다음에 둘 플레이어(1|2). 보너스 턴이면 같은 플레이어가 유지된다. */
  next: DotsPlayer;
}

/** 도트 앤 박스 플레이어(1|2)를 게임 무관 Side로 매핑한다(선(先)=1=p1, 2=p2). */
function sideOf(player: DotsPlayer): Side {
  return player === 1 ? "p1" : "p2";
}

/** init config가 { rows?: number; cols?: number } 형태면 해당 값을 추출한다. */
function dimFromConfig(config: unknown, key: "rows" | "cols"): number | undefined {
  if (typeof config === "object" && config !== null && key in config) {
    const value = (config as Record<string, unknown>)[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}

/**
 * playDotsAndBoxes 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playDotsAndBoxesTurn과 도메인 규약(불변·보너스 턴)을 그대로 계승하며,
 * 박스를 완성하면 같은 플레이어가 한 번 더 두는 보너스 턴을 turn(state)에 정확히 반영한다.
 *
 * @param rows 박스 격자의 행 수(기본 3). config.rows가 있으면 그 값을 우선한다.
 * @param cols 박스 격자의 열 수(기본 3). config.cols가 있으면 그 값을 우선한다.
 */
export function createDotsAndBoxesEngine(
  rows: number = DEFAULT_ROWS,
  cols: number = DEFAULT_COLS,
): GameEngine<DotsEngineState, DotsEdge> {
  function status(state: DotsEngineState): GameStatus {
    if (!isDotsGameOver(state.board)) {
      return { over: false, winner: null, draw: false };
    }
    const winner = findDotsWinner(state.board);
    // undefined(이론상 비종료)는 진행 중 취급, null은 무승부, 1|2는 해당 Side 승리.
    if (winner === undefined) {
      return { over: false, winner: null, draw: false };
    }
    if (winner === null) {
      return { over: true, winner: null, draw: true };
    }
    return { over: true, winner: sideOf(winner), draw: false };
  }

  function turn(state: DotsEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: DotsEngineState, move: DotsEdge, by: Side): boolean {
    if (isDotsGameOver(state.board)) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 변 합법성은 도메인 availableEdges 기준으로 판정(재구현 금지).
    return availableEdges(state.board).some(
      (e) =>
        e.orientation === move.orientation &&
        e.row === move.row &&
        e.col === move.col,
    );
  }

  return {
    init(config?: unknown): DotsEngineState {
      const r = dimFromConfig(config, "rows") ?? rows;
      const c = dimFromConfig(config, "cols") ?? cols;
      return { board: createDotsAndBoxesBoard(r, c), next: 1 };
    },
    turn,
    isLegal,
    apply(state: DotsEngineState, move: DotsEdge, by: Side): DotsEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createDotsAndBoxesEngine.apply: illegal move");
      }
      const result = playDotsAndBoxesTurn(state.board, move, state.next);
      // 보너스 턴 보장: 박스를 완성하면 result.again===true → nextPlayer===state.next →
      // turn이 같은 플레이어를 유지한다.
      return { board: result.board, next: result.nextPlayer };
    },
    status,
  };
}
