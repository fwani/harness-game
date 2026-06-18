// Infrastructure layer: 전송 수단 비종속(transport-agnostic) 인메모리 방(Room) 런타임.
// `ClientMessage`를 받아 방 상태를 전이하고, 누구에게 어떤 `ServerMessage`를 보내야 하는지를
// 산출하는 순수·결정적 리듀서다. 실제 소켓(native ws) 전송·연결 수명주기는 이 모듈 범위 밖
// (후속 이슈)이며, 여기서는 네트워크/소켓 라이브러리를 import하지 않는다.
//
// 레이어 규칙: infrastructure -> application -> domain 만 사용한다. 규칙·매치 진행은
// application(match/gameEngine/protocol)에 위임하고 재구현하지 않는다. 엔진 해석은
// 호출자가 주입(ResolveEngine)하므로 레지스트리(#525)에 하드 결합하지 않는다.
//
// 식별값(connId)은 호출자가 주입하는 불투명 문자열로만 다루고, 민감정보를 본문/로그/리터럴에
// 넣지 않는다. 좌석 표시 라벨은 side에서 결정적으로 파생한다(개인정보 아님).
import type { GameEngine, Side } from "../../application/gameEngine";
import {
  createMatch,
  createMatchFromState,
  applyMatchMove,
  currentTurn,
  matchStatus,
  buildMatchRecord,
  MatchMoveError,
  type MatchState,
  type Player,
} from "../../application/match";
import type {
  ClientMessage,
  ServerMessage,
  RoomPlayerInfo,
} from "../../application/protocol";
import type { GameId } from "../../domain/gameRecord";

/** gameType→엔진 어댑터 조회(미지원/멀티 비허용이면 undefined). #525 레지스트리가 이 포트를 구현한다. */
export type ResolveEngine = (
  gameType: GameId,
  config?: unknown,
) => GameEngine<unknown, unknown> | undefined;

/**
 * 게임별 "사격 이전(pre-match) 비공개 배치(setup)" 어댑터.
 * room은 특정 게임을 직접 알지 않으므로(게임 무관 유지), setup이 필요한 게임만 이 포트를 제공한다.
 * 모든 메서드는 순수·결정적이며 입력 상태(불투명 setup)를 변형하지 않는다. setup 상태/제출 payload/가린
 * 뷰의 구체 형식은 게임별이라 room 입장에선 모두 불투명(`unknown`)이다(makeMove.move와 동형).
 */
export interface SetupAdapter {
  /** 새 setup 상태를 시작한다(양측 미제출). */
  create(): unknown;
  /**
   * 한 side의 제출을 적용한다(입력 setup 불변). 유효하면 ok:true·갱신된 state,
   * 아니면 ok:false(입력 보존). reason은 진단용 메시지(선택).
   */
  submit(
    setup: unknown,
    side: Side,
    payload: unknown,
  ): { ok: boolean; reason?: string; state: unknown };
  /** 양측 제출이 끝나 매치를 시작할 수 있는지. */
  isComplete(setup: unknown): boolean;
  /** 완료된 setup으로 매치 엔진 어댑터와 초기 엔진 상태를 만든다(엔진/상태 재구현 금지·application 위임). */
  start(setup: unknown): { engine: GameEngine<unknown, unknown>; state: unknown };
  /** viewer 시점으로 가린 setup 뷰(상대 배치 위치 누수 금지). */
  redact(setup: unknown, viewer: Side): unknown;
}

/** gameType→setup 어댑터 조회. setup 단계가 없는 게임이면 undefined(기존처럼 2석 즉시 매치 시작). */
export type ResolveSetup = (gameType: GameId) => SetupAdapter | undefined;

/** reduceRoom이 부수효과 없이 외부 의존을 받는 통로(엔진/선택적 setup 해석 주입). */
export interface RoomDeps {
  resolveEngine: ResolveEngine;
  /** 선택적: 비공개 배치 setup이 필요한 게임용. 미주입/undefined면 setup 없이 기존 흐름. */
  resolveSetup?: ResolveSetup;
}

