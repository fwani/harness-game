import { describe, expect, it } from "vitest";
import type { GameStatus, Side } from "../../application/gameEngine";
import type { ServerMessage } from "../../application/protocol";
import type { Ship } from "../../domain/battleship";
import { createInMemoryRoomHub, type RoomClient } from "./battleshipRoomClient";
import { SELF_PLAYER } from "./streakView";
import { getStandings, recordGame } from "../records";
import {
  MULTI_PLAYER_A,
  MULTI_PLAYER_B,
  battleshipMultiMatchRecord,
  battleshipMultiWinSide,
  type MatchRecordEntry,
} from "./battleshipMultiRecord";

const status = (over: boolean, winner: Side | null): GameStatus => ({
  over,
  winner,
  draw: false,
});

describe("battleshipMultiWinSide — 권위 status → WinSide 환원", () => {
  it("승자 p1 → \"a\", p2 → \"b\"(좌석 무관 절대 승자)", () => {
    expect(battleshipMultiWinSide(status(true, "p1"))).toBe("a");
    expect(battleshipMultiWinSide(status(true, "p2"))).toBe("b");
  });

  it("미종료거나 승자 미정이면 null(기록 대상 아님)", () => {
    expect(battleshipMultiWinSide(status(false, null))).toBeNull();
    expect(battleshipMultiWinSide(status(false, "p1"))).toBeNull();
    expect(battleshipMultiWinSide(status(true, null))).toBeNull();
  });
});

describe("battleshipMultiMatchRecord — 1회 기록 가드", () => {
  it("종료 + 미기록이면 안정 키(나/상대(P2))와 승자 매핑으로 기록 인자를 낸다", () => {
    expect(battleshipMultiMatchRecord(status(true, "p1"), false)).toEqual({
      playerA: MULTI_PLAYER_A,
      playerB: MULTI_PLAYER_B,
      win: "a",
    });
    expect(battleshipMultiMatchRecord(status(true, "p2"), false)).toEqual({
      playerA: MULTI_PLAYER_A,
      playerB: MULTI_PLAYER_B,
      win: "b",
    });
  });

  it("이미 기록(alreadyRecorded)했으면 null — 같은 over를 또 받아도 재기록 안 함", () => {
    expect(battleshipMultiMatchRecord(status(true, "p1"), true)).toBeNull();
  });

  it("미종료면 null", () => {
    expect(battleshipMultiMatchRecord(status(false, null), false)).toBeNull();
  });

  it("playerA는 싱글과 동일 유저(SELF_PLAYER)이고 playerB는 별개 라벨이다", () => {
    expect(MULTI_PLAYER_A).toBe(SELF_PLAYER);
    expect(MULTI_PLAYER_B).not.toBe(MULTI_PLAYER_A);
  });
});

// ── 실제 인메모리 허브로 두 좌석이 같은 over를 구독해도 1회만 기록되는지(+ 재대국) 검증 ──

// battleshipRoomClient.test.ts와 동일한 유효 함대/칸 좌표를 재사용한다.
function validFleet(prefix: string): Ship[] {
  return [
    { id: `${prefix}-0`, row: 0, col: 0, size: 5, orientation: "h" },
    { id: `${prefix}-1`, row: 1, col: 0, size: 4, orientation: "h" },
    { id: `${prefix}-2`, row: 2, col: 0, size: 3, orientation: "h" },
    { id: `${prefix}-3`, row: 3, col: 0, size: 3, orientation: "h" },
    { id: `${prefix}-4`, row: 4, col: 0, size: 2, orientation: "h" },
  ];
}

/** 함선이 점유한 칸(전부 사격하면 전 함대 격침). */
const FLEET_CELLS: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 0], [1, 1], [1, 2], [1, 3],
  [2, 0], [2, 1], [2, 2],
  [3, 0], [3, 1], [3, 2],
  [4, 0], [4, 1],
];

/** 함선이 없는 물 칸(아래 두 행 — 빗나감만 난다). */
const WATER_CELLS: Array<[number, number]> = Array.from({ length: 20 }, (_, i) => [
  9 - Math.floor(i / 10),
  i % 10,
]);

/**
 * 컴포넌트 applyMessage의 기록 경로를 그대로 재현하는 세션:
 * - 두 좌석 모두 같은 메시지를 구독한다(같은 over를 둘 다 받음).
 * - setupState 수신 시 가드 리셋(새 매치), gameState 수신 시 battleshipMultiMatchRecord로 1회만 기록.
 */
