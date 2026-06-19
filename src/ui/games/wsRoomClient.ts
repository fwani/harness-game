// Presentation 경계: 실제 native ws 서버(`npm run serve:multi`)에 붙는 RoomClient 구현.
// 멀티 방 화면은 전송 비종속 RoomClient(send/subscribe) 포트만 소비하므로(인메모리 허브와 동일
// 계약), 이 어댑터를 끼우면 서로 다른 브라우저 탭이 같은 방 코드로 접속해 실시간 동기화된다.
//
// - 서버가 이미 side별 fog-of-war 가림(redactors)·to:"all" 해소를 하므로, 이 클라이언트는 추가
//   가림 없이 수신 메시지를 그대로 전달한다(인메모리 허브가 로컬에서 하던 가림은 서버가 담당).
// - 소켓 OPEN 이전 send는 버퍼에 모았다가 open 시 flush한다(조인 직후 메시지 유실 방지).
// - 자신의 좌석 side는 서버가 보내는 `seated` 메시지로 알 수 있다(protocol).
import { isServerMessage, type ClientMessage, type ServerMessage } from "../../application/protocol";
import type { RoomClient } from "./battleshipRoomClient";

/** 브라우저 전역 WebSocket과 호환되는 최소 인터페이스(테스트에서 `ws` 패키지 주입 가능). */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: "open", cb: () => void): void;
  addEventListener(type: "message", cb: (ev: { data: unknown }) => void): void;
  addEventListener(type: "close", cb: () => void): void;
}

export type WebSocketCtor = (url: string) => WebSocketLike;

/** 기본 WebSocket 생성기(브라우저 전역). 테스트는 ctor를 주입해 `ws` 패키지로 대체한다. */
const defaultCtor: WebSocketCtor = (url) => new WebSocket(url) as unknown as WebSocketLike;

/** WebSocket.OPEN 상수(브라우저/ws 공통 값 1). */
const OPEN = 1;

/**
 * ws 서버에 붙는 RoomClient 연결을 만든다. 한 호출 = 한 연결(= 한 좌석/관전).
 * 반환된 close()로 소켓을 닫는다(방 나가기 → 서버가 disconnect 정리).
 * @param url 예: `ws://localhost:8787`
 * @param ctor 테스트용 WebSocket 생성기 주입(기본은 브라우저 전역 WebSocket).
 */
export function createWsRoomConnection(
  url: string,
  ctor: WebSocketCtor = defaultCtor,
): { client: RoomClient; close: () => void } {
  const socket = ctor(url);
  const listeners = new Set<(m: ServerMessage) => void>();
  const pending: string[] = [];
  let open = false;

  socket.addEventListener("open", () => {
    open = true;
    for (const frame of pending) {
      socket.send(frame);
    }
    pending.length = 0;
  });

  socket.addEventListener("message", (ev) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(ev.data));
    } catch {
      return; // 잘못된 프레임은 무시(throw 금지).
    }
    if (!isServerMessage(parsed)) {
      return; // 알 수 없는 서버 메시지는 무시.
    }
    for (const fn of listeners) {
      fn(parsed);
    }
  });

  const client: RoomClient = {
    send(message: ClientMessage): void {
      const frame = JSON.stringify(message);
      if (open && socket.readyState === OPEN) {
        socket.send(frame);
      } else {
        pending.push(frame);
      }
    },
    subscribe(onMessage: (m: ServerMessage) => void): () => void {
      listeners.add(onMessage);
      return () => {
        listeners.delete(onMessage);
      };
    },
  };

  return { client, close: () => socket.close() };
}