/** 착석한 플레이어 1명: 연결 식별자 + 표시 정보. */
export interface RoomSeat {
  /** 호출자(후속 소켓 이슈)가 주입하는 불투명 연결 식별자. */
  connId: string;
  info: RoomPlayerInfo;
}

/**
 * 방 상태(불변). 한 매치 + 착석자(p1/p2) + 관전자 + 진행 중 매치 + (선택) 사격 이전 setup을 묶는다.
 * 두 좌석이 모두 차면 setup 어댑터가 있으면 비공개 배치(setup)를 시작하고, 없으면 곧장 매치를 시작한다.
 */
export interface RoomState {
  /** 방 코드(호출자 주입). */
  code: string;
  gameType: GameId;
  /** 최대 2석. 먼저 입장한 connId가 p1, 둘째가 p2. */
  seats: ReadonlyArray<RoomSeat>;
  /** 좌석이 찬 뒤 입장한 connId. */
  spectators: ReadonlyArray<string>;
  /** 2석이 차면 매치 시작, 그 전엔 null. setup 단계 중에도 null(아직 매치 미시작). */
  match: MatchState<unknown, unknown> | null;
  /** 매치 시작 전 비공개 배치(setup) 상태(게임별 불투명). setup 단계가 아니면 null. */
  setup: unknown | null;
}

/**
 * 외부로 내보낼 메시지 1건.
 * to="all"이면 방의 모든 connId에 브로드캐스트, 아니면 해당 connId에게만.
 */
export interface Outbound {
  to: "all" | string;
  message: ServerMessage;
}

/** reduceRoom의 결과: 다음 방 상태 + 보낼 메시지 목록(둘 다 새 값). */
export interface ReduceResult {
  room: RoomState;
  outbound: ReadonlyArray<Outbound>;
}

/** 빈 방을 생성한다(좌석/관전자 없음, 매치·setup 없음). */
export function createRoom(code: string, gameType: GameId): RoomState {
  return { code, gameType, seats: [], spectators: [], match: null, setup: null };
}

/** side에서 결정적으로 파생한 표시 라벨(개인정보 아님). p1→"Player 1", p2→"Player 2". */
function labelForSide(side: Side): string {
  return side === "p1" ? "Player 1" : "Player 2";
}

/** 다음 빈 좌석의 side(0석→p1, 1석→p2). 2석이 차 있으면 null. */
function nextOpenSide(room: RoomState): Side | null {
  if (room.seats.length === 0) {
    return "p1";
  }
  if (room.seats.length === 1) {
    return room.seats[0]!.info.side === "p1" ? "p2" : "p1";
  }
  return null;
}

/** 갱신된 방 점유 상태를 모두에게 브로드캐스트하는 roomState 메시지. */
function roomStateOutbound(room: RoomState): Outbound {
  const players: RoomPlayerInfo[] = room.seats.map((s) => ({ ...s.info }));
  return { to: "all", message: { type: "roomState", roomCode: room.code, players } };
}

/** 현재 매치 상태(직렬화된 state + status + 현재 차례)를 모두에게 브로드캐스트하는 gameState 메시지. */
function gameStateOutbound(room: RoomState, match: MatchState<unknown, unknown>): Outbound {
  return {
    to: "all",
    message: {
      type: "gameState",
      gameType: room.gameType,
      state: match.state,
      status: matchStatus(match),
      turn: currentTurn(match),
    },
  };
}

/** 특정 connId에게만 보내는 error 메시지(사유는 안정적 식별 코드/메시지). */
function errorTo(connId: string, reason: string): Outbound {
  return { to: connId, message: { type: "error", reason } };
}

