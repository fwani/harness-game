import { describe, it, expect } from "vitest";
import { resolveSetup } from "./setupRegistry";
import { createRoom, reduceRoom, type RoomDeps } from "./room";
import { createEngineFor } from "../../application/engineRegistry";
import type { ClientMessage } from "../../application/protocol";
import type { Ship } from "../../domain/battleship";
import {
  isSetupComplete,
  type BattleshipSetupState,
} from "../../application/battleshipSetup";

// 표준 함대(5·4·3·3·2)를 서로 다른 행에 가로로 배치한 유효 배치(겹침/범위 없음).
const VALID_FLEET: Ship[] = [
  { id: "carrier", row: 0, col: 0, size: 5, orientation: "h" },
  { id: "battleship", row: 1, col: 0, size: 4, orientation: "h" },
  { id: "cruiser", row: 2, col: 0, size: 3, orientation: "h" },
  { id: "submarine", row: 3, col: 0, size: 3, orientation: "h" },
  { id: "destroyer", row: 4, col: 0, size: 2, orientation: "h" },
];

describe("resolveSetup (battleship setup 어댑터 조회)", () => {
  it("battleship은 어댑터를 제공하고 다른 게임은 undefined(setup 없음)", () => {
    expect(resolveSetup("battleship")).toBeDefined();
    expect(resolveSetup("tictactoe")).toBeUndefined();
    expect(resolveSetup("chess")).toBeUndefined();
  });

  it("create는 10×10·STANDARD_FLEET 미제출 setup을 만든다", () => {
    const setup = resolveSetup("battleship")!.create() as BattleshipSetupState;
    expect(setup.size).toBe(10);
    expect([...setup.fleet].sort((a, b) => a - b)).toEqual([2, 3, 3, 4, 5]);
    expect(setup.p1Ships).toBeNull();
    expect(setup.p2Ships).toBeNull();
  });

  it("유효한 함대 제출은 채택(ok:true), 잘못된 길이/형태는 거부(ok:false·불변)", () => {
    const adapter = resolveSetup("battleship")!;
    const setup = adapter.create();
    const ok = adapter.submit(setup, "p1", { ships: VALID_FLEET });
    expect(ok.ok).toBe(true);
    expect((ok.state as BattleshipSetupState).p1Ships).toHaveLength(5);

    // 함선 길이 multiset 불일치(2척만) → 거부, 입력 보존.
    const bad = adapter.submit(setup, "p1", { ships: VALID_FLEET.slice(0, 2) });
    expect(bad.ok).toBe(false);
    expect((bad.state as BattleshipSetupState).p1Ships).toBeNull();

    // 형태 어긋난 payload(ships 누락)도 throw 없이 거부.
    expect(adapter.submit(setup, "p1", {}).ok).toBe(false);
    expect(adapter.submit(setup, "p1", null).ok).toBe(false);
  });

  it("양측 제출 완료면 start로 사격 엔진 상태(양측 보드)를 만든다", () => {
    const adapter = resolveSetup("battleship")!;
    let setup = adapter.create();
    setup = adapter.submit(setup, "p1", { ships: VALID_FLEET }).state;
    setup = adapter.submit(setup, "p2", { ships: VALID_FLEET }).state;
    expect(adapter.isComplete(setup)).toBe(true);
    const { state } = adapter.start(setup);
    expect(state).toMatchObject({ next: "p1" });
    expect((state as { p1Board: unknown[] }).p1Board).toHaveLength(10);
    expect((state as { p2Board: unknown[] }).p2Board).toHaveLength(10);
  });

  it("redact는 상대 함대 위치를 숨기고 제출 여부만 노출", () => {
    const adapter = resolveSetup("battleship")!;
    let setup = adapter.create();
    setup = adapter.submit(setup, "p1", { ships: VALID_FLEET }).state;
    // p2 시점: 자기(p2)는 미제출(null), 상대(p1)는 제출됨이지만 좌표는 빈 배열로 가림.
    const view = adapter.redact(setup, "p2") as BattleshipSetupState;
    expect(view.p2Ships).toBeNull();
    expect(view.p1Ships).toEqual([]); // 제출 완료 신호(좌표 비공개)
    expect(JSON.stringify(view)).not.toContain("carrier");
  });
});

describe("reduceRoom × battleship setup 통합", () => {
  const deps: RoomDeps = {
    resolveEngine: (g) => createEngineFor(g),
    resolveSetup,
  };
  const join: ClientMessage = { type: "joinRoom", roomCode: "BS01" };
  const submit = (ships: Ship[]): ClientMessage => ({
    type: "submitSetup",
    gameType: "battleship",
    payload: { ships },
  });

  it("2석 착석 → setup 시작(매치 미시작), 양측 제출 → 사격 매치 시작", () => {
    let room = createRoom("BS01", "battleship");
    room = reduceRoom(room, "p1conn", join, deps).room;
    const started = reduceRoom(room, "p2conn", join, deps);
    expect(started.room.match).toBeNull();
    expect(started.room.setup).not.toBeNull();
    expect(isSetupComplete(started.room.setup as BattleshipSetupState)).toBe(false);
    room = started.room;

    room = reduceRoom(room, "p1conn", submit(VALID_FLEET), deps).room;
    expect(room.match).toBeNull(); // 한쪽만 제출 → 대기

    const matchStart = reduceRoom(room, "p2conn", submit(VALID_FLEET), deps);
    expect(matchStart.room.setup).toBeNull();
    expect(matchStart.room.match).not.toBeNull();
    const gs = matchStart.outbound.find((o) => o.message.type === "gameState");
    expect(gs?.to).toBe("all");
    expect(gs?.message).toMatchObject({ type: "gameState", gameType: "battleship", turn: "p1" });
  });

  it("setup 단계 잘못된 제출은 그 연결에 invalid_setup error·불변", () => {
    let room = createRoom("BS01", "battleship");
    room = reduceRoom(room, "p1conn", join, deps).room;
    room = reduceRoom(room, "p2conn", join, deps).room;
    const r = reduceRoom(room, "p1conn", submit(VALID_FLEET.slice(0, 3)), deps);
    expect(r.room).toBe(room);
    expect(r.outbound).toEqual([
      { to: "p1conn", message: { type: "error", reason: "invalid_setup" } },
    ]);
  });
});
