// Infrastructure layer: 전송 수단 비종속(transport-agnostic) 인메모리 "멀티룸 레지스트리".
// 단일 방 리듀서 `reduceRoom`(#526) 위에, **여러 방을 코드로 관리하고 연결(connId)을 올바른
// 방으로 라우팅**하는 순수·결정적 계층이다. 실제 native ws 소켓 바인딩·연결 수명주기는 이 모듈
// 범위 밖(후속 이슈)이며, 여기서는 네트워크/소켓 라이브러리를 import하지 않는다.
//
// 레이어 규칙: infrastructure -> application -> domain 만 사용한다. 메시지 검증은 application
// 가드(`isClientMessage`)와 `parseEngineMove`(#529)를 재사용하고, 방/매치 규칙은 `reduceRoom`에
// 위임한다(재구현 금지). 식별값(connId)은 호출자가 주입하는 불투명 문자열로만 다루고, 민감정보를
// 본문/로그/리터럴에 넣지 않는다.
import { isClientMessage, type ServerMessage } from "../../application/protocol";
import { parseEngineMove } from "../../application/moveCodec";
import type { GameId } from "../../domain/gameRecord";
import {
  createRoom,
  reduceRoom,
  type Outbound,
  type RoomDeps,
  type RoomState,
} from "./room";

/**
 * 레지스트리가 외부 의존을 받는 통로. `reduceRoom`의 `RoomDeps`(엔진 해석 `resolveEngine` 필수,
 * 선택적 setup 해석 `resolveSetup`)를 그대로 잇고, 레지스트리 전용으로 `defaultGameType`을 더한다.
 * 시간·난수·소켓 없음.
 */
export interface RegistryDeps extends RoomDeps {
  /**
   * 없는 코드로 joinRoom이 왔을 때 자동으로 방을 열 gameType(옵트인). 현 joinRoom 프로토콜에는
   * gameType이 없으므로(방은 코드로만 식별), 이 값이 있을 때만 자동 생성한다. 없으면 미오픈 방
   * joinRoom은 `room_not_found`로 거부한다(방은 `openRoom`으로 gameType과 함께 연다).
   */
  defaultGameType?: GameId;
}

/**
 * 멀티룸 레지스트리 상태(불변). 방 코드별 `RoomState`와 connId→방 코드 매핑을 보관한다.
 * connRoom은 disconnect 시(코드 인자 없이) 해당 연결이 속한 방을 찾기 위한 역인덱스다.
 */
export interface RegistryState {
  /** code -> 방 상태. */
  rooms: ReadonlyMap<string, RoomState>;
  /** connId -> 그 연결이 입장한 방 코드. */
  connRoom: ReadonlyMap<string, string>;
}

/** `to: "all"`을 실제 수신자 connId로 해소한 결과 메시지 1건. */
export interface AddressedOut {
  connId: string;
  message: ServerMessage;
}

/** dispatch/disconnect의 결과: 다음 레지스트리 상태 + 실제 수신자로 해소한 메시지 목록(둘 다 새 값). */
export interface DispatchResult {
  state: RegistryState;
  outbound: ReadonlyArray<AddressedOut>;
}

/** 빈 레지스트리(방·매핑 없음)를 생성한다. */
export function createRegistry(): RegistryState {
  return { rooms: new Map(), connRoom: new Map() };
}

/**
 * 방 코드로 특정 gameType의 방을 연다(매치메이킹/로비가 코드 발급 시 사용). 이미 같은 코드의
 * 방이 있으면 변화 없이 그대로 반환한다(멱등). 이후 그 코드로 joinRoom하면 이 gameType의 매치가
 * 시작된다. (joinRoom 프로토콜에는 gameType이 없으므로, 실제 게임을 가진 방은 이 진입점으로 만든다.)
 */
export function openRoom(
  state: RegistryState,
  code: string,
  gameType: RoomState["gameType"],
): RegistryState {
  if (state.rooms.has(code)) {
    return state;
  }
  const rooms = new Map(state.rooms);
  rooms.set(code, createRoom(code, gameType));
  return { rooms, connRoom: state.connRoom };
}

/** 방에 현재 접속한 모든 connId(좌석 + 관전자). `to:"all"` 해소의 수신자 집합. */
function roomConnIds(room: RoomState): string[] {
  return [...room.seats.map((s) => s.connId), ...room.spectators];
}

/**
 * reduceRoom의 `Outbound[]`를 실제 수신자 connId 목록으로 해소한다.
 * `to:"all"`은 (전이된) 방에 접속한 모든 connId로 확장하고, 특정 connId 대상은 그대로 둔다.
 */
