// Application layer: 부팅 시 게스트 정체성 1회 보장(로드 또는 생성·저장) 얇은 조립.
// domain/포트에만 의존한다 — 실제 영속화(localStorage 등)는 주입된 store가 담당한다.
import {
  createAnonymousIdentity,
  type IdSource,
  type PlayerIdentity,
} from "./playerIdentity";
import type { RandomSource } from "./dealCards";

/**
 * 정체성 영속화 포트.
 * infrastructure 어댑터(LocalStoragePlayerIdentityStore 등)가 구현하고,
 * application은 이 인터페이스에만 의존한다(레이어 경계 준수).
 */
export interface PlayerIdentityStore {
  /** 저장된 정체성을 읽는다(없으면 null). */
  load(): PlayerIdentity | null;
  /** 정체성을 저장(덮어쓰기)한다. */
  save(identity: PlayerIdentity): void;
}

/**
 * 부팅 시 게스트 정체성을 1개 보장한다.
 * - 저장된 정체성이 있으면 그대로 로드해 반환.
 * - 없으면 createAnonymousIdentity(rng, ids)로 새로 만들어 저장 후 반환.
 */
export function ensurePlayerIdentity(
  store: PlayerIdentityStore,
  rng: RandomSource,
  ids: IdSource,
): PlayerIdentity {
  const existing = store.load();
  if (existing) {
    return existing;
  }
  const identity = createAnonymousIdentity(rng, ids);
  store.save(identity);
  return identity;
}
