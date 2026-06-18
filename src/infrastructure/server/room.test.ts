import { describe, it, expect } from "vitest";
import type { GameEngine, Side, GameStatus } from "../../application/gameEngine";
import type { ClientMessage } from "../../application/protocol";
import type { Ship } from "../../domain/battleship";
import { resolveSetupFor, type SetupController } from "../../application/setupController";
import { createBattleshipEngine } from "../../application/battleshipEngine";
import {
  createRoom,
  reduceRoom,
  type ResolveEngine,
  type RoomDeps,
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
  it("좌석/관전자/setup/매치가 비어있는 방을 만든다", () => {
    const room = createRoom("ABCD", GAME);
    expect(room).toEqual({
      code: "ABCD",
      gameType: GAME,
      seats: [],
      spectators: [],
      setup: null,
      match: null,
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

// ── battleship 비공개 배치(setup) 단계 연동 (#598) ──────────────────────────
// setup 어댑터(resolveSetupFor)를 주입하면 2인 착석 즉시 매치가 아니라 비공개 배치 단계를 먼저 거친다.
const BS = "battleship" as const;
const bsJoin: ClientMessage = { type: "joinRoom", roomCode: "BSHP" };
const submit = (ships: unknown): ClientMessage => ({ type: "submitFleet", gameType: BS, ships });

const bsDeps: RoomDeps = {
  resolveEngine: (g) =>
    g === BS ? (createBattleshipEngine() as GameEngine<unknown, unknown>) : undefined,
  resolveSetup: resolveSetupFor,
};

/** 겹치지 않는 표준 함대([5,4,3,3,2])를 각기 다른 행에 가로로 배치한다(10×10에서 유효). */
function validFleet(): Ship[] {
  return [
    { id: "a", row: 0, col: 0, size: 5, orientation: "h" },
    { id: "b", row: 1, col: 0, size: 4, orientation: "h" },
    { id: "c", row: 2, col: 0, size: 3, orientation: "h" },
    { id: "d", row: 3, col: 0, size: 3, orientation: "h" },
    { id: "e", row: 4, col: 0, size: 2, orientation: "h" },
  ];
}

/** 두 connId를 착석시킨(=setup 단계에 진입한) battleship 방. */
function bsSetupRoom(): RoomState {
  let room = createRoom("BSHP", BS);
  room = reduceRoom(room, "c1", bsJoin, bsDeps).room;
  room = reduceRoom(room, "c2", bsJoin, bsDeps).room;
  return room;
}

describe("battleship setup 단계 연동", () => {
  it("① 2인 착석 시 즉시 매치가 아니라 setup을 시작한다(좌석별 setupState 라우팅)", () => {
    let room = createRoom("BSHP", BS);
    room = reduceRoom(room, "c1", bsJoin, bsDeps).room;
    const r = reduceRoom(room, "c2", bsJoin, bsDeps);
    expect(r.room.match).toBeNull();
    expect(r.room.setup).not.toBeNull();
    // 점유는 모두에게(roomState), setup 점유는 착석자별로 따로(setupState×2).
    expect(outTypes(r.outbound)).toEqual(["roomState", "setupState", "setupState"]);
    const setupTos = r.outbound.filter((o) => o.message.type === "setupState").map((o) => o.to);
    expect(setupTos.sort()).toEqual(["c1", "c2"]);
  });

  it("② 한쪽만 제출하면 매치 시작 없이 대기(가린 setupState 재라우팅)", () => {
    const room = bsSetupRoom();
    const r = reduceRoom(room, "c1", submit(validFleet()), bsDeps);
    expect(r.room.match).toBeNull();
    expect(r.room.setup).not.toBeNull();
    expect(outTypes(r.outbound).every((t) => t === "setupState")).toBe(true);
  });

  it("③ 잘못된 제출(함선 수/길이 multiset 불일치)은 invalid_fleet 거부·불변", () => {
    const room = bsSetupRoom();
    const bad = submit([{ id: "x", row: 0, col: 0, size: 5, orientation: "h" }]);
    const r = reduceRoom(room, "c1", bad, bsDeps);
    expect(r.room).toBe(room); // 상태 불변
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "invalid_fleet" } }]);
  });

  it("③' 겹치는 배치도 invalid_fleet 거부·불변", () => {
    const room = bsSetupRoom();
    const overlap = validFleet();
    overlap[1] = { id: "b", row: 0, col: 0, size: 4, orientation: "h" }; // 함선 a와 겹침
    const r = reduceRoom(room, "c1", submit(overlap), bsDeps);
    expect(r.room).toBe(room);
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "invalid_fleet" } }]);
  });

  it("③'' 형식이 깨진 제출(함선이 아님)도 invalid_fleet 거부·불변", () => {
    const room = bsSetupRoom();
    const r = reduceRoom(room, "c1", submit([1, 2, 3]), bsDeps);
    expect(r.room).toBe(room);
    expect(r.outbound).toEqual([{ to: "c1", message: { type: "error", reason: "invalid_fleet" } }]);
  });

  it("④ 양측 제출 완료 시 startBattleshipMatch로 사격 매치 시작", () => {
    let room = bsSetupRoom();
    room = reduceRoom(room, "c1", submit(validFleet()), bsDeps).room;
    const r = reduceRoom(room, "c2", submit(validFleet()), bsDeps);
    expect(r.room.setup).toBeNull();
    expect(r.room.match).not.toBeNull();
    const gs = r.outbound.find((o) => o.message.type === "gameState")!;
    expect(gs.to).toBe("all");
    expect(gs.message).toMatchObject({ type: "gameState", gameType: BS, turn: "p1" });
    // 사격 매치 상태는 양측 보드를 들고 있다(엔진이 init한 상태).
    expect(r.room.match!.state).toMatchObject({ next: "p1" });
  });

  it("⑤ redactSetup: 상대 함대 위치를 노출하지 않는다(제출 여부만)", () => {
    const room = bsSetupRoom();
    const r = reduceRoom(room, "c1", submit(validFleet()), bsDeps);
    // 상대(p2=c2) 시점: p1이 제출했음은 알지만([]) 좌표는 비공개, 자기(p2)는 미제출(null).
    const toC2 = r.outbound.find((o) => o.to === "c2")!.message as {
      type: "setupState";
      setup: { p1Ships: unknown; p2Ships: unknown };
    };
    expect(toC2.setup.p1Ships).toEqual([]);
    expect(toC2.setup.p2Ships).toBeNull();
    // 본인(p1=c1) 시점: 자기 함대 좌표는 그대로 보인다.
    const toC1 = r.outbound.find((o) => o.to === "c1")!.message as {
      type: "setupState";
      setup: { p1Ships: Ship[] };
    };
    expect(toC1.setup.p1Ships).toHaveLength(5);
  });

  it("⑥ setup 어댑터 없는 게임은 기존처럼 2인 착석 즉시 매치 시작(회귀 없음)", () => {
    // resolveSetupFor는 battleship 외에는 undefined → tictactoe는 setup 없이 즉시 매치.
    const deps: RoomDeps = { resolveEngine: resolveOk, resolveSetup: resolveSetupFor };
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, deps).room;
    const r = reduceRoom(room, "c2", join, deps);
    expect(r.room.setup).toBeNull();
    expect(r.room.match).not.toBeNull();
    expect(outTypes(r.outbound)).toEqual(["roomState", "gameState"]);
  });

  it("착석자가 아니면 submitFleet은 not_seated 거부", () => {
    const room = bsSetupRoom();
    const r = reduceRoom(room, "ghost", submit(validFleet()), bsDeps);
    expect(r.outbound).toEqual([{ to: "ghost", message: { type: "error", reason: "not_seated" } }]);
  });

  it("setup 단계가 아닐 때 submitFleet은 setup_not_active 거부", () => {
    // 한 명만 착석(아직 setup 시작 전).
    const room = reduceRoom(createRoom("BSHP", BS), "c1", bsJoin, bsDeps).room;
    const r = reduceRoom(room, "c1", submit(validFleet()), bsDeps);
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "setup_not_active" } },
    ]);
  });

  it("매치 시작 후 submitFleet은 setup_not_active 거부(중복 제출 금지)", () => {
    let room = bsSetupRoom();
    room = reduceRoom(room, "c1", submit(validFleet()), bsDeps).room;
    room = reduceRoom(room, "c2", submit(validFleet()), bsDeps).room;
    const r = reduceRoom(room, "c1", submit(validFleet()), bsDeps);
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "setup_not_active" } },
    ]);
  });

  it("setup 흐름은 입력 room을 변형하지 않는다(불변)", () => {
    const room = bsSetupRoom();
    const before = structuredClone(room.setup);
    reduceRoom(room, "c1", submit(validFleet()), bsDeps);
    expect(room.setup).toEqual(before);
  });

  it("setup 진행/매치 진행 중 requestRematch는 match_in_progress 거부", () => {
    let room = bsSetupRoom();
    room = reduceRoom(room, "c1", submit(validFleet()), bsDeps).room;
    room = reduceRoom(room, "c2", submit(validFleet()), bsDeps).room;
    const r = reduceRoom(room, "c1", { type: "requestRematch" }, bsDeps);
    expect(r.outbound).toEqual([
      { to: "c1", message: { type: "error", reason: "match_in_progress" } },
    ]);
  });
});