function resolveOutbound(room: RoomState, outbound: ReadonlyArray<Outbound>): AddressedOut[] {
  const out: AddressedOut[] = [];
  for (const o of outbound) {
    if (o.to === "all") {
      for (const connId of roomConnIds(room)) {
        out.push({ connId, message: o.message });
      }
    } else {
      out.push({ connId: o.to, message: o.message });
    }
  }
  return out;
}

/** 특정 connId에게만 보내는 error 1건 결과(레지스트리 상태 불변). */
function errorResult(state: RegistryState, connId: string, reason: string): DispatchResult {
  return { state, outbound: [{ connId, message: { type: "error", reason } }] };
}

/** 방이 비었는가(좌석·관전자 모두 없음). 빈 방은 dispatch/disconnect 후 정리(remove)한다. */
function isEmptyRoom(room: RoomState): boolean {
  return room.seats.length === 0 && room.spectators.length === 0;
}

/**
 * 한 방에 대한 reduceRoom 전이를 적용하고 레지스트리 상태(rooms/connRoom)를 불변 갱신한다.
 * - joinRoom: connId→code 매핑 등록.
 * - leaveRoom: connId→code 매핑 제거.
 * - 전이 후 빈 방은 rooms에서 제거한다.
 */
function applyReduce(
  state: RegistryState,
  code: string,
  room: RoomState,
  connId: string,
  msg: Parameters<typeof reduceRoom>[2],
  deps: RegistryDeps,
): DispatchResult {
  const result = reduceRoom(room, connId, msg, deps);

  const rooms = new Map(state.rooms);
  if (isEmptyRoom(result.room)) {
    rooms.delete(code);
  } else {
    rooms.set(code, result.room);
  }

  const connRoom = new Map(state.connRoom);
  if (msg.type === "joinRoom") {
    connRoom.set(connId, code);
  } else if (msg.type === "leaveRoom") {
    connRoom.delete(connId);
  }

  return {
    state: { rooms, connRoom },
    outbound: resolveOutbound(result.room, result.outbound),
  };
}

/**
 * 한 연결(connId)이 방 코드(code)로 보낸 원시 메시지(raw, JSON 파싱 결과)를 처리한다.
 * 1) `isClientMessage`로 형태 검증(실패 시 해당 connId에 error 1건).
 * 2) makeMove면 `parseEngineMove`로 move 형태/멀티지원 검증(실패 시 그 connId에 code error).
 * 3) joinRoom이면 해당 코드의 방이 없으면 createRoom으로 생성, 그 외 메시지는 방이 있어야 한다.
 * 4) `reduceRoom`에 위임하고, 결과의 `to:"all"`을 방의 모든 connId로 해소해 반환한다.
 * 순수·결정적 — 입력 state를 변형하지 않고 새 값을 반환한다.
 */
export function dispatch(
  state: RegistryState,
  connId: string,
  code: string,
  raw: unknown,
  deps: RegistryDeps,
): DispatchResult {
  if (!isClientMessage(raw)) {
    return errorResult(state, connId, "invalid_message");
  }
  let msg = raw;

  // makeMove의 move는 직렬화 형태가 게임별이라, 위임 전에 형태/멀티지원을 검증한다(#529).
  if (msg.type === "makeMove") {
    const parsed = parseEngineMove(msg.gameType, msg.move);
    if (!parsed.ok) {
      return errorResult(state, connId, parsed.code);
    }
    // 통과한(정규화된) move로 교체해 위임한다.
    msg = { ...msg, move: parsed.move };
  }

  // 대상 방 확보: 존재하면 그 방, 없으면 joinRoom + defaultGameType일 때만 자동 생성.
  let room = state.rooms.get(code);
  if (room === undefined) {
    if (msg.type !== "joinRoom" || deps.defaultGameType === undefined) {
      return errorResult(state, connId, "room_not_found");
    }
    room = createRoom(code, deps.defaultGameType);
  }

  return applyReduce(state, code, room, connId, msg, deps);
}

/**
 * 연결 종료(disconnect)를 leaveRoom으로 합성 처리한다. connId가 속한 방을 connRoom으로 찾아
 * 좌석·관전자·매핑에서 제거하고, 빈 방은 정리한다. 어느 방에도 없으면 변화 없음(빈 결과).
 */
export function disconnect(
  state: RegistryState,
  connId: string,
  deps: RegistryDeps,
): DispatchResult {
  const code = state.connRoom.get(connId);
  if (code === undefined) {
    return { state, outbound: [] };
  }
  const room = state.rooms.get(code);
  if (room === undefined) {
    // 방은 없는데 매핑만 남은 경우(정상 흐름에선 도달 불가): 매핑만 정리.
    const connRoom = new Map(state.connRoom);
    connRoom.delete(connId);
    return { state: { rooms: state.rooms, connRoom }, outbound: [] };
  }
  return applyReduce(state, code, room, connId, { type: "leaveRoom" }, deps);
}