/** 좌석들로 매치 플레이어 쌍(p1/p2)을 만든다. 좌석이 정확히 2개일 때만 호출한다. */
function playersFromSeats(seats: ReadonlyArray<RoomSeat>): readonly [Player, Player] {
  const toPlayer = (seat: RoomSeat): Player => ({
    id: seat.connId,
    side: seat.info.side,
    kind: seat.info.kind,
    label: seat.info.label,
  });
  return [toPlayer(seats[0]!), toPlayer(seats[1]!)];
}

/** 시간 포트(결정성 유지용 상수). GameRecord는 시각을 보관하지 않아 호출만 하고 결과는 버린다. */
const FIXED_NOW = () => 0;

/** 매치가 시작되면 gameState를, 종료까지 됐으면 gameOver도 이어 붙여 반환한다(모두 to:"all"). */
function matchOutbounds(room: RoomState, match: MatchState<unknown, unknown>): Outbound[] {
  const out: Outbound[] = [gameStateOutbound(room, match)];
  const status = matchStatus(match);
  if (status.over) {
    const record = buildMatchRecord(match, room.gameType, { now: FIXED_NOW });
    if (record !== null) {
      out.push({ to: "all", message: { type: "gameOver", record } });
    }
  }
  return out;
}

/** 좌석이 둘 다 찬 방에서 매치를 시작한다. 엔진 미해석이면 매치 없이 error를 반환한다. */
function startMatch(room: RoomState, deps: RoomDeps): ReduceResult {
  const engine = deps.resolveEngine(room.gameType);
  if (engine === undefined) {
    // 미지원/멀티 비허용 게임: 매치를 시작할 수 없음을 방 전체에 알린다.
    return {
      room,
      outbound: [roomStateOutbound(room), { to: "all", message: { type: "error", reason: "unsupported_game" } }],
    };
  }
  const match = createMatch(engine, playersFromSeats(room.seats));
  const next: RoomState = { ...room, match };
  return { room: next, outbound: [roomStateOutbound(next), gameStateOutbound(next, match)] };
}

/**
 * 진행 중 setup을 좌석별로 가린 뷰로 내보낸다(viewer=좌석 side).
 * 상대 배치 위치 누수 금지 — 각 연결에 자기 시점 redact 뷰만 보낸다(to="all" 아님).
 * 관전자는 어느 side도 아니므로 setup 단계에선 setupState를 받지 않는다.
 */
function setupOutbounds(room: RoomState, adapter: SetupAdapter): Outbound[] {
  return room.seats.map((seat) => ({
    to: seat.connId,
    message: {
      type: "setupState",
      gameType: room.gameType,
      setup: adapter.redact(room.setup, seat.info.side),
    },
  }));
}

/** 좌석이 둘 다 찬 방에서 비공개 배치(setup) 단계를 시작한다. roomState + 좌석별 가린 setupState를 낸다. */
function startSetup(room: RoomState, adapter: SetupAdapter): ReduceResult {
  const next: RoomState = { ...room, setup: adapter.create(), match: null };
  return { room: next, outbound: [roomStateOutbound(next), ...setupOutbounds(next, adapter)] };
}

/**
 * 좌석이 둘 다 찬 방을 진행한다: setup 어댑터가 있으면 비공개 배치 단계를, 없으면 곧장 매치를 시작한다.
 * 어댑터 유무로만 분기하므로 room은 특정 게임을 알지 않는다(게임 무관 유지·회귀 없음).
 */
function startSetupOrMatch(room: RoomState, deps: RoomDeps): ReduceResult {
  const adapter = deps.resolveSetup?.(room.gameType);
  if (adapter !== undefined) {
    return startSetup(room, adapter);
  }
  return startMatch(room, deps);
}

