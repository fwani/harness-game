// Application layer: game-agnostic GameEngine adapter for Mancala (만칼라 / Kalah 6·4).
// 만칼라 오케스트레이터(playMancalaTurn)를 게임 무관 GameEngine 계약으로 감싼다.
// domain + 기존 application 오케스트레이터(playMancala) + gameEngine 타입에만 의존하고
// infrastructure/ui는 import 하지 않는다.
// playMancala/gameEngine/도메인 코드는 수정하지 않고 파생 계산만 한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import { playMancalaTurn } from "./playMancala";
import type { MancalaBoard, MancalaPlayer } from "../domain/mancala";
import {
  createMancalaBoard,
  findMancalaWinner,
  isMancalaGameOver,
  legalMancalaMoves,
} from "../domain/mancala";

/** 기본 구덩이 수(한쪽 6) / 구덩이당 씨앗(4). config로 덮어쓸 수 있다. */
const DEFAULT_PITS_PER_SIDE = 6;
const DEFAULT_SEEDS_PER_PIT = 4;

/**
 * 어댑터 전용 진행 상태.
 * playMancalaTurn은 보드 기반(board+player+pit→result)이라 진행 상태 객체가 없으므로
 * 여기서 "보드 + 다음에 둘 플레이어"를 묶어 GameEngine<S,M>의 S로 쓴다.
 */
export interface MancalaEngineState {
  /** domain MancalaBoard. */
  board: MancalaBoard;
  /** 다음에 둘 플레이어(1|2). 자기 곳간 한 번 더(again)면 같은 플레이어가 유지된다. */
  next: MancalaPlayer;
}

/** 만칼라 플레이어(1|2)를 게임 무관 Side로 매핑한다(선(先)=1=p1, 2=p2). */
function sideOf(player: MancalaPlayer): Side {
  return player === 1 ? "p1" : "p2";
}

/** init config가 { pitsPerSide?: number; seedsPerPit?: number } 형태면 해당 값을 추출한다. */
function configValue(
  config: unknown,
  key: "pitsPerSide" | "seedsPerPit",
): number | undefined {
  if (typeof config === "object" && config !== null && key in config) {
    const value = (config as Record<string, unknown>)[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}

/**
 * playMancala 오케스트레이터를 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 playMancalaTurn과 도메인 규약(불변·자기 곳간 한 번 더·포획·종료/쓸어담기)을 그대로 계승하며,
 * 마지막 씨앗이 자기 곳간에 떨어지면 같은 플레이어가 한 번 더 두는 보너스 턴을 turn(state)에 정확히 반영한다.
 *
 * @param pitsPerSide 한쪽 구덩이 수(기본 6). config.pitsPerSide가 있으면 그 값을 우선한다.
 * @param seedsPerPit 구덩이당 초기 씨앗 수(기본 4). config.seedsPerPit이 있으면 그 값을 우선한다.
 */
export function createMancalaEngine(
  pitsPerSide: number = DEFAULT_PITS_PER_SIDE,
  seedsPerPit: number = DEFAULT_SEEDS_PER_PIT,
): GameEngine<MancalaEngineState, number> {
  function status(state: MancalaEngineState): GameStatus {
    if (!isMancalaGameOver(state.board)) {
      return { over: false, winner: null, draw: false };
    }
    const winner = findMancalaWinner(state.board);
    // null은 동점(무승부), 1|2는 해당 Side 승리.
    if (winner === null) {
      return { over: true, winner: null, draw: true };
    }
    return { over: true, winner: sideOf(winner), draw: false };
  }

  function turn(state: MancalaEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: MancalaEngineState, move: number, by: Side): boolean {
    if (isMancalaGameOver(state.board)) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 구덩이 합법성은 도메인 legalMancalaMoves 기준으로만 판정(재구현 금지, throw 금지).
    return legalMancalaMoves(state.board, state.next).includes(move);
  }

  return {
    init(config?: unknown): MancalaEngineState {
      const pps = configValue(config, "pitsPerSide") ?? pitsPerSide;
      const spp = configValue(config, "seedsPerPit") ?? seedsPerPit;
      return { board: createMancalaBoard(pps, spp), next: 1 };
    },
    turn,
    isLegal,
    apply(state: MancalaEngineState, move: number, by: Side): MancalaEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createMancalaEngine.apply: illegal move");
      }
      const result = playMancalaTurn(state.board, state.next, move);
      // 한 번 더(again) 보장: 마지막 씨앗이 자기 곳간에 떨어지면 result.nextToMove===state.next →
      // turn이 같은 플레이어를 유지한다.
      return { board: result.board, next: result.nextToMove };
    },
    status,
  };
}
