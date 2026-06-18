import { describe, it, expect } from "vitest";
import type { GameEngine, Side, GameStatus } from "../../application/gameEngine";
import type { ClientMessage } from "../../application/protocol";
import {
  createRoom,
  reduceRoom,
  type ResolveEngine,
  type ResolveSetup,
  type RoomDeps,
  type SetupAdapter,
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
    expect(room).toEqual({
      code: "ABCD",
      gameType: GAME,
      seats: [],
      spectators: [],
      match: null,
      setup: null,
    });
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

// ── 비공개 배치(setup) 단계 연동 ───────────────────────────────────────────────
// 게임 무관 SetupAdapter 페이크: 각 side가 음이 아닌 수 하나를 "배치"로 제출한다.
// 음수/비수는 잘못된 배치로 거부(ok:false). redact는 자기 값만 노출하고 상대 값은 숨긴 채
// 제출 여부만 알린다(상대 위치 누수 방지를 일반화한 모델).
interface FakeSetup {
  p1: number | null;
  p2: number | null;
}

function createFakeSetupAdapter(): SetupAdapter {
  return {
    create: (): FakeSetup => ({ p1: null, p2: null }),
    submit: (setup, side, payload) => {
      const s = setup as FakeSetup;
      if (typeof payload !== "number" || !Number.isFinite(payload) || payload < 0) {
        return { ok: false, reason: "invalid_placement", state: s };
      }
      const next: FakeSetup = side === "p1" ? { ...s, p1: payload } : { ...s, p2: payload };
      return { ok: true, state: next };
    },
    isComplete: (setup) => {
      const s = setup as FakeSetup;
      return s.p1 !== null && s.p2 !== null;
    },
    start: (setup) => {
      const s = setup as FakeSetup;
      // 양측 제출값을 담은 초기 엔진 상태(setup에서 합성됨을 검증용으로 노출).
      return {
        engine: createFakeEngine() as GameEngine<unknown, unknown>,
        state: { count: 0, next: "p1", p1: s.p1, p2: s.p2 },
      };
    },
    redact: (setup, viewer) => {
      const s = setup as FakeSetup;
      const own = viewer === "p1" ? s.p1 : s.p2;
      const opp = viewer === "p1" ? s.p2 : s.p1;
      // 상대 실제 값은 숨기고 제출 여부만 노출한다.
      return { viewer, own, opponentSubmitted: opp !== null };
    },
  };
}

const setupAdapter = createFakeSetupAdapter();
const resolveSetupOk: ResolveSetup = () => setupAdapter;
const depsSetup: RoomDeps = { resolveEngine: resolveOk, resolveSetup: resolveSetupOk };
const submit = (payload: unknown): ClientMessage => ({
  type: "submitSetup",
  gameType: GAME,
  payload,
});

/** 두 connId 착석으로 setup 단계가 시작된 방(매치 미시작). */
function setupStartedRoom(): RoomState {
  let room = createRoom("ABCD", GAME);
  room = reduceRoom(room, "c1", join, depsSetup).room;
  room = reduceRoom(room, "c2", join, depsSetup).room;
  return room;
}

/** 특정 connId로 가는 outbound만 추린다. */
function toConn(outbound: ReadonlyArray<Outbound>, connId: string): Outbound[] {
  return outbound.filter((o) => o.to === connId);
}

describe("submitSetup 비공개 배치 단계", () => {
  it("① 2석 착석 시 setup 시작(즉시 매치 시작 안 함) + 좌석별 setupState", () => {
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, depsSetup).room;
    const r = reduceRoom(room, "c2", join, depsSetup);
    expect(r.room.seats.map((s) => s.info.side)).toEqual(["p1", "p2"]);
    expect(r.room.match).toBeNull(); // 매치는 아직 시작하지 않는다
    expect(r.room.setup).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["roomState", "setupState", "setupState"]);
    // setupState는 각 좌석 connId에게만(브로드캐스트 아님) 간다.
    expect(toConn(r.outbound, "c1")).toHaveLength(1);
    expect(toConn(r.outbound, "c2")).toHaveLength(1);
    expect(r.outbound.find((o) => o.to === "c1")!.message).toMatchObject({
      type: "setupState",
      gameType: GAME,
    });
  });

  it("② 한쪽만 제출하면 매치 대기(좌석별 setupState만 갱신)", () => {
    const room = setupStartedRoom();
    const r = reduceRoom(room, "c1", submit(42), depsSetup);
    expect(r.room.match).toBeNull();
    expect(r.room.setup).toMatchObject({ p1: 42, p2: null });
    expect(outTypes(r.outbound)).toEqual(["setupState", "setupState"]);
  });

  it("③ 잘못된 제출(음수)은 거부·상태 불변", () => {
    const room = setupStartedRoom();
    const r = reduceRoom(room, "c1", submit(-1), depsSetup);
    expect(r.room).toBe(room); // 입력 불변(동일 참조)
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "invalid_setup" } },
    ]);
  });

  it("③' 형태가 어긋난 제출(비수)도 거부·불변", () => {
    const room = setupStartedRoom();
    const r = reduceRoom(room, "c2", submit("nope"), depsSetup);
    expect(r.room).toBe(room);
    expect(r.outbound).toEqual([
      { to: "c2", message: { type: "error", reason: "invalid_setup" } },
    ]);
  });

  it("④ 양측 제출 완료 시 매치 시작(setup 비우고 gameState 브로드캐스트)", () => {
    let room = setupStartedRoom();
    room = reduceRoom(room, "c1", submit(7), depsSetup).room;
    const r = reduceRoom(room, "c2", submit(9), depsSetup);
    expect(r.room.setup).toBeNull();
    expect(r.room.match).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["gameState"]);
    const gs = r.outbound[0]!;
    expect(gs.to).toBe("all");
    // setup에서 합성된 양측 제출값이 매치 초기 상태에 반영됐다.
    expect(gs.message).toMatchObject({ type: "gameState", state: { p1: 7, p2: 9 }, turn: "p1" });
  });

  it("⑤ redact로 상대 배치값이 새지 않는다(제출 여부만 노출)", () => {
    const room = setupStartedRoom();
    const r = reduceRoom(room, "c1", submit(42), depsSetup);
    const toP1 = r.outbound.find((o) => o.to === "c1")!;
    const toP2 = r.outbound.find((o) => o.to === "c2")!;
    // p1(제출자)은 자기 값을 본다.
    expect((toP1.message as { setup: unknown }).setup).toEqual({
      viewer: "p1",
      own: 42,
      opponentSubmitted: false,
    });
    // p2는 상대(p1)의 실제 값(42)을 보지 못하고 제출 여부만 안다.
    expect((toP2.message as { setup: unknown }).setup).toEqual({
      viewer: "p2",
      own: null,
      opponentSubmitted: true,
    });
    expect(JSON.stringify(toP2.message)).not.toContain("42");
  });

  it("⑤' setup 단계가 아닐 때 제출은 setup_not_active", () => {
    const room = seatedRoom(); // setup 어댑터 없이 즉시 매치 시작된 방
    const r = reduceRoom(room, "c1", submit(1), { resolveEngine: resolveOk });
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "setup_not_active" } },
    ]);
  });

  it("⑥ setup 어댑터 없는 게임은 2석 착석 즉시 매치 시작(회귀 없음)", () => {
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, { resolveEngine: resolveOk }).room;
    const r = reduceRoom(room, "c2", join, { resolveEngine: resolveOk });
    expect(r.room.setup).toBeNull();
    expect(r.room.match).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["roomState", "gameState"]);
  });

  it("setup 단계 제출은 착석자만(관전자 not_seated)", () => {
    const room = setupStartedRoom();
    const r = reduceRoom(room, "ghost", submit(1), depsSetup);
    expect(r.outbound).toEqual([
      { to: "ghost", message: { type: "error", reason: "not_seated" } },
    ]);
  });

  it("setup 매치 종료 후 재대국은 setup 단계부터 다시 시작", () => {
    // 양측 제출 → 매치 시작 → 종료까지 진행.
    let room = setupStartedRoom();
    room = reduceRoom(room, "c1", submit(1), depsSetup).room;
    room = reduceRoom(room, "c2", submit(2), depsSetup).room; // 매치 시작
    room = reduceRoom(room, "c1", move(0), depsSetup).room;
    room = reduceRoom(room, "c2", move(1), depsSetup).room; // 종료
    const r = reduceRoom(room, "c1", { type: "requestRematch" }, depsSetup);
    expect(r.room.match).toBeNull();
    expect(r.room.setup).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["roomState", "setupState", "setupState"]);
  });

  it("setup 단계 중 reduceRoom은 입력 room을 변형하지 않는다", () => {
    const room = setupStartedRoom();
    const before = structuredClone(room.setup);
    reduceRoom(room, "c1", submit(5), depsSetup);
    expect(room.setup).toEqual(before);
  });
});
