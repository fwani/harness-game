import { describe, it, expect } from "vitest";
import { createIdentityController } from "./identity";
import type { PlayerIdentityStore } from "../application/ensurePlayerIdentity";
import type { IdSource, PlayerIdentity } from "../application/playerIdentity";
import type { RandomSource } from "../application/dealCards";

const zeroRng: RandomSource = { nextInt: () => 0 };
const fakeIds: IdSource = { newId: () => "dummy-id" };

/** 인메모리 정체성 저장소. */
function memoryStore(initial: PlayerIdentity | null = null): PlayerIdentityStore {
  let saved = initial;
  return {
    load: () => saved,
    save: (identity) => {
      saved = identity;
    },
  };
}

describe("createIdentityController", () => {
  it("부팅 시 정체성을 보장한다(없으면 생성: id는 IdSource, 이름은 rng)", () => {
    const controller = createIdentityController(memoryStore(), zeroRng, fakeIds);
    const identity = controller.getIdentity();

    expect(identity.id).toBe("dummy-id");
    expect(identity.displayName.length).toBeGreaterThan(0);
  });

  it("이미 저장된 정체성이 있으면 그것을 로드한다", () => {
    const existing: PlayerIdentity = { id: "dummy-x", displayName: "여우 1" };
    const controller = createIdentityController(
      memoryStore(existing),
      zeroRng,
      fakeIds,
    );

    expect(controller.getIdentity()).toEqual(existing);
  });

  it("유효한 이름으로 변경하면 ok + 표시 이름이 바뀐다(id 유지)", () => {
    const controller = createIdentityController(memoryStore(), zeroRng, fakeIds);
    const before = controller.getIdentity();

    const result = controller.renameGuest("  새 이름  ");

    expect(result).toEqual({ ok: true });
    expect(controller.getIdentity().displayName).toBe("새 이름"); // 트림됨
    expect(controller.getIdentity().id).toBe(before.id); // 식별자는 유지
  });

  it("변경한 이름이 저장소에 영속된다", () => {
    const store = memoryStore();
    const controller = createIdentityController(store, zeroRng, fakeIds);

    controller.renameGuest("끈질긴 두더지 9");

    expect(store.load()?.displayName).toBe("끈질긴 두더지 9");
  });

  it("빈/공백 이름은 ok=false와 한국어 사유를 돌려주고 정체성을 바꾸지 않는다", () => {
    const controller = createIdentityController(memoryStore(), zeroRng, fakeIds);
    const before = controller.getIdentity();

    const empty = controller.renameGuest("");
    const blank = controller.renameGuest("   ");

    expect(empty.ok).toBe(false);
    expect(blank.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.reason.length).toBeGreaterThan(0);
    }
    expect(controller.getIdentity()).toEqual(before);
  });

  it("이름 변경 시 구독자에게 알린다", () => {
    const controller = createIdentityController(memoryStore(), zeroRng, fakeIds);
    let notified = 0;
    const unsubscribe = controller.subscribe(() => {
      notified += 1;
    });

    controller.renameGuest("기운찬 펭귄 2");
    expect(notified).toBe(1);

    unsubscribe();
    controller.renameGuest("다정한 토끼 4");
    expect(notified).toBe(1); // 해제 후엔 알리지 않는다
  });
});