/** joinRoom: 빈 좌석이 있으면 착석, 없으면 관전자. 2석이 차면 setup(있으면) 또는 매치 시작. */
function handleJoin(room: RoomState, connId: string, deps: RoomDeps): ReduceResult {
  // 이미 방에 있는 연결이면 멱등 처리(중복 착석 금지) — 현재 점유만 다시 알린다.
  const alreadySeated = room.seats.some((s) => s.connId === connId);
  const alreadySpectating = room.spectators.includes(connId);
  if (alreadySeated || alreadySpectating) {
    return { room, outbound: [roomStateOutbound(room)] };
  }

  const openSide = nextOpenSide(room);
  if (openSide === null) {
    // 좌석이 가득 참 → 관전자로 입장.
    const next: RoomState = { ...room, spectators: [...room.spectators, connId] };
    return { room: next, outbound: [roomStateOutbound(next)] };
  }

  const seat: RoomSeat = {
    connId,
    info: { side: openSide, kind: "human", label: labelForSide(openSide) },
  };
  const seatedRoom: RoomState = { ...room, seats: [...room.seats, seat] };

  if (seatedRoom.seats.length === 2) {
    return startSetupOrMatch(seatedRoom, deps);
  }
  return { room: seatedRoom, outbound: [roomStateOutbound(seatedRoom)] };
}

/** makeMove: 착석자가 자기 차례에 둔다. 거부는 그 connId에게만 error(code 사유). */
function handleMove(
  room: RoomState,
  connId: string,
  msg: Extract<ClientMessage, { type: "makeMove" }>,
): ReduceResult {
  const seat = room.seats.find((s) => s.connId === connId);
  if (seat === undefined) {
    return { room, outbound: [errorTo(connId, "not_seated")] };
  }
  if (room.match === null) {
    return { room, outbound: [errorTo(connId, "match_not_started")] };
  }
  if (msg.gameType !== room.gameType) {
    return { room, outbound: [errorTo(connId, "wrong_game")] };
  }

  try {
    const nextMatch = applyMatchMove(room.match, seat.info.side, msg.move);
    const next: RoomState = { ...room, match: nextMatch };
    return { room: next, outbound: matchOutbounds(next, nextMatch) };
  } catch (err) {
    // 매치 거부(차례 아님·불법·종료 후)는 안정적 code를 사유로 그 connId에게만 알린다.
    if (err instanceof MatchMoveError) {
      return { room, outbound: [errorTo(connId, err.code)] };
    }
    throw err;
  }
}

/**
 * submitSetup: 착석자가 자기 비공개 배치를 제출한다(매치 시작 전 setup 단계에서만).
 * 거부(setup 단계 아님·다른 게임·유효하지 않은 배치)는 그 connId에게만 안정적 code error.
 * 양측 완료면 setup 어댑터로 사격 매치를 시작(gameState[+gameOver] 브로드캐스트),
 * 한쪽만이면 좌석별 가린 setupState만 갱신해 보낸다(상대 위치 미노출).
 */
function handleSubmitSetup(
  room: RoomState,
  connId: string,
  msg: Extract<ClientMessage, { type: "submitSetup" }>,
  deps: RoomDeps,
): ReduceResult {
  const seat = room.seats.find((s) => s.connId === connId);
  if (seat === undefined) {
    return { room, outbound: [errorTo(connId, "not_seated")] };
  }
  if (msg.gameType !== room.gameType) {
    return { room, outbound: [errorTo(connId, "wrong_game")] };
  }
  if (room.setup === null) {
    // setup 단계가 아님(2석 미충족·이미 매치 시작·setup 미사용 게임).
    return { room, outbound: [errorTo(connId, "setup_not_active")] };
  }
  const adapter = deps.resolveSetup?.(room.gameType);
  if (adapter === undefined) {
    // setup 상태가 있는데 어댑터가 없으면 진행 불가(정상 흐름에선 도달 불가).
    return { room, outbound: [errorTo(connId, "unsupported_setup")] };
  }

  const result = adapter.submit(room.setup, seat.info.side, msg.payload);
  if (!result.ok) {
    // 유효하지 않은 제출: 입력 불변, 그 connId에게만 안정적 code error(상세 사유는 게임별이라 노출 안 함).
    return { room, outbound: [errorTo(connId, "invalid_setup")] };
  }

  if (adapter.isComplete(result.state)) {
    // 양측 완료 → setup 어댑터가 만든 엔진/상태로 매치 시작(엔진/상태 재구현 없음·application 위임).
    const { engine, state } = adapter.start(result.state);
    const match = createMatchFromState(engine, playersFromSeats(room.seats), state);
    const next: RoomState = { ...room, setup: null, match };
    return { room: next, outbound: matchOutbounds(next, match) };
  }
  // 한쪽만 제출 완료 → 좌석별 가린 setupState만 갱신해 보낸다(대기).
  const next: RoomState = { ...room, setup: result.state };
  return { room: next, outbound: setupOutbounds(next, adapter) };
}

