// Application layer: game-agnostic self-play driver.
// 엔진 어댑터(GameEngine<S,M>)와 수 선택 콜백만 주면 한 판을 종국까지 자동으로
// 진행시키는 게임 무관 드라이버다. domain 및 기존 application(gameEngine)에만
// 의존하고 infrastructure는 import 하지 않는다. 난수는 직접 다루지 않으며, 수
// 선택은 호출자가 주입하는 콜백에 위임한다(예: chooseRandomGomokuMove에 자기
// RandomSource를 묶어 전달). 엔진/도메인 코드는 수정하지 않고 파생 진행만 한다.
import type { GameEngine, Side, GameStatus } from "./gameEngine";

export interface EngineGameResult<S> {
  /** 종국 시점 상태. */
  finalState: S;
  /** 최종 status(이미 종료 입력이 아니면 over=true). */
  status: GameStatus;
  /** 적용된 수의 개수. */
  moveCount: number;
}

/** 무한 루프를 막는 기본 최대 수(maxMoves 미지정 시). */
const DEFAULT_MAX_MOVES = 10000;

/**
 * 엔진 어댑터 + 수 선택 콜백으로 한 판을 종국까지 자동 진행한다(불변·결정적).
 * - `state = engine.init(options?.config)` 로 시작한다.
 * - `engine.status(state).over` 가 true가 될 때까지 반복:
 *   `side = engine.turn(state)` → `move = chooseMove(state, side)` →
 *   적용 전 `engine.isLegal(state, move, side)` 가 false면 throw(불법 수 선택기 보호) →
 *   `engine.apply(state, move, side)` 로 상태 전이, moveCount 증가.
 * - 적용된 수가 maxMoves(기본 10000)를 초과하면 throw 하여 무한 루프를 막는다.
 * - 이미 종료 상태로 시작하면 즉시 moveCount:0 결과를 반환한다(throw 하지 않는다).
 * - 입력 engine/콜백을 변형하지 않으며, 각 전이는 엔진의 불변 규약(새 상태 반환)을 계승한다.
 * - 동일 엔진 + 결정적 콜백이면 항상 동일 결과.
 */
export function playEngineGame<S, M>(
  engine: GameEngine<S, M>,
  chooseMove: (state: S, side: Side) => M,
  options?: { config?: unknown; maxMoves?: number },
): EngineGameResult<S> {
  const maxMoves = options?.maxMoves ?? DEFAULT_MAX_MOVES;

  let state = engine.init(options?.config);
  let moveCount = 0;

  while (!engine.status(state).over) {
    if (moveCount >= maxMoves) {
      throw new Error(
        `playEngineGame: exceeded maxMoves (${maxMoves}) without reaching a terminal state`,
      );
    }
    const side = engine.turn(state);
    const move = chooseMove(state, side);
    if (!engine.isLegal(state, move, side)) {
      throw new Error("playEngineGame: chooseMove returned an illegal move");
    }
    state = engine.apply(state, move, side);
    moveCount += 1;
  }

  return { finalState: state, status: engine.status(state), moveCount };
}
