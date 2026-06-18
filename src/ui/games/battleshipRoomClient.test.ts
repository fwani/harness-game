import { describe, expect, it } from "vitest";
import type { ServerMessage } from "../../application/protocol";
import type { Ship } from "../../domain/battleship";
import type { BattleshipEngineState } from "../../application/battleshipEngine";
import { createInMemoryRoomHub, type RoomClient } from "./battleshipRoomClient";

// 표준 10×10 + STANDARD_FLEET(5·4·3·3·2)에 유효한(겹침/범위 통과) 함대.
// 양측 같은 배치를 별도 보드에 쓴다(서로 다른 보드라 무방).
function validFleet(prefix: string): Ship[] {
  return [
    { id: `${prefix}-0`, row: 0, col: 0, size: 5, orientation: "h" },
    { id: `${prefix}-1`, row: 1, col: 0, size: 4, orientation: "h" },
    { id: `${prefix}-2`, row: 2, col: 0, size: 3, orientation: "h" },
    { id: `${prefix}-3`, row: 3, col: 0, size: 3, orientation: "h" },
    { id: `${prefix}-4`, row: 4, col: 0, size: 2, orientation: "h" },
  ];
}

/** 위 함대가 점유하는 모든 칸(전부 사격하면 전 함대 격침). */
const FLEET_CELLS: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 0], [1, 1], [1, 2], [1, 3],
  [2, 0], [2, 1], [2, 2],
  [3, 0], [3, 1], [3, 2],
  [4, 0], [4, 1],
];

/** 함선이 없는 물 칸들(아래 두 행 — p1 함선은 0~4행이라 빗나감만 난다). */
const WATER_CELLS: Array<[number, number]> = Array.from({ length: 20 }, (_, i) => [
  9 - Math.floor(i / 10),
  i % 10,
]);

/** 한 좌석의 마지막 수신 메시지를 종류별로 모으는 수집기. */
function collector(client: RoomClient) {
  const messages: ServerMessage[] = [];
  client.subscribe((m) => messages.push(m));
  return {
    messages,
    last<T extends ServerMessage["type"]>(type: T) {
      const filtered = messages.filter((m) => m.type === type);
      return filtered[filtered.length - 1] as Extract<ServerMessage, { type: T }> | undefined;
    },
  };
}

/** 두 좌석이 입장하고 양측 함대를 제출해 매치를 시작한 허브를 만든다. */
function startedMatch() {
  const hub = createInMemoryRoomHub("ROOM1");
  const p1 = hub.connect("c1");
  const p2 = hub.connect("c2");
  const a = collector(p1);
  const b = collector(p2);
  p1.send({ type: "joinRoom", roomCode: "ROOM1" });
  p2.send({ type: "joinRoom", roomCode: "ROOM1" });
  p1.send({ type: "submitSetup", gameType: "battleship", payload: { ships: validFleet("p1") } });
  p2.send({ type: "submitSetup", gameType: "battleship", payload: { ships: validFleet("p2") } });
  return { hub, p1, p2, a, b };
}

describe("createInMemoryRoomHub — 좌석 입장·setup", () => {
  it("두 좌석 입장 시 p1/p2로 착석하고 setup 단계를 시작한다", () => {
    const hub = createInMemoryRoomHub("ROOM1");
    const p1 = hub.connect("c1");
    const p2 = hub.connect("c2");
    const a = collector(p1);
    const b = collector(p2);

    p1.send({ type: "joinRoom", roomCode: "ROOM1" });
    expect(a.last("roomState")?.players.map((pl) => pl.side)).toEqual(["p1"]);

    p2.send({ type: "joinRoom", roomCode: "ROOM1" });
    // 2석이 차면 setup 단계 — 각 좌석은 자기 시점 setupState를 받는다(상대 위치 미노출).
    expect(hub.getRoom().seats.map((s) => s.info.side)).toEqual(["p1", "p2"]);
    expect(a.last("setupState")).toBeDefined();
    expect(b.last("setupState")).toBeDefined();
    expect(a.last("roomState")?.players).toHaveLength(2);
  });

  it("양측 함대 제출 시 매치가 시작되고 양쪽에 gameState가 동기화된다", () => {
    const { a, b } = startedMatch();
    const ga = a.last("gameState");
    const gb = b.last("gameState");
    expect(ga?.status.over).toBe(false);
    expect(ga?.turn).toBe("p1"); // 선은 p1
    expect(gb?.turn).toBe("p1");
  });
});

