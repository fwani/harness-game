// Application layer: game record storage port + thin aggregation service.
// Depends on domain only. 구현(인메모리/파일 등)은 infrastructure 레이어에 둔다.
import type { GameRecord, PlayerStats } from "../domain/gameRecord";
import { summarize } from "../domain/gameRecord";

/** Port: 게임 기록 저장소. 구현(인메모리/파일 등)은 infrastructure 레이어에 둔다. */
export interface GameRecordRepository {
  /** 한 판 기록을 추가한다(추가 전용, 삭제·갱신 없음). */
  save(record: GameRecord): void;
  /** 저장된 모든 기록을 저장 순서대로 반환한다. */
  list(): GameRecord[];
}

/**
 * 저장소의 모든 기록을 플레이어별 전적으로 집계한다.
 * 도메인 summarize에 위임한다(도메인 로직을 재구현하지 않는다).
 */
export function standings(repo: GameRecordRepository): PlayerStats[] {
  return summarize(repo.list());
}
