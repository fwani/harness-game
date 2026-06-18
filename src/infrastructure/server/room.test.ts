import { describe, it, expect } from "vitest";
import type { GameEngine, Side, GameStatus } from "../../application/gameEngine";
import type { ClientMessage } from "../../application/protocol";
import {
  createRoom,
  reduceRoom,
  type ResolveEngine,
  type RoomState,
  type Outbound,
} from "./room";

// ── 테스트용 결정적 페이크 엔진 ─────────────────────────────────────────────
// 두 수면 종료되는 최소 게임. 첫 수를 둔 쪽(p1)이 승자. move는 number 형태.
interface FakeState {
  count: number;
  next: Side;
}
type FakeMove = number;

function createFakeEngine(): GameEngine<FakeState, FakeMove> {
  function status(state: FakeState): GameStatus {
    const over = state.count >= 2;
    return { over, winner: over ? "p1" : null, draw: false };
  }
  function turn(state: FakeState): Side {
    return state.next;
  }
  function isLegal(state: FakeState, move: FakeMove, by: Side): boolean {
    if (status(state).over) return false;
    if (by !== turn(state)) return false;
    return typeof move === "number" && Number.isFinite(move);
  }
  return {
    init: (): FakeState => ({ count: 0, next: "p1" }),
    turn,
    isLegal,
    apply: (state: FakeState): FakeState => ({
      count: state.count + 1,
      next: state.next === "p1" ? "p2" : "p1",
    }),
    status,
  };
}

const GAME = "tictactoe" as const;
const resolveOk: ResolveEngine = (gameType) =>
  gameType === GAME ? (createFakeEngine() as GameEngine<unknown, unknown>) : undefined;
const resolveNone: ResolveEngine = () => undefined;

const join: ClientMessage = { type: "joinRoom", roomCode: "ABCD" };
const move = (n: number): ClientMessage => ({ type: "makeMove", gameType: GAME, move: n });

function outTypes(outbound: ReadonlyArray<Outbound>): string[] {
  return outbound.map((o) => o.message.type);
}

/** 두 connId를 착석시키고 매치가 시작된 방을 만든다. */
function seatedRoom(): RoomState {
  let room = createRoom("ABCD", GAME);
  room = reduceRoom(room, "c1", join, { resolveEngine: resolveOk }).room;
  room = reduceRoom(room, "c2", join, { resolveEngine: resolveOk }).room;
  return room;
}

describe("createRoom", () => {
  it("좌석/관전자/매치가 비어있는 방을 만든다", () => {
    const room = createRoom("ABCD", GAME);
    expect(room).toEqual({ code: "ABCD", gameType: GAME, seats: [], spectators: [], match: null });
  });
});

describe("joinRoom 착석/매치 시작", () => {
  it("첫 입장은 p1 좌석, roomState 브로드캐스트", () => {
    const r = reduceRoom(createRoom("ABCD", GAME), "c1", join, { resolveEngine: resolveOk });
    expect(r.room.seats).toHaveLength(1);
    expect(r.room.seats[0]).toMatchObject({ connId: "c1", info: { side: "p1", kind: "human" } });
    expect(r.room.match).toBeNull();
    expect(r.outbound).toHaveLength(1);
    expect(r.outbound[0]).toMatchObject({ to: "all", message: { type: "roomState" } });
  });

  it("둘째 입장은 p2 좌석 + 매치 시작 + roomState/gameState 브로드캐스트", () => {
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c2", join, { resolveEngine: resolveOk });
    expect(r.room.seats.map((s) => s.info.side)).toEqual(["p1", "p2"]);
    expect(r.room.match).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["roomState", "gameState"]);
    const gs = r.outbound.find((o) => o.message.type === "gameState")!;
    expect(gs.to).toBe("all");
    expect(gs.message).toMatchObject({ type: "gameState", gameType: GAME, turn: "p1" });
  });

  it("좌석이 차면 셋째 입장은 관전자", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "c3", join, { resolveEngine: resolveOk });
    expect(r.room.spectators).toEqual(["c3"]);
    expect(r.room.seats).toHaveLength(2);
    expect(outTypes(r.outbound)).toEqual(["roomState"]);
  });

  it("이미 착석한 연결의 재입장은 멱등(중복 착석 없음)", () => {
    const room = reduceRoom(createRoom("ABCD", GAME), "c1", join, { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c1", join, { resolveEngine: resolveOk });
    expect(r.room.seats).toHaveLength(1);
  });

  it("미지원 gameType이면 매치 대신 error 브로드캐스트", () => {
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, { resolveEngine: resolveNone }).room;
    const r = reduceRoom(room, "c2", join, { resolveEngine: resolveNone });
    expect(r.room.match).toBeNull();
    expect(outTypes(r.outbound)).toContain("error");
    const err = r.outbound.find((o) => o.message.type === "error")!;
    expect(err.message).toMatchObject({ type: "error", reason: "unsupported_game" });
  });
});

