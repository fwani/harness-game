// Application layer: 전송 수단 비종속(transport-agnostic) 멀티플레이 프로토콜 메시지 타입.
// 클라이언트↔서버가 주고받는 메시지의 판별 유니온(discriminated union)과, 네트워크
// 경계에서 신뢰할 수 없는 입력을 막는 최소 런타임 검증 가드만 정의한다.
//
// 범위(동결 규칙 준수):
// - 소켓/서버 본체·방 런타임·State 직렬화 형식은 이 모듈 범위 밖(단계 4 이후 별도 이슈).
//   따라서 `gameState.state`/`makeMove.move`의 페이로드는 `unknown`(JSON 패스스루)으로 둔다.
// - domain만 의존한다(infrastructure/ui/네트워크 의존 없음). `Side`/`GameStatus`는 기존
//   gameEngine.ts, `GameId`/`GameRecord`/`PlayerOutcome`는 domain/gameRecord에서 재사용한다
//   (중복 정의 금지).
import type { Side, GameStatus } from "./gameEngine";
import type { GameId, GameRecord, Outcome, PlayerOutcome } from "../domain/gameRecord";

/** 방 점유자 1명의 요약(민감정보 아님: side/kind/label). */
export interface RoomPlayerInfo {
  /** 진영. "p1"(선) | "p2". */
  side: Side;
  kind: "human" | "ai";
  /** 표시 이름(호출자 주입). */
  label: string;
}

/** 클라이언트 → 서버 메시지. `type`로 판별한다. */
export type ClientMessage =
  | { type: "joinRoom"; roomCode: string }
  | { type: "makeMove"; gameType: GameId; move: unknown }
  | { type: "submitSetup"; gameType: GameId; payload: unknown }
  | { type: "leaveRoom" }
  | { type: "requestRematch" };

/** 서버 → 클라이언트 메시지. `type`로 판별한다. */
export type ServerMessage =
  | { type: "roomState"; roomCode: string; players: RoomPlayerInfo[] }
  | { type: "gameState"; gameType: GameId; state: unknown; status: GameStatus; turn: Side }
  | { type: "setupState"; gameType: GameId; setup: unknown }
  | { type: "error"; reason: string }
  | { type: "gameOver"; record: GameRecord };

// ──────────────────────────────────────────────────────────────────────────
// 런타임 검증 가드 (네트워크 경계용). throw하지 않고 boolean으로만 판정한다.
// 알 수 없는 `type`·필드 누락·잘못된 페이로드는 거부한다.
// ──────────────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSide(value: unknown): value is Side {
  return value === "p1" || value === "p2";
}

function isOutcome(value: unknown): value is Outcome {
  return value === "win" || value === "loss" || value === "draw";
}

/**
 * `gameType` 디스크리미네이터 가드. GameId는 domain의 타입(런타임 목록 없음)이라,
 * 여기서는 비어있지 않은 문자열인지만 검증한다(구체 게임 화이트리스트는 핸들러 책임).
 */
function isGameId(value: unknown): value is GameId {
  return isNonEmptyString(value);
}

function isGameStatus(value: unknown): value is GameStatus {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.over === "boolean" &&
    typeof value.draw === "boolean" &&
    (value.winner === null || isSide(value.winner))
  );
}

function isPlayerOutcome(value: unknown): value is PlayerOutcome {
  return isRecord(value) && isNonEmptyString(value.player) && isOutcome(value.result);
}

function isGameRecord(value: unknown): value is GameRecord {
  if (!isRecord(value)) {
    return false;
  }
  if (!isGameId(value.game)) {
    return false;
  }
  // GameRecord 불변: 정확히 2개의 PlayerOutcome(2인 기준).
  const { outcomes } = value;
  return Array.isArray(outcomes) && outcomes.length === 2 && outcomes.every(isPlayerOutcome);
}

function isRoomPlayerInfo(value: unknown): value is RoomPlayerInfo {
  return (
    isRecord(value) &&
    isSide(value.side) &&
    (value.kind === "human" || value.kind === "ai") &&
    isNonEmptyString(value.label)
  );
}

/**
 * 임의의 값이 유효한 `ClientMessage`인지 판정한다(throw 금지).
 * 알 수 없는 type·필드 누락·잘못된 페이로드는 false.
 * 주의: `makeMove.move`는 직렬화 형식 미확정이라 존재(any)만 확인한다("move" in 객체).
 */
export function isClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "joinRoom":
      return isNonEmptyString(value.roomCode);
    case "makeMove":
      return isGameId(value.gameType) && "move" in value;
    case "submitSetup":
      // payload(배치 등)는 게임별 직렬화 형식이 미확정이라 존재(any)만 확인한다("payload" in 객체).
      return isGameId(value.gameType) && "payload" in value;
    case "leaveRoom":
    case "requestRematch":
      return true;
    default:
      return false;
  }
}

/**
 * 임의의 값이 유효한 `ServerMessage`인지 판정한다(throw 금지).
 * 알 수 없는 type·필드 누락·잘못된 페이로드는 false.
 * 주의: `gameState.state`는 직렬화 형식 미확정이라 존재(any)만 확인한다("state" in 객체).
 */
export function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "roomState":
      return (
        isNonEmptyString(value.roomCode) &&
        Array.isArray(value.players) &&
        value.players.every(isRoomPlayerInfo)
      );
    case "gameState":
      return (
        isGameId(value.gameType) &&
        "state" in value &&
        isGameStatus(value.status) &&
        isSide(value.turn)
      );
    case "setupState":
      // setup(가린 배치 뷰)은 게임별 직렬화 형식이 미확정이라 존재(any)만 확인한다("setup" in 객체).
      return isGameId(value.gameType) && "setup" in value;
    case "error":
      return isNonEmptyString(value.reason);
    case "gameOver":
      return isGameRecord(value.record);
    default:
      return false;
  }
}
