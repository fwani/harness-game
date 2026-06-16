// Infrastructure layer: in-memory adapter implementing the application port.
// 추가 전용(append-only) — 삭제/초기화 메서드는 두지 않는다(비파괴).
import type { GameRecordRepository } from "../application/gameRecordStore";
import type { GameRecord } from "../domain/gameRecord";

export class InMemoryGameRecordRepository implements GameRecordRepository {
  private readonly records: GameRecord[] = [];

  save(record: GameRecord): void {
    this.records.push(record);
  }

  /** 저장 순서대로 반환한다. 내부 배열의 복제본을 돌려줘 외부 변경이 내부 상태에 영향을 주지 않는다. */
  list(): GameRecord[] {
    return [...this.records];
  }
}
