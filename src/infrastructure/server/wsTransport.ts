// Infrastructure layer: native `ws` 전송 어댑터. 전송 비종속 멀티룸 레지스트리(#543)를 실제
// WebSocket 서버·연결 수명주기에 바인딩한다. **소켓/전송 import는 이 레이어에만** 둔다
// (application/domain은 `ws`를 import하지 않는다 — 레이어 경계).
//
// 책임: ws 연결마다 불투명 connId 부여 → 수신 텍스트 프레임을 JSON 파싱·레지스트리(#543)에 위임
// → 산출된 Outbound(이미 to:"all"이 connId로 해소됨)를 각 소켓에 라우팅 → 연결 종료 시 disconnect
// 정리. 게임 시점 가림(fog-of-war)은 게임 무관 포트(resolveRedact)로 주입받아 송신 직전 side별로
// 적용한다(예: battleship 상대 미사격 칸 함선 위치 누수 방지). 같은 메시지라도 수신자 side에 따라
// 다른 뷰가 나가므로 가림은 연결 단위로 적용한다.
import type { WebSocket, WebSocketServer } from "ws";
import type { Side } from "../../application/gameEngine";
import type { ServerMessage } from "../../application/protocol";
import type { GameId } from "../../domain/gameRecord";
import {
  createRegistry,
  dispatch,
  disconnect,
  type AddressedOut,
  type RegistryDeps,
  type RegistryState,
} from "./roomRegistry";

/**
 * gameType → "gameState.state를 viewer 시점으로 가리는 순수 함수" 조회(게임 무관 포트).
 * viewer는 그 연결의 좌석 side, 좌석이 없으면(관전자) null. 가림이 불필요한 게임은 undefined.
 */
export type ResolveRedact = (
  gameType: GameId,
) => ((state: unknown, viewer: Side | null) => unknown) | undefined;

/** ws 전송 어댑터가 주입받는 의존(부수효과 격리). */
export interface WsTransportDeps {
  /** 새 연결마다 부여할 불투명 connId 생성기(랜덤 id 등). 민감정보 금지. */
  newConnId: () => string;
  /** 레지스트리(#543) 위임에 쓸 deps(엔진/선택 setup 해석 + 자동개설 defaultGameType). */
  registryDeps: RegistryDeps;
  /** 선택: 게임별 gameState 시점 가림. 미지정이면 가림 없이 그대로 전달. */
  resolveRedact?: ResolveRedact;
}

/**
 * WebSocketServer를 멀티룸 레지스트리에 바인딩한다. 반환값은 정리 함수(리스너 해제 + 소켓 닫기).
 * 레지스트리 상태는 이 어댑터가 보유(in-memory)하며 메시지마다 불변 전이로 교체한다.
 */
export function attachWsServer(wss: WebSocketServer, deps: WsTransportDeps): () => void {
  let state: RegistryState = createRegistry();
  const sockets = new Map<string, WebSocket>();

  /** 연결의 좌석 side(현재 state 기준). 좌석이 없으면(관전자/미입장) null. */
  function sideOf(connId: string): Side | null {
    const code = state.connRoom.get(connId);
    if (code === undefined) {
      return null;
    }
    const room = state.rooms.get(code);
    return room?.seats.find((s) => s.connId === connId)?.info.side ?? null;
  }

  /** 한 connId에게 ServerMessage 1건 송신. gameState는 수신자 side로 가려서 보낸다. 닫힌 소켓은 skip. */
  function sendTo(connId: string, message: ServerMessage): void {
    const socket = sockets.get(connId);
    if (socket === undefined || socket.readyState !== socket.OPEN) {
      return;
    }
    let outMessage: ServerMessage = message;
    if (message.type === "gameState" && deps.resolveRedact !== undefined) {
      const redact = deps.resolveRedact(message.gameType);
      if (redact !== undefined) {
        outMessage = { ...message, state: redact(message.state, sideOf(connId)) };
      }
    }
    socket.send(JSON.stringify(outMessage));
  }

  function deliver(outbound: ReadonlyArray<AddressedOut>): void {
    for (const o of outbound) {
      sendTo(o.connId, o.message);
    }
  }

  function handleConnection(socket: WebSocket): void {
    const connId = deps.newConnId();
    sockets.set(connId, socket);

    socket.on("message", (data: unknown) => {
      let raw: unknown;
      try {
        // ws 데이터는 string | Buffer | ArrayBuffer 등 — 텍스트로 정규화해 JSON 파싱.
        raw = JSON.parse(String(data));
      } catch {
        sendTo(connId, { type: "error", reason: "invalid_json" });
        return;
      }

      // 대상 방 코드: joinRoom은 메시지의 roomCode, 그 외는 이 연결이 입장해 있는 방.
      const code =
        isJoinRoom(raw) && typeof raw.roomCode === "string"
          ? raw.roomCode
          : state.connRoom.get(connId);
      if (code === undefined) {
        sendTo(connId, { type: "error", reason: "not_in_room" });
        return;
      }

      const result = dispatch(state, connId, code, raw, deps.registryDeps);
      state = result.state;
      deliver(result.outbound);

      // joinRoom으로 이 연결이 좌석에 앉았으면, 원격 클라이언트가 자기 side를 알 수 있도록
      // 그 연결에게만 seated를 보낸다(방 코어 reduceRoom은 좌석을 connId로만 다룬다).
      if (isJoinRoom(raw)) {
        const side = sideOf(connId);
        if (side !== null) {
          sendTo(connId, { type: "seated", side, roomCode: code });
        }
      }
    });

    socket.on("close", () => {
      const result = disconnect(state, connId, deps.registryDeps);
      state = result.state;
      deliver(result.outbound);
      sockets.delete(connId);
    });

    // 소켓 에러는 close 핸들러가 정리하도록 둔다(여기서 throw 금지).
    socket.on("error", () => {});
  }

  wss.on("connection", handleConnection);

  return () => {
    wss.off("connection", handleConnection);
    for (const socket of sockets.values()) {
      try {
        socket.close();
      } catch {
        // 닫기 실패는 무시(정리 경로).
      }
    }
    sockets.clear();
  };
}

/** raw가 joinRoom 메시지 형태인지(코드 추출용 최소 판정). 본 검증은 dispatch의 isClientMessage가 한다. */
function isJoinRoom(raw: unknown): raw is { type: "joinRoom"; roomCode?: unknown } {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { type?: unknown }).type === "joinRoom"
  );
}
