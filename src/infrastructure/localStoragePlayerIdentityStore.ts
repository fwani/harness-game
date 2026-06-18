// Infrastructure layer: 익명 게스트 정체성 1개를 localStorage에 영속화하는 어댑터.
// LocalStorageGameRecordRepository 패턴을 따른다:
// - 주입 가능한 Storage로 SSR/테스트 환경에서도 안전.
// - 손상 JSON/형식 불일치는 null로 복구(앱 크래시 금지, 비파괴).
// - 비공개 모드 등 스토리지 접근 실패에도 크래시하지 않는다.
// 정체성 1개만 다루므로 append가 아니라 단일 키 덮어쓰기다(삭제/초기화 메서드 없음).
import type { PlayerIdentity } from "../application/playerIdentity";

/** 기본 저장 키. */
export const DEFAULT_IDENTITY_KEY = "harness-game:identity";

/**
 * Web Storage(localStorage) 기반 게스트 정체성 저장소.
 * 식별자 값은 민감정보로 취급한다 — 로그/리터럴로 노출하지 않는다.
 */
export class LocalStoragePlayerIdentityStore {
  private readonly storage: Storage;
  private readonly key: string;

  constructor(storage?: Storage, key: string = DEFAULT_IDENTITY_KEY) {
    this.storage = storage ?? resolveDefaultStorage();
    this.key = key;
  }

  /** 저장된 정체성을 읽는다. 없음/손상/접근 실패 시 null(크래시 금지). */
  load(): PlayerIdentity | null {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      // 저장소 접근 자체가 실패(예: 비공개 모드)해도 크래시하지 않는다.
      return null;
    }
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isPlayerIdentity(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** 정체성 1개를 JSON으로 덮어쓴다. 저장 실패(비공개 모드 등)에도 크래시하지 않는다. */
  save(identity: PlayerIdentity): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(identity));
    } catch {
      // 저장 실패해도 앱이 죽지 않게 무시한다(인메모리 상태로 계속 동작).
    }
  }
}

/** 저장된 임의 값이 PlayerIdentity 형태인지 최소 검증한다(손상 데이터 방어). */
function isPlayerIdentity(value: unknown): value is PlayerIdentity {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const identity = value as Record<string, unknown>;
  return (
    typeof identity.id === "string" &&
    identity.id.length > 0 &&
    typeof identity.displayName === "string" &&
    identity.displayName.length > 0
  );
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
