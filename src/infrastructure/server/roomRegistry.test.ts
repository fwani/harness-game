import { describe, it, expect } from "vitest";
import type { GameEngine, Side, GameStatus } from "../../application/gameEngine";
import type { ResolveEngine } from "./room";
import {
  createRegistry,
  openRoom,
  dispatch,
  disconnect,
  type RegistryState,
  type AddressedOut,
} from "./roomRegistry";

// ── 테스트용 결정적 페이크 엔진 ─────────────────────────────────────────────
// 두 수면 종료되는 최소 게임. 첫 수를 둔 쪽(p1)이 승자. move는 number 형태(mancala 코덱과 호환).
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
  return {
    init: (): FakeState => ({ count: 0, next: "p1" }),
    turn,
    isLegal: (state, move, by) =>
      !status(state).over && by === turn(state) && typeof move === "number" && Number.isFinite(move),
    apply: (state: FakeState): FakeState => ({
      count: state.count + 1,
      next: state.next === "p1" ? "p2" : "p1",
    }),
    status,
  };
}

// 모든 gameType에 대해 페이크 엔진을 돌려준다(자동 생성 방의 gameType과 무관히 매치 시작 가능).
const resolveOk: ResolveEngine = () => createFakeEngine() as GameEngine<unknown, unknown>;
const resolveNone: ResolveEngine = () => undefined;
const deps = { resolveEngine: resolveOk };

// mancala는 move가 number 형태라 parseEngineMove를 통과한다(엔진까지 닿는 makeMove 검증용).
const GAME = "mancala" as const;
const CODE = "ABCD";
const join = { type: "joinRoom", roomCode: CODE };

/** 특정 connId에게 간 메시지 type 목록. */
function typesFor(out: ReadonlyArray<AddressedOut>, connId: string): string[] {
  return out.filter((o) => o.connId === connId).map((o) => o.message.type);
}

/** GAME 방을 열고 두 connId를 입장시켜 매치가 시작된 레지스트리를 만든다. */
function seatedRegistry(): RegistryState {
  let state = openRoom(createRegistry(), CODE, GAME);
  state = dispatch(state, "c1", CODE, join, deps).state;
  state = dispatch(state, "c2", CODE, join, deps).state;
  return state;
}

describe("createRegistry / openRoom — 방 코드별 생성·조회", () => {
  it("빈 레지스트리는 방·매핑이 없다", () => {
    const state = createRegistry();
    expect(state.rooms.size).toBe(0);
    expect(state.connRoom.size).toBe(0);
  });

  it("openRoom은 코드로 gameType 방을 만들고, 중복 코드는 멱등(같은 참조)이다", () => {
    const s1 = openRoom(createRegistry(), CODE, GAME);
    expect(s1.rooms.get(CODE)?.gameType).toBe(GAME);
    expect(s1.rooms.get(CODE)?.code).toBe(CODE);
    const s2 = openRoom(s1, CODE, GAME);
    expect(s2).toBe(s1); // 변화 없음
  });
});

describe("dispatch joinRoom — 자동 생성·라우팅·매핑", () => {
  it("defaultGameType 옵트인 시, 없는 코드로 joinRoom하면 방을 자동 생성하고 매핑을 등록한다", () => {
    const r = dispatch(createRegistry(), "c1", CODE, join, { ...deps, defaultGameType: GAME });
    expect(r.state.rooms.get(CODE)?.gameType).toBe(GAME);
    expect(r.state.connRoom.get("c1")).toBe(CODE);
    // 첫 입장은 roomState 브로드캐스트가 본인에게 간다.
    expect(typesFor(r.outbound, "c1")).toContain("roomState");
  });

  it("defaultGameType 없이 미오픈 방으로 joinRoom하면 room_not_found", () => {
    const r = dispatch(createRegistry(), "c1", CODE, join, deps);
    expect(r.outbound).toEqual([
      { connId: "c1", message: { type: "error", reason: "room_not_found" } },
    ]);
    expect(r.state.rooms.has(CODE)).toBe(false);
  });

  it("두 connId가 같은 코드에 입장하면 매치 시작이 양쪽에 브로드캐스트된다(to:all 해소)", () => {
    let state = openRoom(createRegistry(), CODE, GAME);
    state = dispatch(state, "c1", CODE, join, deps).state;
    const r2 = dispatch(state, "c2", CODE, join, deps);
    // gameState(매치 시작)가 c1·c2 모두에게 해소되어 전달된다.
    expect(typesFor(r2.outbound, "c1")).toContain("gameState");
    expect(typesFor(r2.outbound, "c2")).toContain("gameState");
    // "all" 대상 메시지는 좌석 2명 모두에게 복제된다(특정 connId 직접 대상 없음).
    expect(r2.outbound.every((o) => o.connId === "c1" || o.connId === "c2")).toBe(true);
  });

  it("엔진 미해석이면 매치 시작 대신 unsupported_game을 양쪽에 알린다", () => {
    let state = openRoom(createRegistry(), CODE, GAME);
    state = dispatch(state, "c1", CODE, join, { resolveEngine: resolveNone }).state;
    const r2 = dispatch(state, "c2", CODE, join, { resolveEngine: resolveNone });
    const reasons = r2.outbound
      .filter((o) => o.message.type === "error")
      .map((o) => (o.message as { reason: string }).reason);
    expect(reasons).toContain("unsupported_game");
  });
});

