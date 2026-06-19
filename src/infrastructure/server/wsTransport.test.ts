import { describe, it, expect } from "vitest";
import { WebSocket, WebSocketServer, type AddressInfo } from "ws";
import type { GameEngine, GameStatus } from "../../application/gameEngine";
import { createEngineFor } from "../../application/engineRegistry";
import type { ResolveEngine } from "./room";
import { resolveRedact } from "./redactors";
import { attachWsServer, type WsTransportDeps } from "./wsTransport";

// 화이트리스트 게임은 엔진 해석, 비지원이면 undefined.
const realResolveEngine: ResolveEngine = (gameType, config) => {
  try {
    return createEngineFor(gameType, config) as GameEngine<unknown, unknown>;
  } catch {
    return undefined;
  }
};

// 결정적 connId(테스트 추적용): c1, c2, ...
function seqConnId(): () => string {
  let n = 0;
  return () => `c${++n}`;
}

// ── 실제 ws 서버를 띄우는 헬퍼 ──────────────────────────────────────────────
async function startTestServer(deps: WsTransportDeps): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
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

// 수신 메시지: type 디스크리미네이터 + 게임별 임의 필드(인덱스 시그니처). 깊은 단언은 캐스팅한다.
type Msg = { type: string; [key: string]: unknown };

// ── 메시지 수집·대기 클라이언트 ─────────────────────────────────────────────
class TestClient {
  readonly ws: WebSocket;
  readonly messages: Msg[] = [];
  private readonly used = new Set<number>();
  private waiters: Array<{ pred: (m: Msg) => boolean; resolve: (m: Msg) => void }> = [];

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (data) => {
      this.messages.push(JSON.parse(String(data)) as Msg);
      this.tryResolve();
    });
  }

  static async connect(url: string): Promise<TestClient> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve) => ws.once("open", () => resolve()));
    return new TestClient(ws);
  }

  private tryResolve(): void {
    for (const w of [...this.waiters]) {
      const idx = this.messages.findIndex((m, i) => !this.used.has(i) && w.pred(m));
      if (idx >= 0) {
        this.used.add(idx);
        this.waiters = this.waiters.filter((x) => x !== w);
        w.resolve(this.messages[idx]!);
      }
    }
  }

  /** 아직 소비되지 않은 메시지 중 pred를 만족하는 첫 메시지를 기다린다(중복 소비 방지). */
  waitFor(pred: (m: Msg) => boolean, ms = 1500): Promise<Msg> {
    return Promise.race([
      new Promise<Msg>((resolve) => {
        this.waiters.push({ pred, resolve });
        this.tryResolve();
      }),
      new Promise<Msg>((_, reject) =>
        setTimeout(() => reject(new Error("waitFor timeout")), ms),
      ),
    ]);
  }

  waitForType(type: string, ms = 1500): Promise<Msg> {
    return this.waitFor((m) => m.type === type, ms);
  }

  send(obj: unknown): void {
    this.ws.send(JSON.stringify(obj));
  }

  close(): void {
    this.ws.close();
  }
}

const CF_DEPS: WsTransportDeps = {
  newConnId: seqConnId(),
  registryDeps: { resolveEngine: realResolveEngine, defaultGameType: "connectfour" },
  resolveRedact,
};

