// Infrastructure layer: localStorage adapter implementing the application port.
// 추가 전용(append-only) — 삭제/초기화 메서드는 두지 않는다(비파괴).
// 브라우저 새로고침/재방문 후에도 전적이 유지되도록 JSON으로 영속화한다.
import type { GameRecordRepository } from "../application/gameRecordStore";
import type { GameRecord } from "../domain/gameRecord";

/** 기본 저장 키. */
export const DEFAULT_RECORDS_KEY = "harness-game:records";

/**
 * Web Storage(localStorage) 기반 전적 저장소.
 * - 주입 가능한 `Storage`로 SSR/테스트 환경에서도 안전하게 동작한다.
 * - 손상된 JSON/형식 불일치는 빈 기록으로 복구한다(앱 크래시 금지, 비파괴 — 덮어쓰지 않음).
 */
export class LocalStorageGameRecordRepository implements GameRecordRepository {
  private readonly storage: Storage;
  private readonly key: string;

  constructor(storage?: Storage, key: string = DEFAULT_RECORDS_KEY) {
    this.storage = storage ?? resolveDefaultStorage();
    this.key = key;
  }

  save(record: GameRecord): void {
    const records = this.read();
    records.push(record);
    this.storage.setItem(this.key, JSON.stringify(records));
  }

  /** 저장 순서대로 반환한다. 저장소에서 새로 파싱하므로 항상 외부와 분리된 배열이다. */
  list(): GameRecord[] {
    return this.read();
  }

  /** 저장된 값을 읽어 유효한 기록 배열로 복원한다. 파싱/형식 오류는 빈 배열로 복구한다. */
  private read(): GameRecord[] {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      // 저장소 접근 자체가 실패(예: 비공개 모드)해도 크래시하지 않는다.
      return [];
    }
    if (raw === null) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isGameRecord);
    } catch {
      return [];
    }
  }
}

/** 저장된 임의 값이 GameRecord 형태인지 최소 검증한다(손상 데이터 방어). */
function isGameRecord(value: unknown): value is GameRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.game !== "string") {
    return false;
  }
  if (!Array.isArray(record.outcomes)) {
    return false;
  }
  return record.outcomes.every((o) => {
    if (typeof o !== "object" || o === null) {
      return false;
    }
    const outcome = o as Record<string, unknown>;
    return (
      typeof outcome.player === "string" &&
      (outcome.result === "win" || outcome.result === "loss" || outcome.result === "draw")
    );
  });
}

/** 주입이 없을 때 기본 저장소(window.localStorage)를 해석한다. 미가용이면 throw. */
function resolveDefaultStorage(): Storage {
  const candidate =
    typeof globalThis !== "undefined"
      ? (globalThis as { localStorage?: Storage }).localStorage
      : undefined;
  if (!candidate) {
    throw new Error("localStorage is not available in this environment");
  }
  return candidate;
}

/**
 * localStorage 사용 가능 여부를 안전하게 탐지한다(비공개 모드/SSR 대비).
 * 실제 set/remove까지 시도해 차단 환경을 걸러낸다.
 */
export function isLocalStorageAvailable(storage?: Storage): boolean {
  try {
    const target =
      storage ??
      (typeof globalThis !== "undefined"
        ? (globalThis as { localStorage?: Storage }).localStorage
        : undefined);
    if (!target) {
      return false;
    }
    const probe = "__harness-game_probe__";
    target.setItem(probe, "1");
    target.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
