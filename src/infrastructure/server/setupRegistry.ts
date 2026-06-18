// Infrastructure layer: gameType → "사격 이전 비공개 배치(setup)" 어댑터 조회(registry).
// 방 런타임(room.ts)은 게임 무관이라 특정 게임을 직접 알지 않는다. setup이 필요한 게임만 여기서
// 어댑터를 제공한다(현재 battleship). 어댑터가 없으면 room은 기존처럼 2석 즉시 매치를 시작한다(회귀 없음).
//
// 레이어 규칙: infrastructure → application/domain 만 사용한다. 배치 검증/매치 생성 로직을
// 재구현하지 않고 application(battleshipSetup)·domain(STANDARD_FLEET) 단위를 호출만 한다.
import type { GameId } from "../../domain/gameRecord";
import type { GameEngine, Side } from "../../application/gameEngine";
import { STANDARD_FLEET, type Ship } from "../../domain/battleship";
import {
  DEFAULT_BATTLESHIP_SIZE,
  createBattleshipEngine,
} from "../../application/battleshipEngine";
import {
  createBattleshipSetup,
  submitFleet,
  isSetupComplete,
  startBattleshipMatch,
  redactSetup,
  type BattleshipSetupState,
} from "../../application/battleshipSetup";
import type { SetupAdapter, ResolveSetup } from "./room";

/** 네트워크 경계의 불투명 payload에서 함대(ships)를 방어적으로 추출한다(배열 아니면 빈 배열). */
function shipsFromPayload(payload: unknown): ReadonlyArray<Ship> {
  if (typeof payload === "object" && payload !== null && "ships" in payload) {
    const { ships } = payload as { ships: unknown };
    if (Array.isArray(ships)) {
      return ships as Ship[];
    }
  }
  // 형태가 어긋난 제출은 빈 함대로 넘겨 submitFleet이 ok:false로 결정적으로 거부하게 한다(throw 금지).
  return [];
}

/**
 * 배틀십 비공개 배치 setup 어댑터.
 * room의 게임 무관 SetupAdapter 포트를 battleshipSetup(application) 순수 단위로 위임 구현한다
 * (로직 재구현 없음): 표준 10×10·STANDARD_FLEET로 시작, side별 함대 제출 검증, 양측 완료 시
 * createBattleshipEngine 상태 생성, viewer별 안개 가림.
 */
const battleshipSetupAdapter: SetupAdapter = {
  create: () => createBattleshipSetup(DEFAULT_BATTLESHIP_SIZE, STANDARD_FLEET),
  submit: (setup: unknown, side: Side, payload: unknown) =>
    submitFleet(setup as BattleshipSetupState, side, shipsFromPayload(payload)),
  isComplete: (setup: unknown) => isSetupComplete(setup as BattleshipSetupState),
  start: (setup: unknown) => ({
    engine: createBattleshipEngine() as GameEngine<unknown, unknown>,
    state: startBattleshipMatch(setup as BattleshipSetupState),
  }),
  redact: (setup: unknown, viewer: Side) =>
    redactSetup(setup as BattleshipSetupState, viewer),
};

/**
 * gameType → setup 어댑터 조회. 비공개 배치가 필요한 battleship만 어댑터를 돌려주고,
 * 그 외 게임은 undefined(=setup 단계 없이 기존 흐름). reduceRoom의 RoomDeps.resolveSetup에 주입한다.
 */
export const resolveSetup: ResolveSetup = (gameType: GameId) =>
  gameType === "battleship" ? battleshipSetupAdapter : undefined;
