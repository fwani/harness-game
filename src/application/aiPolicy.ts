// Application layer: game-agnostic AI move-selection port.
// "AI 차례에 한 수를 고른다"를 게임 무관 포트(AiPolicy<S,M>)로 통일한다. 이후
// Match(#504)가 사람/AI를 동일 코드 경로(chooseMove)로 진행할 수 있고, self-play/
// vs-CPU도 같은 추상 위에 얹힌다. domain 및 기존 application(gameEngine·gomokuAi·
// dealCards 포트)에만 의존하고 infrastructure는 import 하지 않는다(난수는 주입).
import type { Side } from "./gameEngine";
import type { RandomSource } from "./dealCards";
import {
  chooseRandomGomokuMove,
  type GomokuMove,
} from "./gomokuAi";
import type { GomokuState } from "./playGomoku";

/**
 * 게임 무관 AI 수 선택 포트.
 * 현재 상태에서 side가 둘 한 수를 고른다(순수/주입 난수 사용, throw 금지 권장 —
 * 단, 합법 수가 없는 등 정상 진행이 불가한 입력은 하위 선택기의 throw를 전파할 수 있다).
 */
export interface AiPolicy<S, M> {
  chooseMove(state: S, side: Side): M;
}

/**
 * 임의의 (state, side) 선택 함수를 AiPolicy 포트로 승격한다(얇은 어댑터).
 * - pick을 그대로 위임한다(변형/래핑 없이 인자·반환을 통과).
 * - playEngineGame(engine, policy.chooseMove)에 그대로 결합할 수 있다.
 */
export function aiPolicyFromChooser<S, M>(
  pick: (state: S, side: Side) => M,
): AiPolicy<S, M> {
  return {
    chooseMove(state: S, side: Side): M {
      return pick(state, side);
    },
  };
}

/**
 * 기존 chooseRandomGomokuMove(board, rng)를 GomokuState 기반 AiPolicy로 어댑트한 레퍼런스 구현.
 * - 합법(빈) 착수 지점 중 하나를 주입된 RandomSource로 균등하게 고른다(side와 무관 —
 *   차례는 이미 state에 반영돼 있고 무작위 정책은 진영을 구분하지 않는다).
 * - 시드 고정 RandomSource면 결정적으로 같은 수를 고른다.
 * - 합법 수가 없으면(보드 가득) 하위 선택기의 throw를 그대로 전파한다.
 * - 입력 state/board를 변형하지 않으며, 도메인/기존 선택기 코드는 수정하지 않고 재사용한다.
 */
export function createRandomGomokuAiPolicy(
  rng: RandomSource,
): AiPolicy<GomokuState, GomokuMove> {
  return {
    chooseMove(state: GomokuState): GomokuMove {
      return chooseRandomGomokuMove(state.board, rng);
    },
  };
}