/** leaveRoom: 좌석/관전자에서 제거하고 갱신된 점유를 브로드캐스트. 진행 중 매치는 중단 상태로 둔다. */
function handleLeave(room: RoomState, connId: string): ReduceResult {
  const seats = room.seats.filter((s) => s.connId !== connId);
  const spectators = room.spectators.filter((c) => c !== connId);
  if (seats.length === room.seats.length && spectators.length === room.spectators.length) {
    // 방에 없던 연결: 변화 없음.
    return { room, outbound: [] };
  }
  // 정책(단순화): 한쪽이 나가도 match는 중단 상태로 그대로 두고 roomState만 갱신한다.
  const next: RoomState = { ...room, seats, spectators };
  return { room: next, outbound: [roomStateOutbound(next)] };
}

/** requestRematch: 종료된 매치를 같은 좌석·gameType으로 다시 시작(2석이 찬 경우에 한함). */
function handleRematch(room: RoomState, connId: string, deps: RoomDeps): ReduceResult {
  if (room.seats.length !== 2) {
    return { room, outbound: [errorTo(connId, "not_enough_players")] };
  }
  if (room.setup !== null) {
    // setup 단계 진행 중엔 재대국 불가(아직 첫 매치도 시작 전).
    return { room, outbound: [errorTo(connId, "match_in_progress")] };
  }
  if (room.match !== null && !matchStatus(room.match).over) {
    return { room, outbound: [errorTo(connId, "match_in_progress")] };
  }
  // setup 어댑터가 있는 게임은 재대국도 비공개 배치 단계부터 다시 시작한다(곧장 매치 시작 시 엔진 init이 배치를 요구).
  const adapter = deps.resolveSetup?.(room.gameType);
  if (adapter !== undefined) {
    return startSetup({ ...room, match: null }, adapter);
  }
  // 기존 매치의 엔진을 재사용(없으면 resolveEngine으로 다시 해석).
  const engine = room.match?.engine ?? deps.resolveEngine(room.gameType);
  if (engine === undefined) {
    return { room, outbound: [errorTo(connId, "unsupported_game")] };
  }
  const match = createMatch(engine, playersFromSeats(room.seats));
  const next: RoomState = { ...room, match };
  return { room: next, outbound: [gameStateOutbound(next, match)] };
}

/**
 * 순수·결정적 방 상태 전이. 입력 room을 변형하지 않고 새 RoomState와 보낼 메시지 목록을 산출한다.
 * 같은 입력이면 항상 같은 출력(부수효과·소켓·시간/난수 없음).
 */
export function reduceRoom(
  room: RoomState,
  connId: string,
  msg: ClientMessage,
  deps: RoomDeps,
): ReduceResult {
  switch (msg.type) {
    case "joinRoom":
      return handleJoin(room, connId, deps);
    case "makeMove":
      return handleMove(room, connId, msg);
    case "submitSetup":
      return handleSubmitSetup(room, connId, msg, deps);
    case "leaveRoom":
      return handleLeave(room, connId);
    case "requestRematch":
      return handleRematch(room, connId, deps);
    default:
      // 타입상 도달 불가. 방어적으로 잘못된 메시지는 해당 connId에 error로 응답한다.
      return { room, outbound: [errorTo(connId, "unknown_message")] };
  }
}
