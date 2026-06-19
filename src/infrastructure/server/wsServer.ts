// Infrastructure layer: 로컬 멀티플레이 ws 서버 엔트리포인트.
// 멀티룸 레지스트리(#543) + 엔진 레지스트리(#525) + 비공개 배치 setup(#593) + 시점 가림(#590)을
// native `ws` 전송(wsTransport)에 묶어, 같은 브라우저 여러 탭/다른 브라우저가 방 코드로 접속해
// 같은 매치를 플레이하게 한다. **로컬 서버 + 다중 탭 범위까지만** — 원격(인터넷) 노출/배포는 범위 밖.
//
// 식별은 익명 connId(랜덤 UUID)만 — auth/권한/세션 없음. 민감정보를 로그/리터럴에 남기지 않는다.
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { createEngineFor } from "../../application/engineRegistry";
import type { GameId } from "../../domain/gameRecord";
import type { GameEngine } from "../../application/gameEngine";
import type { ResolveEngine } from "./room";
import { resolveSetup } from "./setupRegistry";
import { resolveRedact } from "./redactors";
import { attachWsServer } from "./wsTransport";

/** 화이트리스트 게임은 엔진을 해석하고, 비지원이면 undefined(레지스트리 규약). */
const resolveEngine: ResolveEngine = (gameType, config) => {
  try {
    return createEngineFor(gameType, config) as GameEngine<unknown, unknown>;
  } catch {
    return undefined;
  }
};

/** 로컬 ws 서버를 띄우고 정리 함수를 반환한다(테스트/호출자가 닫을 수 있게). */
export function startWsServer(options?: {
  port?: number;
  defaultGameType?: GameId;
}): { wss: WebSocketServer; close: () => Promise<void> } {
  const port = options?.port ?? Number(process.env.PORT ?? 8787);
  const defaultGameType = options?.defaultGameType ?? "battleship";

  const wss = new WebSocketServer({ port });
  const detach = attachWsServer(wss, {
    newConnId: () => randomUUID(),
    registryDeps: { resolveEngine, resolveSetup, defaultGameType },
    resolveRedact,
  });

  const close = (): Promise<void> =>
    new Promise((resolve) => {
      detach();
      wss.close(() => resolve());
    });

  return { wss, close };
}

// 스크립트로 직접 실행될 때만 서버를 구동한다(테스트 import 시에는 구동하지 않음).
const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { wss } = startWsServer();
  const addr = wss.address();
  const port = typeof addr === "object" && addr !== null ? addr.port : addr;
  console.log(`[harness-game] 멀티 ws 서버 기동 — ws://localhost:${port} (로컬 전용)`);
}
