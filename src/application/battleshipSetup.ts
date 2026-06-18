// Application layer: 배틀십(Battleship) 멀티(DoD B) "사격 이전 배치 setup" 단계 순수 모델.
// 표준 멀티 규칙은 각 플레이어가 자기 함대를 상대에게 보이지 않게 직접 배치한 뒤 사격을 시작한다.
// 사격 엔진(createBattleshipEngine.init)은 p1Ships·p2Ships를 한꺼번에 요구하므로(#587), 서로 독립된
// 두 사람이 각자 비공개로 배치하는 멀티 흐름을 표현할 수 없다. 이 모듈은 사격 엔진을 바꾸지 않고
// (#590 fog-of-war redaction·#587 엔진과 비충돌) 양측이 각자 배치를 제출하면 비로소 기존 엔진 상태를
// 생성하는, 전송 비종속 순수 application 단위를 추가한다.
//
// 레이어 규칙: application → domain만 import(infra/ui 미import). 도메인 규칙(겹침/범위/표준 함대)을
// 재구현하지 않고 isValidPlacement·STANDARD_FLEET·Ship을 재사용하고, 매치 생성도 기존
// createBattleshipEngine().init을 그대로 호출한다(재구현 금지). 입력 상태는 모두 불변(새 객체 반환).
import type { Side } from "./gameEngine";
import {
  createBattleshipEngine,
  type BattleshipEngineState,
} from "./battleshipEngine";
import { isValidPlacement, type Ship } from "../domain/battleship";

/**
 * 양측 비공개 배치 setup 상태.
 * - size: 격자 크기.
 * - fleet: 각 진영이 배치해야 할 함선 길이 목록(STANDARD_FLEET).
 * - p1Ships/p2Ships: 해당 진영이 제출한 함대. 미제출이면 null.
 */
export interface BattleshipSetupState {
  size: number;
  fleet: ReadonlyArray<number>;
  p1Ships: ReadonlyArray<Ship> | null;
  p2Ships: ReadonlyArray<Ship> | null;
}

/** submitFleet 결과: 채택 여부·거부 사유·결과 상태(불변). */
export interface SubmitFleetResult {
  ok: boolean;
  reason?: string;
  state: BattleshipSetupState;
}

/** 두 숫자 multiset(길이 목록)이 같은지(정렬 비교). */
function sameMultiset(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

/** 양측 미제출 상태로 setup을 시작한다(불변 새 객체). */
export function createBattleshipSetup(
  size: number,
  fleet: ReadonlyArray<number>,
): BattleshipSetupState {
  return {
    size,
    fleet: [...fleet],
    p1Ships: null,
    p2Ships: null,
  };
}

/**
 * 한 진영의 함대를 제출한다(불변 — 입력 setup을 변형하지 않고 새 상태를 반환).
 * 다음을 모두 만족할 때만 채택한다(실패 시 throw 없이 { ok:false, reason }로 거부, 입력 보존):
 * - 아직 양측 완료 전(완료 후 재제출 금지 — 매치가 이미 확정 가능 상태).
 * - 제출 ships의 길이(칸 수) multiset이 fleet 길이 목록과 일치.
 * - 도메인 isValidPlacement(범위·겹침)도 통과.
 * 유효하면 해당 side만 채택하고 상대 제출은 그대로 보존한다. 재제출은 (양측 완료 전까지) 허용.
 */
export function submitFleet(
  setup: BattleshipSetupState,
  side: Side,
  ships: ReadonlyArray<Ship>,
): SubmitFleetResult {
  if (isSetupComplete(setup)) {
    return { ok: false, reason: "이미 양측 배치가 완료되어 재제출할 수 없습니다", state: setup };
  }
  const sizes = ships.map((s) => s.size);
  if (!sameMultiset(sizes, setup.fleet)) {
    return {
      ok: false,
      reason: "제출 함대의 함선 길이 목록이 표준 함대와 일치하지 않습니다",
      state: setup,
    };
  }
  if (!isValidPlacement(setup.size, ships)) {
    return {
      ok: false,
      reason: "함선이 범위를 벗어나거나 서로 겹칩니다",
      state: setup,
    };
  }
  const accepted = ships.map((s) => ({ ...s }));
  const state: BattleshipSetupState =
    side === "p1"
      ? { ...setup, p1Ships: accepted }
      : { ...setup, p2Ships: accepted };
  return { ok: true, state };
}

/** 양측 모두 제출됐는지. */
export function isSetupComplete(setup: BattleshipSetupState): boolean {
  return setup.p1Ships !== null && setup.p2Ships !== null;
}

/**
 * setup이 완료(양측 제출)면 기존 사격 엔진 상태를 생성해 반환한다.
 * 사격 엔진을 재구현하지 않고 createBattleshipEngine().init({ size, p1Ships, p2Ships })를 그대로 호출한다.
 * 미완료면 throw.
 */
export function startBattleshipMatch(setup: BattleshipSetupState): BattleshipEngineState {
  if (!isSetupComplete(setup)) {
    throw new Error("startBattleshipMatch: 양측 배치가 완료되지 않았습니다");
  }
  return createBattleshipEngine().init({
    size: setup.size,
    p1Ships: setup.p1Ships,
    p2Ships: setup.p2Ships,
  });
}

/**
 * viewer 시점에서 본 가려진 setup을 반환한다(입력 불변·새 객체).
 * - viewer 자기 함대(p1→p1Ships, p2→p2Ships)는 그대로 노출한다.
 * - 상대 함대는 위치를 숨기되 '제출 여부'만 노출한다: 제출했으면 빈 배열([]), 미제출이면 null.
 *   (빈 배열 = "제출 완료(내용 비공개)" 신호. 실제 함선 좌표는 드러내지 않는다.)
 * setup 시작 후 방 런타임이 연결(side)별로 가린 뷰를 라우팅하는 데 쓴다.
 */
export function redactSetup(
  setup: BattleshipSetupState,
  viewer: Side,
): BattleshipSetupState {
  const hide = (ships: ReadonlyArray<Ship> | null): ReadonlyArray<Ship> | null =>
    ships === null ? null : [];
  const own = (ships: ReadonlyArray<Ship> | null): ReadonlyArray<Ship> | null =>
    ships === null ? null : ships.map((s) => ({ ...s }));
  return {
    size: setup.size,
    fleet: [...setup.fleet],
    p1Ships: viewer === "p1" ? own(setup.p1Ships) : hide(setup.p1Ships),
    p2Ships: viewer === "p2" ? own(setup.p2Ships) : hide(setup.p2Ships),
  };
}
