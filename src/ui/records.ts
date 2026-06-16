// UI-level wiring for game records: a shared in-memory repository + subscription.
// UI는 application 포트(gameRecordStore)와 infrastructure 어댑터를 함께 사용해도 된다
// (UX_GUIDELINES "적용 범위" 참고). 도메인 createGameRecord/summarize는 재구현하지 않는다.
import {
  createGameRecord,
  type GameId,
  type GameRecord,
  type PlayerOutcome,
  type PlayerStats,
} from "../domain/gameRecord";
import { standings as computeStandings } from "../application/gameRecordStore";
import { InMemoryGameRecordRepository } from "../infrastructure/inMemoryGameRecordRepository";

// 세션 동안 공유되는 단일 저장소(인메모리 — 새로고침 시 초기화).
const repo = new InMemoryGameRecordRepository();
const listeners = new Set<() => void>();

/** 한 판 결과: "a"=playerA 승, "b"=playerB 승, "draw"=무승부. */
export type WinSide = "a" | "b" | "draw";

function outcomesFor(a: string, b: string, win: WinSide): PlayerOutcome[] {
  if (win === "draw") {
    return [
      { player: a, result: "draw" },
      { player: b, result: "draw" },
    ];
  }
  return win === "a"
    ? [
        { player: a, result: "win" },
        { player: b, result: "loss" },
      ]
    : [
        { player: a, result: "loss" },
        { player: b, result: "win" },
      ];
}

/** 한 판 결과를 기록하고 구독자에게 알린다. */
export function recordGame(
  game: GameId,
  playerA: string,
  playerB: string,
  win: WinSide,
): void {
  repo.save(createGameRecord(game, outcomesFor(playerA, playerB, win)));
  listeners.forEach((fn) => fn());
}

/** 플레이어별 누적 전적(승/패/무). */
export function getStandings(): PlayerStats[] {
  return computeStandings(repo);
}

/** 저장된 모든 기록(저장 순). */
export function listRecords(): GameRecord[] {
  return repo.list();
}

/** 기록 변경 구독. 해제 함수를 반환한다. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
