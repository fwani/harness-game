// Application layer: orchestrates a single 2-player Go game. Depends on domain only.
// 바둑(Go)의 2인 교대 착수 + 패스 + 연속 2회 패스 종료 + 색깔별 포획 누계를 진행한다.
// 계가(점수)·집(territory)·패(ko) 반복 금지는 이 모듈 범위 밖이다.
import { createBoard, placeStone, type Board, type Stone } from "../domain/go";

export interface GoState {
  board: Board;
  /** 다음에 둘 차례. 시작은 "black". */
  next: Stone;
  /** 색깔별 누적 포획 수(상대 돌을 잡은 개수). */
  captures: { black: number; white: number };
  /** 직전 수가 패스였는지. 연속 2회 패스면 종료. */
  lastWasPass: boolean;
  /** 게임 종료 여부(연속 2회 패스 시 true). */
  finished: boolean;
}

/** 상대 색으로 토글한다. */
function opponent(stone: Stone): Stone {
  return stone === "black" ? "white" : "black";
}

/** size×size 빈 보드로 새 게임을 시작한다(흑 선). 기본 19. */
export function startGame(size?: number): GoState {
  return {
    board: createBoard(size),
    next: "black",
    captures: { black: 0, white: 0 },
    lastWasPass: false,
    finished: false,
  };
}

/**
 * 현재 차례(state.next)의 돌을 (x,y)에 둔 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 종료(finished)면 throw.
 * - placeStone이 throw하는 경우(범위 밖/이미 점유/자살수)는 그대로 전파한다.
 * - 포획이 발생하면 착수한 색의 captures 에 누계, lastWasPass=false 로, next 를 상대 색으로 토글한다.
 */
export function applyMove(state: GoState, x: number, y: number): GoState {
  if (state.finished) {
    throw new Error("applyMove: game already finished");
  }
  const stone = state.next;
  const { board, captured } = placeStone(state.board, x, y, stone);
  return {
    board,
    next: opponent(stone),
    captures: {
      ...state.captures,
      [stone]: state.captures[stone] + captured,
    },
    lastWasPass: false,
    finished: false,
  };
}

/**
 * 현재 차례가 패스한 새 상태를 반환한다(불변).
 * - 이미 종료면 throw.
 * - 직전이 패스였다면(lastWasPass=true) finished=true 로 종료, 아니면 lastWasPass=true 로 두고 next 토글.
 */
export function pass(state: GoState): GoState {
  if (state.finished) {
    throw new Error("pass: game already finished");
  }
  if (state.lastWasPass) {
    return {
      ...state,
      captures: { ...state.captures },
      lastWasPass: true,
      finished: true,
    };
  }
  return {
    ...state,
    captures: { ...state.captures },
    next: opponent(state.next),
    lastWasPass: true,
    finished: false,
  };
}
