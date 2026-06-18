import { describe, it, expect } from "vitest";
import {
  LocalStoragePlayerIdentityStore,
  DEFAULT_IDENTITY_KEY,
} from "./localStoragePlayerIdentityStore";
import type { PlayerIdentity } from "../application/playerIdentity";

/** 테스트용 인메모리 Storage 구현(주입). */
class FakeStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/** 모든 접근이 throw하는 차단 Storage(비공개 모드 등 시뮬레이션). */
const blockedStorage: Storage = {
  length: 0,
  clear() {},
  getItem() {
    throw new Error("blocked");
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {
    throw new Error("blocked");
  },
};

// 식별자는 민감정보 — 테스트엔 주입된 더미 값만 쓴다.
const identity: PlayerIdentity = { id: "dummy-id", displayName: "용감한 너구리 7" };

describe("LocalStoragePlayerIdentityStore", () => {
  it("저장된 게 없으면 load는 null", () => {
    const store = new LocalStoragePlayerIdentityStore(new FakeStorage());
    expect(store.load()).toBeNull();
  });

  it("save 후 load가 같은 정체성을 복원한다(왕복)", () => {
    const storage = new FakeStorage();
    const store = new LocalStoragePlayerIdentityStore(storage);
    store.save(identity);
    expect(store.load()).toEqual(identity);
  });

  it("새 인스턴스로 재생성해도 저장된 정체성을 복원한다(영속화)", () => {
    const storage = new FakeStorage();
    new LocalStoragePlayerIdentityStore(storage).save(identity);

    const reopened = new LocalStoragePlayerIdentityStore(storage);
    expect(reopened.load()).toEqual(identity);
  });

  it("기본 키(DEFAULT_IDENTITY_KEY)에 직렬화해 저장한다", () => {
    const storage = new FakeStorage();
    new LocalStoragePlayerIdentityStore(storage).save(identity);

    const raw = storage.getItem(DEFAULT_IDENTITY_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(identity);
  });

  it("주입한 키를 사용한다", () => {
    const storage = new FakeStorage();
    new LocalStoragePlayerIdentityStore(storage, "custom:identity").save(
      identity,
    );

    expect(storage.getItem("custom:identity")).not.toBeNull();
    expect(storage.getItem(DEFAULT_IDENTITY_KEY)).toBeNull();
  });

  it("손상된 JSON은 null로 복구한다(크래시 금지)", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_IDENTITY_KEY, "{not valid json");

    expect(new LocalStoragePlayerIdentityStore(storage).load()).toBeNull();
  });

  it("형식이 맞지 않는 값은 null로 복구한다", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_IDENTITY_KEY, JSON.stringify({ id: 123 }));

    expect(new LocalStoragePlayerIdentityStore(storage).load()).toBeNull();
  });

  it("빈 id/displayName은 유효하지 않은 것으로 본다", () => {
    const storage = new FakeStorage();
    storage.setItem(
      DEFAULT_IDENTITY_KEY,
      JSON.stringify({ id: "", displayName: "" }),
    );

    expect(new LocalStoragePlayerIdentityStore(storage).load()).toBeNull();
  });

  it("스토리지 접근이 throw해도 load는 크래시하지 않고 null", () => {
    const store = new LocalStoragePlayerIdentityStore(blockedStorage);
    expect(() => store.load()).not.toThrow();
    expect(store.load()).toBeNull();
  });

  it("스토리지 저장이 throw해도 save는 크래시하지 않는다", () => {
    const store = new LocalStoragePlayerIdentityStore(blockedStorage);
    expect(() => store.save(identity)).not.toThrow();
  });
});