// setup 어댑터를 가진 게임의 재대국은 (엔진 재init이 아니라) 다시 비공개 배치 단계로 진입한다.
// 종료까지 가는 battleship 대신, 2수면 끝나는 기존 페이크 엔진 + 1회 제출이면 완료되는 페이크 setup으로
// 일반(게임 무관) 동작을 검증한다.
describe("setup 어댑터가 있는 게임의 재대국→setup 재진입", () => {
  // 양측 한 번씩 제출하면 완료되는 최소 setup 컨트롤러(게임 무관 흐름 검증용).
  const fakeSetup: SetupController = {
    create: () => ({ p1: false, p2: false }),
    submit: (setup, side) => {
      const s = setup as { p1: boolean; p2: boolean };
      return { ok: true, state: { ...s, [side]: true } };
    },
    isComplete: (setup) => {
      const s = setup as { p1: boolean; p2: boolean };
      return s.p1 && s.p2;
    },
    startState: () => ({ count: 0, next: "p1" as Side }),
    redact: (setup) => setup,
  };
  const deps: RoomDeps = { resolveEngine: resolveOk, resolveSetup: () => fakeSetup };
  const fakeSubmit: ClientMessage = { type: "submitFleet", gameType: GAME, ships: [] };

  it("종료된 매치의 requestRematch는 setup을 다시 시작한다", () => {
    let room = createRoom("ABCD", GAME);
    room = reduceRoom(room, "c1", join, deps).room;
    room = reduceRoom(room, "c2", join, deps).room; // setup 시작
    room = reduceRoom(room, "c1", fakeSubmit, deps).room;
    room = reduceRoom(room, "c2", fakeSubmit, deps).room; // 매치 시작
    room = reduceRoom(room, "c1", move(0), deps).room;
    room = reduceRoom(room, "c2", move(1), deps).room; // count 2 → 종료

    const r = reduceRoom(room, "c1", { type: "requestRematch" }, deps);
    expect(r.room.match).toBeNull();
    expect(r.room.setup).toEqual({ p1: false, p2: false });
    expect(outTypes(r.outbound)).toEqual(["roomState", "setupState", "setupState"]);
  });
});
