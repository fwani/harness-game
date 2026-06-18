import { describe, it, expect } from "vitest";
import {
  ensurePlayerIdentity,
  type PlayerIdentityStore,
} from "./ensurePlayerIdentity";
import type { IdSource, PlayerIdentity } from "./playerIdentity";
import type { RandomSource } from "./dealCards";

/** 항상 0을 돌려주는 결정적 rng(표시 이름 생성 경로용 더미). */
const zeroRng: RandomSource = { nextInt: () => 0 };

/** 더미 식별자를 발급하는 가짜 IdSource. */
function fakeIds(value: string): IdSource {
  return { newId: () => value };
}

/** 호출을 기록하는 인메모리 저장소. */
function recordingStore(initial: PlayerIdentity | null = null) {
  let saved = initial;
  const saves: PlayerIdentity[] = [];
  const store: PlayerIdentityStore = {
    load: () => saved,
    save: (identity) => {
      saved = identity;
      saves.push(identity);
    },
  };
  return { store, saves, current: () => saved };
}

describe("ensurePlayerIdentity", () => {
  it("저장된 정체성이 없으면 새로 만들어 저장 후 반환한다", () => {
    const { store, saves } = recordingStore(null);

    const identity = ensurePlayerIdentity(store, zeroRng, fakeIds("dummy-id"));

    expect(identity.id).toBe("dummy-id");
    expect(identity.displayName.length).toBeGreaterThan(0);
    // 새로 만든 정체성을 1회 저장했다.
    expect(saves).toEqual([identity]);
  });

  it("저장된 정체성이 있으면 그대로 로드하고 저장하지 않는다", () => {
    const existing: PlayerIdentity = {
      id: "dummy-existing",
      displayName: "조용한 수달 3",
    };
    const { store, saves } = recordingStore(existing);

    const identity = ensurePlayerIdentity(
      store,
      zeroRng,
      fakeIds("should-not-be-used"),
    );

    expect(identity).toEqual(existing);
    expect(saves).toEqual([]);
  });
});
