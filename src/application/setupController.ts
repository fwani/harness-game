// Application layer: game-agnostic "사격 이전 비공개 배치(pre-match setup)" 단계 포트 + 배틀십 배선.
// 방 런타임(infrastructure/server/room)은 특정 게임을 직접 알지 않은 채, gameType으로 선택적
// SetupController를 해소해 매치 시작 전 비공개 배치 흐름을 얹는다. setup이 필요 없는 게임은
// 해소 결과가 undefined이며 기존처럼 2인 착석 즉시 매치를 시작한다(회귀 없음).
//
// 레이어 규칙: application → domain만 import(infra/ui 미import). 배틀십 setup 로직은
// battleshipSetup.ts(#593)의 순수 단위를 재사용만 하고 재구현하지 않는다.
import type { Side } from "./gameEngine";
import type { GameId } from "../domain/gameRecord";
import {
  createBattleshipSetup,
  submitFleet,
  isSetupComplete,
  startBattleshipMatch,
  redactSetup,
} from "./battleshipSetup";
import { DEFAULT_BATTLESHIP_SIZE } from "./battleshipEngine";
import { STANDARD_FLEET, type Ship } from "../domain/battleship";

/** submit 결과: 채택 여부·거부 사유(안정 코드 매핑은 호출부)·결과 상태(불변). */
export interface SetupSubmitResult<Setup> {
  ok: boolean;
  reason?: string;
  state: Setup;
}

/**
 * 매치 시작 전 선택적 비공개 배치(setup) 단계 어댑터(게임 무관 포트).
 * 방 런타임은 이 포트만 호출하며 게임별 배치 규칙을 알지 못한다. 모든 메서드는 입력 불변·결정적.
 * - create(): 양측 미제출 초기 setup 상태.
 * - submit(setup, side, submission): 한 side 제출 처리(거부는 ok:false, throw 금지).
 * - isComplete(setup): 양측 제출 완료 여부.
 * - startState(setup): 완료된 setup으로 만든 엔진 초기 상태(미완료면 throw).
 * - redact(setup, viewer): viewer 시점 가린 뷰(상대 비공개 데이터 누수 금지).
 */
export interface SetupController<Setup = unknown, Submission = unknown> {
  create(): Setup;
  submit(setup: Setup, side: Side, submission: Submission): SetupSubmitResult<Setup>;
  isComplete(setup: Setup): boolean;
  startState(setup: Setup): unknown;
  redact(setup: Setup, viewer: Side): Setup;
}

/** gameType → SetupController 조회(setup 단계가 없는 게임이면 undefined). */
export type ResolveSetup = (gameType: GameId) => SetupController | undefined;

/** 전송 경계에서 들어온 임의 값이 Ship 형태인지(좌표/길이/방향). 규칙 검증은 도메인이 한다. */
function isShipLike(value: unknown): value is Ship {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.row === "number" &&
    typeof v.col === "number" &&
    typeof v.size === "number" &&
    (v.orientation === "h" || v.orientation === "v")
  );
}

/**
 * 배틀십 비공개 배치 setup 어댑터를 만든다. battleshipSetup.ts의 순수 단위를 재사용만 한다.
 * submission은 전송 경계에서 들어온 unknown이므로 Ship[] 형태를 먼저 sanitize하고(throw 방지),
 * 범위·겹침·표준 함대 일치 등 실제 규칙 검증은 submitFleet(=isValidPlacement)에 위임한다.
 */
export function createBattleshipSetupController(): SetupController {
  return {
    create: () => createBattleshipSetup(DEFAULT_BATTLESHIP_SIZE, STANDARD_FLEET),
    submit: (setup, side: Side, submission: unknown) => {
      const state = setup as ReturnType<typeof createBattleshipSetup>;
      if (!Array.isArray(submission) || !submission.every(isShipLike)) {
        return {
          ok: false,
          reason: "제출 함대 형식이 올바르지 않습니다(함선 좌표/길이/방향)",
          state,
        };
      }
      return submitFleet(state, side, submission);
    },
    isComplete: (setup) =>
      isSetupComplete(setup as ReturnType<typeof createBattleshipSetup>),
    startState: (setup) =>
      startBattleshipMatch(setup as ReturnType<typeof createBattleshipSetup>),
    redact: (setup, viewer: Side) =>
      redactSetup(setup as ReturnType<typeof createBattleshipSetup>, viewer),
  };
}

/**
 * gameType → SetupController 게임 무관 해소기. 현재 비공개 배치 setup이 필요한 게임은
 * battleship뿐이며, 그 외 게임은 undefined(=2인 착석 즉시 매치 시작, 회귀 없음).
 */
export const resolveSetupFor: ResolveSetup = (gameType) =>
  gameType === "battleship" ? createBattleshipSetupController() : undefined;
