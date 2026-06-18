// UI-level wiring for the anonymous guest identity.
// UI는 application 포트와 infrastructure 어댑터를 함께 조립할 수 있다(records.ts와 동일 관례).
// 정체성 1개를 부팅 시 보장하고, 표시 이름 변경을 검증·영속화한다.
// 식별자 값은 민감정보 — 로그/노출하지 않고 화면엔 표시 이름만 쓴다.
import {
  renameIdentity,
  type PlayerIdentity,
} from "../application/playerIdentity";
import {
  ensurePlayerIdentity,
  type PlayerIdentityStore,
} from "../application/ensurePlayerIdentity";
import type { RandomSource } from "../application/dealCards";
import type { IdSource } from "../application/playerIdentity";
import { MathRandomSource } from "../infrastructure/mathRandomSource";
import { CryptoIdSource } from "../infrastructure/cryptoIdSource";
import { LocalStoragePlayerIdentityStore } from "../infrastructure/localStoragePlayerIdentityStore";
import { isLocalStorageAvailable } from "../infrastructure/localStorageGameRecordRepository";

/** 표시 이름 변경 결과. 실패 시 한국어 사유를 함께 돌려준다(ui에서 노출). */
export type RenameResult = { ok: true } | { ok: false; reason: string };

/** 정체성 상태를 보유·구독·변경하는 컨트롤러(테스트를 위해 의존성 주입 가능). */
export interface IdentityController {
  getIdentity(): PlayerIdentity;
  renameGuest(name: string): RenameResult;
  subscribe(fn: () => void): () => void;
}

/**
 * 정체성 컨트롤러를 만든다.
 * 부팅 시 store에서 로드하거나 새로 만들어 보장하고,
 * 이름 변경은 application의 renameIdentity로 검증·교체 후 store에 저장한다.
 */
export function createIdentityController(
  store: PlayerIdentityStore,
  rng: RandomSource,
  ids: IdSource,
): IdentityController {
  // 부팅 시 1회 보장. useSyncExternalStore 안정성을 위해 변경 시에만 참조를 바꾼다.
  let current: PlayerIdentity = ensurePlayerIdentity(store, rng, ids);
  const listeners = new Set<() => void>();

  function notify(): void {
    listeners.forEach((fn) => fn());
  }

  return {
    getIdentity: () => current,
    renameGuest(name: string): RenameResult {
      try {
        const next = renameIdentity(current, name);
        current = next;
        store.save(next);
        notify();
        return { ok: true };
      } catch (e) {
        // 검증 실패(또는 저장 외 예외)는 throw로 앱을 죽이지 않고 사유로 돌려준다.
        return {
          ok: false,
          reason:
            e instanceof Error ? e.message : "표시 이름을 변경할 수 없습니다.",
        };
      }
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/**
 * 정체성 저장소를 만든다.
 * localStorage 사용이 가능하면 영속 저장소를(새로고침/재방문 후에도 유지),
 * SSR/비공개 모드 등 미가용 환경에서는 인메모리로 안전하게 폴백한다(크래시 금지).
 */
function createStore(): PlayerIdentityStore {
  if (isLocalStorageAvailable()) {
    try {
      return new LocalStoragePlayerIdentityStore();
    } catch {
      // 탐지 후 생성 단계에서 실패해도 앱이 죽지 않도록 폴백.
      return createInMemoryStore();
    }
  }
  return createInMemoryStore();
}

/** 세션 한정 인메모리 저장소(SSR/비공개 모드 폴백). */
function createInMemoryStore(): PlayerIdentityStore {
  let saved: PlayerIdentity | null = null;
  return {
    load: () => saved,
    save: (identity) => {
      saved = identity;
    },
  };
}

// 세션 간 공유되는 단일 컨트롤러. 표시 이름은 rng로, 식별자는 crypto(없으면 rng 폴백)로 발급한다.
const sharedRng = new MathRandomSource();
const controller: IdentityController = createIdentityController(
  createStore(),
  sharedRng,
  new CryptoIdSource({ fallbackRng: sharedRng }),
);

/** 현재 게스트 정체성. 변경 전까지 동일 참조를 반환한다(useSyncExternalStore 안정성). */
export const getIdentity = (): PlayerIdentity => controller.getIdentity();

/** 표시 이름 변경(검증·영속화). 실패 시 사유를 돌려준다. */
export const renameGuest = (name: string): RenameResult =>
  controller.renameGuest(name);

/** 정체성 변경 구독. 해제 함수를 반환한다. */
export const subscribeIdentity = (fn: () => void): (() => void) =>
  controller.subscribe(fn);