function recordingSession() {
  const recorder: MatchRecordEntry[] = [];
  const guard = { recorded: false };
  const hub = createInMemoryRoomHub("ROOM-REC");
  const p1 = hub.connect("c1");
  const p2 = hub.connect("c2");
  let lastGame: Extract<ServerMessage, { type: "gameState" }> | null = null;

  const onMessage = (m: ServerMessage) => {
    if (m.type === "setupState") {
      guard.recorded = false;
      return;
    }
    if (m.type === "gameState") {
      lastGame = m;
      const entry = battleshipMultiMatchRecord(m.status, guard.recorded);
      if (entry !== null) {
        guard.recorded = true;
        recorder.push(entry);
      }
    }
  };
  // 두 좌석 모두 구독 — 인메모리 허브는 두 connId에 같은 gameState(over)를 전달한다.
  p1.subscribe(onMessage);
  p2.subscribe(onMessage);

  return {
    recorder,
    clientOf: (side: Side): RoomClient => (side === "p1" ? p1 : p2),
    join() {
      p1.send({ type: "joinRoom", roomCode: "ROOM-REC" });
      p2.send({ type: "joinRoom", roomCode: "ROOM-REC" });
    },
    submitBoth() {
      p1.send({ type: "submitSetup", gameType: "battleship", payload: { ships: validFleet("p1") } });
      p2.send({ type: "submitSetup", gameType: "battleship", payload: { ships: validFleet("p2") } });
    },
    rematch() {
      p1.send({ type: "requestRematch" });
    },
    lastGame: () => lastGame,
  };
}

/** 지정한 승자가 이기도록 매치를 끝까지 진행한다(승자는 함선 칸, 패자는 물 칸을 쏜다). p1이 선. */
function driveToWin(
  session: ReturnType<typeof recordingSession>,
  winner: Side,
): void {
  let shipIdx = 0;
  let waterIdx = 0;
  // 안전 상한(무한 루프 방지) — 총 칸 수보다 넉넉히.
  for (let step = 0; step < 100; step++) {
    const game = session.lastGame();
    if (game === null || game.status.over) {
      return;
    }
    const turn = game.turn;
    const client = session.clientOf(turn);
    if (turn === winner) {
      const [r, c] = FLEET_CELLS[shipIdx++]!;
      client.send({ type: "makeMove", gameType: "battleship", move: { row: r, col: c } });
    } else {
      const [wr, wc] = WATER_CELLS[waterIdx++]!;
      client.send({ type: "makeMove", gameType: "battleship", move: { row: wr, col: wc } });
    }
  }
}

describe("멀티 매치 종료 → recordGame 1회(두 좌석 구독)·재대국", () => {
  it("p1 승 매치는 정확히 1회, win=\"a\"로 기록된다(두 좌석이 같은 over 구독)", () => {
    const s = recordingSession();
    s.join();
    s.submitBoth();
    driveToWin(s, "p1");

    expect(s.lastGame()?.status.over).toBe(true);
    expect(s.lastGame()?.status.winner).toBe("p1");
    expect(s.recorder).toHaveLength(1);
    expect(s.recorder[0]).toEqual({
      playerA: MULTI_PLAYER_A,
      playerB: MULTI_PLAYER_B,
      win: "a",
    });
  });

  it("재대국 후 다음 매치(p2 승)도 정확히 1회, win=\"b\"로 기록된다", () => {
    const s = recordingSession();
    s.join();
    s.submitBoth();
    driveToWin(s, "p1");
    expect(s.recorder).toHaveLength(1);

    // 재대국 → 배치 단계로 복귀(가드 리셋) → 다시 제출 → 이번엔 p2가 이긴다.
    s.rematch();
    s.submitBoth();
    driveToWin(s, "p2");

    expect(s.lastGame()?.status.winner).toBe("p2");
    expect(s.recorder).toHaveLength(2);
    expect(s.recorder[1]).toEqual({
      playerA: MULTI_PLAYER_A,
      playerB: MULTI_PLAYER_B,
      win: "b",
    });
  });
});

describe("멀티 결과가 싱글과 동일 유저(나)로 전적에 노출", () => {
  it("recordGame으로 저장한 멀티 결과가 getStandings의 SELF_PLAYER 전적에 반영된다", () => {
    const before = getStandings().find((p) => p.player === SELF_PLAYER)?.wins ?? 0;
    recordGame("battleship", MULTI_PLAYER_A, MULTI_PLAYER_B, "a");
    const self = getStandings().find((p) => p.player === SELF_PLAYER);
    expect(self).toBeDefined();
    expect(self!.wins).toBe(before + 1);
  });
});
