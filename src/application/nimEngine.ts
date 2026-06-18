// Application layer: game-agnostic GameEngine adapter for Nim (님 / 표준 플레이).
// 님 도메인(src/domain/nim)을 게임 무관 GameEngine 계약으로 감싼다.
// domain nim + gameEngine 타입에만 의존하고 infrastructure/ui는 import 하지 않는다.
// 도메인 규칙(합법 수·적용·승자 판정)을 재구현하지 않고 그대로 재사용한다(레이어 규칙 준수).
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import type { NimMove, NimPiles, NimPlayer } from "../domain/nim";
import {
  applyNimMove,
  createNimPiles,
  findNimWinner,
  isLegalNimMove,
  isNimGameOver,
} from "../domain/nim";

/** 표준 초기 더미 배치(config 미지정 시). */
const DEFAULT_SIZES: ReadonlyArray<number> = [3, 5, 7];

/**
 * 어댑터 전용 진행 상태.
 * 도메인 함수는 더미(piles) 기반(piles+move→piles)이라 진행 상태 객체가 없으므로
 * 여기서 "더미 + 다음에 둘 플레이어"를 묶어 GameEngine<S,M>의 S로 쓴다.
 */
export interface NimEngineState {
  /** 현재 더미(domain NimPiles). */
  piles: NimPiles;
  /** 다음에 둘 플레이어(1=선/p1, 2=후/p2). */
  next: NimPlayer;
}

/** 님 플레이어(1|2)를 게임 무관 Side로 매핑한다(선(先)=1=p1, 2=p2). */
function sideOf(player: NimPlayer): Side {
  return player === 1 ? "p1" : "p2";
}

/** 상대 플레이어로 전환한다. */
function opponent(player: NimPlayer): NimPlayer {
  return player === 1 ? 2 : 1;
}

/** init config가 { sizes?: number[] } 형태면 sizes를 추출한다. */
function sizesFromConfig(config: unknown): number[] | undefined {
  if (typeof config === "object" && config !== null && "sizes" in config) {
    const sizes = (config as { sizes?: unknown }).sizes;
    if (Array.isArray(sizes) && sizes.every((s) => typeof s === "number")) {
      return sizes as number[];
    }
  }
  return undefined;
}

/**
 * 님 도메인을 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 기존 도메인 규약(불변·합법 수·마지막 돌 승자)을 그대로 계승하며, 도메인/엔진 코드는
 * 수정하지 않고 파생 계산만 한다.
 * - init(config?): config가 { sizes?: number[] }면 createNimPiles(sizes), 없으면 기본 [3,5,7], next=1.
 * - turn: sideOf(next).
 * - isLegal: 종료가 아니고 by===turn이며 도메인 isLegalNimMove(piles, move)일 때만 true.
 * - apply: applyNimMove로 더미 갱신, next를 상대로 전환(불법 수면 throw).
 * - status: isNimGameOver면 over=true, winner=마지막에 둔 쪽(state.next의 상대)의 Side. 무승부 없음(draw 항상 false).
 */
export function createNimEngine(): GameEngine<NimEngineState, NimMove> {
  function status(state: NimEngineState): GameStatus {
    if (!isNimGameOver(state.piles)) {
      return { over: false, winner: null, draw: false };
    }
    // 종료 상태에서 마지막에 둔 쪽은 state.next의 상대다(apply가 next를 상대로 전환하므로).
    const lastToMove = opponent(state.next);
    // 님은 무승부가 없다. 종료면 마지막에 둔 쪽이 항상 승자.
    const winner = findNimWinner(state.piles, lastToMove);
    return { over: true, winner: winner === null ? null : sideOf(winner), draw: false };
  }

  function turn(state: NimEngineState): Side {
    return sideOf(state.next);
  }

  function isLegal(state: NimEngineState, move: NimMove, by: Side): boolean {
    if (isNimGameOver(state.piles)) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    // 합법성은 도메인 isLegalNimMove 기준으로만 판정(재구현 금지, throw 금지).
    return isLegalNimMove(state.piles, move);
  }

  return {
    init(config?: unknown): NimEngineState {
      const sizes = sizesFromConfig(config) ?? DEFAULT_SIZES.slice();
      return { piles: createNimPiles(sizes), next: 1 };
    },
    turn,
    isLegal,
    apply(state: NimEngineState, move: NimMove, by: Side): NimEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createNimEngine.apply: illegal move");
      }
      return { piles: applyNimMove(state.piles, move), next: opponent(state.next) };
    },
    status,
  };
}
