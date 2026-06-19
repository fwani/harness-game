import { describe, it, expect } from "vitest";
import { WebSocket as WsWebSocket, WebSocketServer, type AddressInfo } from "ws";
import type { GameEngine, GameStatus } from "../../application/gameEngine";
import type { ServerMessage } from "../../application/protocol";
import { attachWsServer, type WsTransportDeps } from "../../infrastructure/server/wsTransport";
import { resolveRedact } from "../../infrastructure/server/redactors";
import { createWsRoomConnection, type WebSocketLike } from "./wsRoomClient";

// 브라우저 전역 WebSocket 대신 node `ws` 패키지를 주입한다(addEventListener('open'/'message') 호환).
const ctor = (url: string) => new WsWebSocket(url) as unknown as WebSocketLike;

// 함선이 배치된 가짜 battleship 엔진(setup 없이 즉시 매치 시작 → seated + gameState 흐름 검증).
type Cell = { hasShip: boolean; shipId: string | null; hit: boolean };
const cell = (hasShip: boolean): Cell => ({ hasShip, shipId: hasShip ? "s" : null, hit: false });
const FAKE_BS = {
  p1Board: [
    [cell(false), cell(false)],
    [cell(false), cell(true)],
  ],
  p2Board: [
    [cell(true), cell(false)],
    [cell(false), cell(false)],
  ],
  next: "p1" as const,
};
function fakeBattleshipEngine(): GameEngine<unknown, unknown> {
  const notOver: GameStatus = { over: false, winner: null, draw: false };
  return {
    init: () => JSON.parse(JSON.stringify(FAKE_BS)) as unknown,
    turn: (s) => (s as { next: "p1" | "p2" }).next,
    isLegal: () => true,
    apply: (s) => s,
    status: () => notOver,
  };
}

function seqConnId(): () => string {
  let n = 0;
  return () => `c${++n}`;
}

async function startServer(deps: WsTransportDeps): Promise<{ url: string; close: () => Promise<void> }> {
  const wss = new WebSocketServer({ port: 0 });
  const detach = attachWsServer(wss, deps);
  await new Promise<void>((resolve) => wss.once("listening", () => resolve()));
  const { port } = wss.address() as AddressInfo;
  return {
    url: `ws://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        detach();
        wss.close(() => resolve());
      }),
  };
}

/** RoomClient 위에 메시지 수집/대기를 얹은 테스트 헬퍼. */
function collect(client: { subscribe: (cb: (m: ServerMessage) => void) => () => void }) {
  const messages: ServerMessage[] = [];
  const used = new Set<number>();
  client.subscribe((m) => messages.push(m));
  return {
    waitFor(pred: (m: ServerMessage) => boolean, ms = 1500): Promise<ServerMessage> {
      return Promise.race([
        new Promise<ServerMessage>((resolve) => {
          const tick = () => {
            const idx = messages.findIndex((m, i) => !used.has(i) && pred(m));
            if (idx >= 0) {
              used.add(idx);
              resolve(messages[idx]!);
            } else {
              setTimeout(tick, 5);
            }
          };
          tick();
        }),
        new Promise<ServerMessage>((_, reject) =>
          setTimeout(() => reject(new Error("waitFor timeout")), ms),
        ),
      ]);
    },
  };
}

describe("createWsRoomConnection — 브라우저 ws 어댑터로 실제 서버 접속(다른 탭 시나리오)", () => {
  it("두 연결이 같은 방 코드로 붙어 각자 seated(side) + 매치 gameState를 받는다", async () => {
    const deps: WsTransportDeps = {
      newConnId: seqConnId(),
      registryDeps: {
        resolveEngine: (gt) => (gt === "battleship" ? fakeBattleshipEngine() : undefined),
        defaultGameType: "battleship",
      },
      resolveRedact,
    };
    const srv = await startServer(deps);
    try {
      // 탭 A
      const a = createWsRoomConnection(srv.url, ctor);
      const ca = collect(a.client);
      a.client.send({ type: "joinRoom", roomCode: "RM" }); // open 이전 send → 버퍼→flush
      const seatedA = await ca.waitFor((m) => m.type === "seated");
      expect((seatedA as { side: string }).side).toBe("p1");

      // 탭 B
      const b = createWsRoomConnection(srv.url, ctor);
      const cb = collect(b.client);
      b.client.send({ type: "joinRoom", roomCode: "RM" });
      const seatedB = await cb.waitFor((m) => m.type === "seated");
      expect((seatedB as { side: string }).side).toBe("p2");

      // 두 좌석이 차면 매치 시작 — 양쪽이 gameState를 받는다.
      const gsA = await ca.waitFor((m) => m.type === "gameState");
      const gsB = await cb.waitFor((m) => m.type === "gameState");
      // A(p1) 시점: 상대(p2) 함선(0,0) 가려짐. B(p2) 시점: 자기(p2) 함선(0,0) 보임.
      const aState = (gsA as { state: { p2Board: Cell[][] } }).state;
      const bState = (gsB as { state: { p2Board: Cell[][] } }).state;
      expect(aState.p2Board[0]![0]!.hasShip).toBe(false);
      expect(bState.p2Board[0]![0]!.hasShip).toBe(true);

      a.close();
      b.close();
    } finally {
      await srv.close();
    }
  });

  it("로비 연결이 listRooms로 방 목록을 받고, 다른 연결의 방 생성이 브로드캐스트된다", async () => {
    const deps: WsTransportDeps = {
      newConnId: seqConnId(),
      registryDeps: {
        resolveEngine: (gt) => (gt === "battleship" ? fakeBattleshipEngine() : undefined),
        defaultGameType: "battleship",
      },
      resolveRedact,
    };
    const srv = await startServer(deps);
    try {
      const lobby = createWsRoomConnection(srv.url, ctor);
      const cl = collect(lobby.client);
      lobby.client.send({ type: "listRooms" });
      const empty = await cl.waitFor((m) => m.type === "roomList");
      expect((empty as { rooms: unknown[] }).rooms).toEqual([]);

      // 다른 연결이 방을 만들면 로비에 roomList가 브로드캐스트된다.
      const a = createWsRoomConnection(srv.url, ctor);
      a.client.send({ type: "joinRoom", roomCode: "OPEN1" });
      const updated = await cl.waitFor(
        (m) => m.type === "roomList" && (m as { rooms: unknown[] }).rooms.length === 1,
      );
      const room = (updated as unknown as { rooms: Array<Record<string, unknown>> }).rooms[0]!;
      expect(room.code).toBe("OPEN1");
      expect(room.players).toBe(1);

      lobby.close();
      a.close();
    } finally {
      await srv.close();
    }
  });
});