describe("makeMove 진행/거부", () => {
  it("올바른 순서의 수는 gameState를 모두에게 브로드캐스트", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk });
    expect(outTypes(r.outbound)).toEqual(["gameState"]);
    expect(r.outbound[0]!.to).toBe("all");
    expect(r.outbound[0]!.message).toMatchObject({ type: "gameState", turn: "p2" });
  });

  it("틀린 차례는 그 connId에 not_on_turn error", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "c2", move(0), { resolveEngine: resolveOk });
    expect(r.room).toBe(room); // 상태 변화 없음
    expect(r.outbound).toEqual([{ to: "c2", message: { type: "error", reason: "not_on_turn" } }]);
  });

  it("불법 수(형태 위반)는 illegal_move error", () => {
    const room = seatedRoom();
    const bad: ClientMessage = { type: "makeMove", gameType: GAME, move: "nope" };
    const r = reduceRoom(room, "c1", bad, { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "illegal_move" } }]);
  });

  it("착석자가 아니면 not_seated error", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "spectatorX", move(0), { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([{ to: "spectatorX", message: { type: "error", reason: "not_seated" } }]);
  });

  it("다른 gameType의 makeMove는 wrong_game error", () => {
    const room = seatedRoom();
    const bad: ClientMessage = { type: "makeMove", gameType: "gomoku", move: 0 };
    const r = reduceRoom(room, "c1", bad, { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "wrong_game" } }]);
  });

  it("매치 종료 시 gameState + gameOver(record) 브로드캐스트", () => {
    let room = seatedRoom();
    room = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c2", move(1), { resolveEngine: resolveOk });
    expect(outTypes(r.outbound)).toEqual(["gameState", "gameOver"]);
    const over = r.outbound.find((o) => o.message.type === "gameOver")!;
    expect(over.to).toBe("all");
    expect(over.message).toMatchObject({
      type: "gameOver",
      record: { game: GAME, outcomes: [{ result: "win" }, { result: "loss" }] },
    });
  });

  it("종료된 매치에 두면 match_over error", () => {
    let room = seatedRoom();
    room = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk }).room;
    room = reduceRoom(room, "c2", move(1), { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c1", move(2), { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "match_over" } }]);
  });
});

describe("requestRematch", () => {
  it("종료된 매치를 같은 좌석으로 재시작하고 gameState 브로드캐스트", () => {
    let room = seatedRoom();
    room = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk }).room;
    room = reduceRoom(room, "c2", move(1), { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c1", { type: "requestRematch" }, { resolveEngine: resolveOk });
    expect(outTypes(r.outbound)).toEqual(["gameState"]);
    expect(r.outbound[0]!.message).toMatchObject({ type: "gameState", turn: "p1" });
    expect(r.room.match).not.toBe(room.match);
    expect(r.room.seats.map((s) => s.info.side)).toEqual(["p1", "p2"]);
  });

  it("진행 중 매치는 재대국 거부(match_in_progress)", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "c1", { type: "requestRematch" }, { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "match_in_progress" } },
    ]);
  });

  it("좌석이 차지 않으면 재대국 거부(not_enough_players)", () => {
    const room = reduceRoom(createRoom("ABCD", GAME), "c1", join, {
      resolveEngine: resolveOk,
    }).room;
    const r = reduceRoom(room, "c1", { type: "requestRematch" }, { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "not_enough_players" } },
    ]);
  });
});

describe("leaveRoom", () => {
  it("좌석에서 제거하고 roomState 갱신(매치는 중단 상태로 유지)", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "c1", { type: "leaveRoom" }, { resolveEngine: resolveOk });
    expect(r.room.seats.map((s) => s.connId)).toEqual(["c2"]);
    expect(outTypes(r.outbound)).toEqual(["roomState"]);
  });

  it("관전자도 제거한다", () => {
    let room = seatedRoom();
    room = reduceRoom(room, "c3", join, { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c3", { type: "leaveRoom" }, { resolveEngine: resolveOk });
    expect(r.room.spectators).toEqual([]);
  });

  it("방에 없던 연결의 leave는 변화·메시지 없음", () => {
    const room = seatedRoom();
    const r = reduceRoom(room, "ghost", { type: "leaveRoom" }, { resolveEngine: resolveOk });
    expect(r.room).toBe(room);
    expect(r.outbound).toEqual([]);
  });
});

describe("불변성/결정성", () => {
  it("reduceRoom은 입력 room을 변형하지 않는다", () => {
    const room = seatedRoom();
    const snapshot = structuredClone({
      code: room.code,
      gameType: room.gameType,
      seats: room.seats,
      spectators: room.spectators,
    });
    reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk });
    expect({
      code: room.code,
      gameType: room.gameType,
      seats: room.seats,
      spectators: room.spectators,
    }).toEqual(snapshot);
  });

  it("같은 입력이면 같은 출력(결정적)", () => {
    const room = seatedRoom();
    const a = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk });
    const b = reduceRoom(room, "c1", move(0), { resolveEngine: resolveOk });
    expect(a.outbound).toEqual(b.outbound);
    expect(a.room.match?.state).toEqual(b.room.match?.state);
  });
});