describe("dispatch makeMove — 검증·위임", () => {
  it("형태가 깨진 메시지는 해당 connId에만 invalid_message error", () => {
    const r = dispatch(seatedRegistry(), "c1", CODE, { type: "bogus" }, deps);
    expect(r.outbound).toEqual([
      { connId: "c1", message: { type: "error", reason: "invalid_message" } },
    ]);
  });

  it("makeMove move 형태가 게임과 안 맞으면 malformed_move error(그 connId에만)", () => {
    // mancala move는 number여야 한다. 객체는 malformed.
    const bad = { type: "makeMove", gameType: GAME, move: { nope: true } };
    const r = dispatch(seatedRegistry(), "c1", CODE, bad, deps);
    expect(typesFor(r.outbound, "c1")).toEqual(["error"]);
    expect((r.outbound[0]!.message as { reason: string }).reason).toBe("malformed_move");
  });

  it("멀티 비지원 게임의 makeMove는 unsupported_game error", () => {
    const bad = { type: "makeMove", gameType: "rps", move: "rock" };
    const r = dispatch(seatedRegistry(), "c1", CODE, bad, deps);
    expect((r.outbound[0]!.message as { reason: string }).reason).toBe("unsupported_game");
  });

  it("유효한 makeMove는 reduceRoom→엔진까지 닿아 gameState가 양쪽에 브로드캐스트된다", () => {
    const move = { type: "makeMove", gameType: GAME, move: 0 };
    const r = dispatch(seatedRegistry(), "c1", CODE, move, deps);
    expect(typesFor(r.outbound, "c1")).toContain("gameState");
    expect(typesFor(r.outbound, "c2")).toContain("gameState");
  });

  it("없는 방으로 온 비-join 메시지는 room_not_found error", () => {
    const move = { type: "makeMove", gameType: GAME, move: 0 };
    const r = dispatch(createRegistry(), "c1", "ZZZZ", move, deps);
    expect(r.outbound).toEqual([
      { connId: "c1", message: { type: "error", reason: "room_not_found" } },
    ]);
  });
});

describe("disconnect — leaveRoom 합성·매핑 제거·빈 방 정리", () => {
  it("좌석/매핑에서 제거하고 남은 좌석에 roomState를 알린다", () => {
    const state = seatedRegistry();
    const r = disconnect(state, "c1", deps);
    const room = r.state.rooms.get(CODE);
    expect(room?.seats.some((s) => s.connId === "c1")).toBe(false);
    expect(r.state.connRoom.has("c1")).toBe(false);
    // 남은 좌석 c2에게 갱신된 roomState가 간다.
    expect(typesFor(r.outbound, "c2")).toContain("roomState");
  });

  it("마지막 인원이 나가면 빈 방을 정리(remove)한다", () => {
    let state = seatedRegistry();
    state = disconnect(state, "c1", deps).state;
    const r = disconnect(state, "c2", deps);
    expect(r.state.rooms.has(CODE)).toBe(false);
    expect(r.state.connRoom.size).toBe(0);
  });

  it("어느 방에도 없는 connId의 disconnect는 변화 없음", () => {
    const state = seatedRegistry();
    const r = disconnect(state, "ghost", deps);
    expect(r.state).toBe(state);
    expect(r.outbound).toEqual([]);
  });
});

describe("결정성·불변성", () => {
  it("같은 입력이면 같은 출력(결정적)", () => {
    const base = openRoom(createRegistry(), CODE, GAME);
    const a = dispatch(base, "c1", CODE, join, deps);
    const b = dispatch(base, "c1", CODE, join, deps);
    expect(a.outbound).toEqual(b.outbound);
    expect([...a.state.rooms.keys()]).toEqual([...b.state.rooms.keys()]);
    expect(a.state.connRoom.get("c1")).toBe(b.state.connRoom.get("c1"));
  });

  it("dispatch는 입력 state를 변형하지 않는다", () => {
    const base = openRoom(createRegistry(), CODE, GAME);
    const before = base.rooms.get(CODE);
    dispatch(base, "c1", CODE, join, deps);
    // 원본 방 상태는 그대로(좌석 0).
    expect(base.rooms.get(CODE)).toBe(before);
    expect(before?.seats).toHaveLength(0);
    expect(base.connRoom.size).toBe(0);
  });
});
