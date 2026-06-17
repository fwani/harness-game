// UI-level wiring for game records: a shared in-memory repository + subscription.
// UI는 application 포트(gameRecordStore)와 infrastructure 어댑터를 함께 사용해도 된다
// (UX_GUIDELINES "적용 범위" 참고). 도메인 createGameRecord/summarize는 재구현하지 않는다.
import type { GameId, GameRecord, PlayerStats } from "../domain/gameRecord";
import { standings as computeStandings, type GameRecordRepository } from "../application/gameRecordStore";
import { recordRound, type RoundWinner } from "../application/recordRound";
import { InMemoryGameRecordRepository } from "../infrastructure/inMemoryGameRecordRepository";
import {
  LocalStorageGameRecordRepository,
  isLocalStorageAvailable,
} from "../infrastructure/localStorageGameRecordRepository";

// 세션 간 공유되는 단일 저장소.
// localStorage 사용이 가능하면 영속 저장소를 쓰고(새로고침/재방문 후에도 전적 유지),
// SSR/비공개 모드 등 미가용 환경에서는 인메모리로 안전하게 폴백한다.
function createRepository(): GameRecordRepository {
  if (isLocalStorageAvailable()) {
    try {
      return new LocalStorageGameRecordRepository();
    } catch {
      // 탐지 후 생성 단계에서 실패해도 앱이 죽지 않도록 폴백.
      return new InMemoryGameRecordRepository();
    }
  }
  return new InMemoryGameRecordRepository();
}

const repo: GameRecordRepository = createRepository();

/**
 * 전적이 실제로 영속 저장되는지 여부.
 * localStorage 어댑터를 쓰면 true(새로고침·재방문 후에도 유지),
 * SSR/비공개 모드 등 인메모리 폴백이면 false(세션 한정).
 * 안내 문구를 실제 동작에 맞게 표시하기 위해 노출한다.
 */
export const recordsPersisted: boolean =
  repo instanceof LocalStorageGameRecordRepository;

const listeners = new Set<() => void>();

// useSyncExternalStore는 스냅샷 게터의 반환값을 Object.is로 비교하므로,
// 저장소가 바뀌지 않았다면 반드시 "동일 참조"를 돌려줘야 무한 렌더 루프가 안 난다.
// 저장(recordGame) 시에만 캐시를 무효화하고, 그 사이에는 메모이즈된 스냅샷을 재사용한다.
let standingsCache: PlayerStats[] | null = null;
let recordsCache: GameRecord[] | null = null;

/** 한 판 결과: "a"=playerA 승, "b"=playerB 승, "draw"=무승부. */
export type WinSide = RoundWinner;

/**
 * 한 판 결과를 공통 저장소에 기록하고 구독자에게 알린다.
 * 저장·검증은 애플리케이션 헬퍼 recordRound에 위임한다(중복 구현 금지).
 */
export function recordGame(
  game: GameId,
  playerA: string,
  playerB: string,
  win: WinSide,
): void {
  recordRound(repo, game, { a: playerA, b: playerB }, win);
  // 저장소가 바뀌었으니 다음 스냅샷 요청 때 새로 계산하도록 캐시를 비운다.
  standingsCache = null;
  recordsCache = null;
  listeners.forEach((fn) => fn());
}

/**
 * 플레이어별 누적 전적(승/패/무).
 * 저장소 변경 전까지 동일 참조를 반환한다(useSyncExternalStore 안정성).
 */
export function getStandings(): PlayerStats[] {
  if (standingsCache === null) {
    standingsCache = computeStandings(repo);
  }
  return standingsCache;
}

/**
 * 저장된 모든 기록(저장 순).
 * 저장소 변경 전까지 동일 참조를 반환한다(useSyncExternalStore 안정성).
 */
export function listRecords(): GameRecord[] {
  if (recordsCache === null) {
    recordsCache = repo.list();
  }
  return recordsCache;
}

/** 기록 변경 구독. 해제 함수를 반환한다. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
