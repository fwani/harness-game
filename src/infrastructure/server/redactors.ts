// Infrastructure layer: gameType → gameState 시점 가림(fog-of-war) 함수 조회.
// wsTransport(ResolveRedact 포트)에 주입해, 각 연결의 side 기준으로 gameState를 가려 보낸다.
// 가림 규칙 자체는 application(battleshipEngine)의 순수 함수를 호출만 한다(재구현 없음).
import type { Side } from "../../application/gameEngine";
import type { GameId } from "../../domain/gameRecord";
import {
  redactBattleshipState,
  redactOpponentBoard,
  type BattleshipEngineState,
} from "../../application/battleshipEngine";
import type { ResolveRedact } from "./wsTransport";

/**
 * 배틀십 gameState를 viewer 시점으로 가린다.
 * - 좌석 플레이어(p1/p2): 자기 보드는 그대로, 상대 보드는 미사격 칸 함선 위치 숨김(redactBattleshipState).
 * - 관전자(null): 양쪽 보드의 미사격 칸 함선을 모두 숨긴다(어느 함대도 노출 금지).
 */
function redactBattleshipForViewer(state: unknown, viewer: Side | null): unknown {
  const s = state as BattleshipEngineState;
  if (viewer === null) {
    return {
      p1Board: redactOpponentBoard(s.p1Board),
      p2Board: redactOpponentBoard(s.p2Board),
      next: s.next,
    };
  }
  return redactBattleshipState(s, viewer);
}

/**
 * 기본 가림 조회: 안개(fog-of-war)가 필요한 battleship만 가림 함수를 돌려주고, 그 외 게임은
 * undefined(=가림 없이 그대로 전달). wsTransport.resolveRedact에 주입한다.
 */
export const resolveRedact: ResolveRedact = (gameType: GameId) =>
  gameType === "battleship" ? redactBattleshipForViewer : undefined;