describe("attachWsServer — 실제 ws 전송 통합", () => {
  it("① 같은 방 코드 입장 → 착석 → 매치 시작 gameState 양쪽 브로드캐스트", async () => {
    const srv = await startTestServer({ ...CF_DEPS, newConnId: seqConnId() });
    try {
      const a = await TestClient.connect(srv.url);
      const b = await TestClient.connect(srv.url);
      a.send({ type: "joinRoom", roomCode: "R1" });
      b.send({ type: "joinRoom", roomCode: "R1" });
      const gsA = await a.waitForType("gameState");
      const gsB = await b.waitForType("gameState");
      expect(gsA.gameType).toBe("connectfour");
      expect(gsB.gameType).toBe("connectfour");
      a.close();
      b.close();
    } finally {
      await srv.close();
    }
  });

  it("② 한쪽 makeMove가 양쪽에 gameState 동기화", async () => {
    const srv = await startTestServer({ ...CF_DEPS, newConnId: seqConnId() });
    try {
      const a = await TestClient.connect(srv.url);
      const b = await TestClient.connect(srv.url);
      a.send({ type: "joinRoom", roomCode: "R2" });
      b.send({ type: "joinRoom", roomCode: "R2" });
      await a.waitForType("gameState"); // 매치 시작분 소비
      await b.waitForType("gameState");
      // 선(p1=a)이 한 수 둔다.
      a.send({ type: "makeMove", gameType: "connectfour", move: { col: 0 } });
      const gsA = await a.waitForType("gameState");
      const gsB = await b.waitForType("gameState");
      // 다음 차례는 p2로 넘어가 있어야 한다(동기화 확인).
      expect(gsA.turn).toBe("p2");
      expect(gsB.turn).toBe("p2");
      a.close();
      b.close();
    } finally {
      await srv.close();
    }
  });

  it("③ 잘못된 차례의 수는 그 연결에만 error(상대에는 안 감)", async () => {
    const srv = await startTestServer({ ...CF_DEPS, newConnId: seqConnId() });
    try {
      const a = await TestClient.connect(srv.url);
      const b = await TestClient.connect(srv.url);
      a.send({ type: "joinRoom", roomCode: "R3" });
      b.send({ type: "joinRoom", roomCode: "R3" });
      await a.waitForType("gameState");
      await b.waitForType("gameState");
      // p2(b)가 선이 아닌데 둔다 → b에게만 error.
      b.send({ type: "makeMove", gameType: "connectfour", move: { col: 0 } });
      const err = await b.waitForType("error");
      expect(err.reason).toBeTruthy();
      // a에는 error가 오지 않아야 한다(짧게 대기 후 타임아웃이면 통과).
      await expect(a.waitForType("error", 300)).rejects.toThrow();
      a.close();
      b.close();
    } finally {
      await srv.close();
    }
  });

  it("④ 잘못된 JSON은 그 연결에만 invalid_json error", async () => {
    const srv = await startTestServer({ ...CF_DEPS, newConnId: seqConnId() });
    try {
      const a = await TestClient.connect(srv.url);
      a.ws.send("not json{");
      const err = await a.waitForType("error");
      expect(err.reason).toBe("invalid_json");
      a.close();
    } finally {
      await srv.close();
    }
  });

  it("⑤ 한쪽 disconnect 시 정리 후 남은 좌석에 roomState 갱신", async () => {
    const srv = await startTestServer({ ...CF_DEPS, newConnId: seqConnId() });
    try {
      const a = await TestClient.connect(srv.url);
      const b = await TestClient.connect(srv.url);
      a.send({ type: "joinRoom", roomCode: "R5" });
      b.send({ type: "joinRoom", roomCode: "R5" });
      await b.waitForType("gameState");
      a.close(); // p1 연결 종료 → disconnect 합성
      const rs = await b.waitFor(
        (m) => m.type === "roomState" && Array.isArray(m.players) && m.players.length === 1,
      );
      expect(rs.players as unknown[]).toHaveLength(1);
    } finally {
      await srv.close();
    }
  });
});

// ── battleship 안개(fog-of-war) 가림: 함선이 배치된 가짜 엔진으로 setup 없이 즉시 매치 ──────────
type Cell = { hasShip: boolean; shipId: string | null; hit: boolean };
const cell = (hasShip: boolean): Cell => ({ hasShip, shipId: hasShip ? "s" : null, hit: false });

// p1 함선 (1,1) · p2 함선 (0,0). 둘 다 미사격(hit:false) → 상대 뷰에서 가려져야 한다.
const FAKE_BS_STATE = {
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
    init: () => JSON.parse(JSON.stringify(FAKE_BS_STATE)) as unknown,
    turn: (s) => (s as { next: "p1" | "p2" }).next,
    isLegal: () => true,
    apply: (s) => s,
    status: () => notOver,
  };
}

describe("attachWsServer — battleship 시점 가림(fog-of-war)", () => {
  it("⑥ 상대 미사격 칸의 함선 위치가 상대 뷰에 노출되지 않는다", async () => {
    const deps: WsTransportDeps = {
      newConnId: seqConnId(),
      registryDeps: {
        resolveEngine: (gt) => (gt === "battleship" ? fakeBattleshipEngine() : undefined),
        defaultGameType: "battleship",
      },
      resolveRedact,
    };
    const srv = await startTestServer(deps);
    try {
      const a = await TestClient.connect(srv.url); // p1
      const b = await TestClient.connect(srv.url); // p2
      a.send({ type: "joinRoom", roomCode: "BS" });
      b.send({ type: "joinRoom", roomCode: "BS" });
      const gsA = await a.waitForType("gameState");
      const gsB = await b.waitForType("gameState");
      type BS = { p1Board: Cell[][]; p2Board: Cell[][] };
      const aState = gsA.state as BS;
      const bState = gsB.state as BS;

      // p1(a) 시점: 상대(p2) 보드의 함선 칸(0,0)은 가려져야 한다.
      expect(aState.p2Board[0]![0]!.hasShip).toBe(false);
      expect(aState.p2Board[0]![0]!.shipId).toBe(null);
      // 자기(p1) 보드의 함선(1,1)은 그대로 보인다.
      expect(aState.p1Board[1]![1]!.hasShip).toBe(true);

      // p2(b) 시점: 자기(p2) 보드의 함선(0,0)은 보이고, 상대(p1) 함선(1,1)은 가려진다.
      expect(bState.p2Board[0]![0]!.hasShip).toBe(true);
      expect(bState.p1Board[1]![1]!.hasShip).toBe(false);

      a.close();
      b.close();
    } finally {
      await srv.close();
    }
  });
});