describe("createInMemoryRoomHub — 사격 동기화·턴 소유권·안개", () => {
  it("한 좌석의 makeMove가 양쪽 뷰에 동기화된다", () => {
    const { p1, a, b } = startedMatch();
    // p1이 p2 함선 칸 (0,0)을 사격 → 명중.
    p1.send({ type: "makeMove", gameType: "battleship", move: { row: 0, col: 0 } });
    const ga = a.last("gameState")!;
    const gb = b.last("gameState")!;
    // 양쪽 모두 차례가 p2로 넘어가고 미종료.
    expect(ga.turn).toBe("p2");
    expect(gb.turn).toBe("p2");
    // p2 시점(자기 보드): (0,0)이 피격(hit)으로 보인다.
    const p2View = gb.state as BattleshipEngineState;
    expect(p2View.p2Board[0]![0]!.hit).toBe(true);
    expect(p2View.p2Board[0]![0]!.hasShip).toBe(true);
  });

  it("상대 차례에 사격하면 그 연결에만 error(턴 소유권), 브로드캐스트 없음", () => {
    const { p2, b } = startedMatch();
    const before = b.messages.length;
    // 선은 p1인데 p2가 사격 시도 → 그 연결(c2)에만 error.
    p2.send({ type: "makeMove", gameType: "battleship", move: { row: 0, col: 0 } });
    expect(b.last("error")).toBeDefined();
    // 새 gameState 브로드캐스트는 없어야 한다(차례가 아니라 거부됨).
    const after = b.messages.slice(before);
    expect(after.every((m) => m.type !== "gameState")).toBe(true);
  });

  it("상대 미사격 칸의 함선 위치가 내 뷰에 노출되지 않는다(fog-of-war)", () => {
    const { a, b } = startedMatch();
    // p1 시점: 상대(p2) 보드의 미사격 함선 칸은 가려져 hasShip=false 여야 한다.
    const p1View = a.last("gameState")!.state as BattleshipEngineState;
    for (const [r, c] of FLEET_CELLS) {
      expect(p1View.p2Board[r]![c]!.hasShip).toBe(false); // 상대 함선 누출 금지
    }
    // 반면 자기 보드(p1Board)의 함선은 그대로 보인다.
    expect(p1View.p1Board[0]![0]!.hasShip).toBe(true);

    // 대칭: p2 시점에서도 상대(p1) 함선이 가려진다.
    const p2View = b.last("gameState")!.state as BattleshipEngineState;
    for (const [r, c] of FLEET_CELLS) {
      expect(p2View.p1Board[r]![c]!.hasShip).toBe(false);
    }
    expect(p2View.p2Board[0]![0]!.hasShip).toBe(true);
  });
});

describe("createInMemoryRoomHub — 전 함대 격침 종료·재대국", () => {
  it("전 함대 격침 시 종료(승자 p1)·gameOver 후 재대국으로 setup이 다시 시작된다", () => {
    const { p1, p2, a, b } = startedMatch();

    // p1이 p2 함선 칸을 모두 사격(사이에 p2는 물 칸을 쏴 빗나감만 낸다 — p1 함대는 안전).
    let waterIdx = 0;
    for (const [r, c] of FLEET_CELLS) {
      p1.send({ type: "makeMove", gameType: "battleship", move: { row: r, col: c } });
      if (a.last("gameState")!.status.over) {
        break;
      }
      const [wr, wc] = WATER_CELLS[waterIdx++]!;
      p2.send({ type: "makeMove", gameType: "battleship", move: { row: wr, col: wc } });
    }

    const finalA = a.last("gameState")!;
    expect(finalA.status.over).toBe(true);
    expect(finalA.status.winner).toBe("p1");
    // 종료 시 gameOver 기록도 양쪽에 브로드캐스트된다.
    expect(a.last("gameOver")).toBeDefined();
    expect(b.last("gameOver")).toBeDefined();

    // 재대국: battleship은 setup 어댑터가 있어 비공개 배치 단계부터 다시 시작한다.
    const beforeSetupCount = a.messages.filter((m) => m.type === "setupState").length;
    p1.send({ type: "requestRematch" });
    const afterSetupCount = a.messages.filter((m) => m.type === "setupState").length;
    expect(afterSetupCount).toBeGreaterThan(beforeSetupCount);
  });
});
