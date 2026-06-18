// Presentation 경계: 멀티 방 화면이 **전송 비종속**으로 소비하는 `RoomClient` 포트 +
// 소켓 없는 인메모리 가짜 구현. UI는 ws/소켓을 직접 모르고 주입된 RoomClient(send/subscribe)만 쓴다.
// 실제 native `ws` RoomClient 바인딩은 별도(#595, needs-human) — 그쪽이 같은 포트를 구현하는 접점이다.
//
// 인메모리 구현은 새 규칙을 만들지 않고 기존 멀티 코어 위에 라우팅만 올린다:
// - reduceRoom(#526 단일 방 런타임)에 ClientMessage를 위임해 RoomState를 전이하고 Outbound를 받는다.
// - resolveSetup(setupRegistry)·createEngineFor(engineRegistry)를 주입해 battleship 비공개 배치(setup)→
//   사격 매치 흐름을 그대로 구동한다(규칙 재구현 금지).
// - 소켓 없이 2개의 좌석(connId)을 한 프로세스에서 구동한다(로컬/테스트용).
//
// battleship 시점 안개(fog-of-war): reduceRoom은 gameState를 `to:"all"`로 **전체 상태**를 내보내므로,
// 그대로 라우팅하면 상대 미사격 칸의 함선 위치가 누출된다. 따라서 송신 직전 수신 좌석의 side 기준
// redactBattleshipState(#590)로 가린 뷰만 전달한다(setupState는 reduceRoom이 이미 좌석별로 가려 보낸다).
import type { GameId } from "../../domain/gameRecord";
import type { Side } from "../../application/gameEngine";
import type { ClientMessage, ServerMessage } from "../../application/protocol";
import {
  createRoom,
  reduceRoom,
  type Outbound,
  type RoomDeps,
  type RoomState,
} from "../../infrastructure/server/room";
import { createEngineFor } from "../../application/engineRegistry";
import { resolveSetup } from "../../infrastructure/server/setupRegistry";
import {
  redactBattleshipState,
  type BattleshipEngineState,
} from "../../application/battleshipEngine";

/**
 * 한 연결(좌석)이 방과 주고받는 전송 비종속 포트.
 * 멀티 방 화면은 이 포트만 알고 소켓/ws는 모른다(주입형 — 인메모리 또는 실제 ws #595).
 */
export interface RoomClient {
  /** 클라이언트→서버 메시지(join/submitSetup/makeMove/leave/rematch). */
  send(message: ClientMessage): void;
  /** 서버→클라이언트 메시지 구독. 해지 함수를 반환한다. */
  subscribe(onMessage: (m: ServerMessage) => void): () => void;
}

/** 한 방을 소켓 없이 구동하는 인메모리 허브(여러 connId를 한 프로세스에서 잇는다). */
export interface InMemoryRoomHub {
  /** connId로 한 좌석(연결)을 잇는 RoomClient를 만든다. */
  connect(connId: string): RoomClient;
  /** 현재 방 상태(읽기 — 테스트/진단용). */
  getRoom(): RoomState;
}

/** 엔진/ setup 해석 주입(엔진 미지원이면 undefined). reduceRoom에 그대로 전달한다. */
const ROOM_DEPS: RoomDeps = {
  resolveEngine: (gameType, config) => {
    try {
      return createEngineFor(gameType, config);
    } catch {
      // 미지원 gameType은 throw 대신 undefined로 — reduceRoom이 error 메시지로 처리한다.
      return undefined;
    }
  },
  resolveSetup,
};

/**
 * 소켓 없이 한 방을 구동하는 인메모리 허브를 만든다(로컬/테스트용).
 * reduceRoom으로 상태를 전이하고, 산출된 Outbound를 수신자 connId로 해소해 라우팅한다
 * (`to:"all"`은 현재 좌석+관전자 전체로 확장). battleship gameState는 수신 좌석 side로 가린다.
 */
export function createInMemoryRoomHub(
  roomCode: string,
  gameType: GameId = "battleship",
): InMemoryRoomHub {
  let room = createRoom(roomCode, gameType);
  const listeners = new Map<string, Set<(m: ServerMessage) => void>>();

  /** connId가 착석한 좌석의 side(관전자/미착석이면 null). */
  function sideOf(connId: string): Side | null {
    const seat = room.seats.find((s) => s.connId === connId);
    return seat ? seat.info.side : null;
  }

  /** Outbound 한 건의 실제 수신자 connId 목록(`to:"all"`은 좌석+관전자 전체). */
  function recipientsOf(to: Outbound["to"]): string[] {
    if (to !== "all") {
      return [to];
    }
    return [...room.seats.map((s) => s.connId), ...room.spectators];
  }

  /**
   * 수신자 시점으로 가린 메시지를 만든다. 가려서 전달할 수 없으면(=battleship gameState인데 수신자가
   * 좌석이 아님) null을 돌려 **전달을 생략**한다(관전자 함선 누출 방지 — 관전 지원은 범위 밖).
   * battleship gameState만 수신 좌석 side로 안개 가림하며, 그 외 메시지는 그대로 통과한다.
   */
  function redactFor(message: ServerMessage, connId: string): ServerMessage | null {
    if (message.type !== "gameState" || message.gameType !== "battleship") {
      return message;
    }
    const side = sideOf(connId);
    if (side === null) {
      return null;
    }
    return {
      ...message,
      state: redactBattleshipState(message.state as BattleshipEngineState, side),
    };
  }

  /** Outbound 목록을 수신자별로(필요하면 가려서) 전달한다. */
  function deliver(outbound: ReadonlyArray<Outbound>): void {
    for (const out of outbound) {
      for (const connId of recipientsOf(out.to)) {
        const set = listeners.get(connId);
        if (set === undefined || set.size === 0) {
          continue;
        }
        const message = redactFor(out.message, connId);
        if (message === null) {
          continue;
        }
        for (const fn of set) {
          fn(message);
        }
      }
    }
  }

  return {
    connect(connId: string): RoomClient {
      return {
        send(message: ClientMessage): void {
          const result = reduceRoom(room, connId, message, ROOM_DEPS);
          room = result.room;
          deliver(result.outbound);
        },
        subscribe(onMessage: (m: ServerMessage) => void): () => void {
          let set = listeners.get(connId);
          if (set === undefined) {
            set = new Set();
            listeners.set(connId, set);
          }
          set.add(onMessage);
          return () => {
            set!.delete(onMessage);
          };
        },
      };
    },
    getRoom(): RoomState {
      return room;
    },
  };
}
