import { describe, it, expect } from "vitest";
import {
  LocalStorageGameRecordRepository,
  DEFAULT_RECORDS_KEY,
  isLocalStorageAvailable,
} from "./localStorageGameRecordRepository";
import { standings } from "../application/gameRecordStore";
import { createGameRecord } from "../domain/gameRecord";

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

const win = (game: Parameters<typeof createGameRecord>[0]) =>
  createGameRecord(game, [
    { player: "a", result: "win" },
    { player: "b", result: "loss" },
  ]);

const tie = (game: Parameters<typeof createGameRecord>[0]) =>
  createGameRecord(game, [
    { player: "a", result: "draw" },
    { player: "b", result: "draw" },
  ]);

describe("LocalStorageGameRecordRepository", () => {
  it("빈 저장소의 list는 빈 배열", () => {
    const repo = new LocalStorageGameRecordRepository(new FakeStorage());
    expect(repo.list()).toEqual([]);
  });

  it("save 후 list가 저장 순서대로 반환한다", () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageGameRecordRepository(storage);
    const r1 = win("rps");
    const r2 = tie("oddEven");

    repo.save(r1);
    repo.save(r2);

    expect(repo.list()).toEqual([r1, r2]);
  });

  it("새 인스턴스로 재생성해도 저장된 기록을 복원한다(영속화)", () => {
    const storage = new FakeStorage();
    const r1 = win("rps");
    const r2 = win("gomoku");

    const first = new LocalStorageGameRecordRepository(storage);
    first.save(r1);
    first.save(r2);

    // 같은 storage를 공유하는 새 인스턴스(=새로고침/재방문 시뮬레이션).
    const second = new LocalStorageGameRecordRepository(storage);
    expect(second.list()).toEqual([r1, r2]);
  });

  it("기본 키(DEFAULT_RECORDS_KEY)에 직렬화해 저장한다", () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageGameRecordRepository(storage);
    repo.save(win("rps"));

    const raw = storage.getItem(DEFAULT_RECORDS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual([win("rps")]);
  });

  it("주입한 키를 사용한다", () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageGameRecordRepository(storage, "custom:key");
    repo.save(win("rps"));

    expect(storage.getItem("custom:key")).not.toBeNull();
    expect(storage.getItem(DEFAULT_RECORDS_KEY)).toBeNull();
  });

  it("손상된 JSON은 빈 기록으로 복구한다(크래시 금지)", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_RECORDS_KEY, "{not valid json");

    const repo = new LocalStorageGameRecordRepository(storage);
    expect(repo.list()).toEqual([]);
  });

  it("배열이 아닌 JSON은 빈 기록으로 복구한다", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_RECORDS_KEY, JSON.stringify({ foo: "bar" }));

    const repo = new LocalStorageGameRecordRepository(storage);
    expect(repo.list()).toEqual([]);
  });

  it("형식이 맞지 않는 항목은 걸러낸다", () => {
    const storage = new FakeStorage();
    const valid = win("rps");
    storage.setItem(
      DEFAULT_RECORDS_KEY,
      JSON.stringify([valid, { game: 123 }, null, { game: "rps" }]),
    );

    const repo = new LocalStorageGameRecordRepository(storage);
    expect(repo.list()).toEqual([valid]);
  });

  it("standings와 연동해 영속된 기록을 집계한다", () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageGameRecordRepository(storage);
    repo.save(win("rps"));
    repo.save(tie("oddEven"));

    expect(standings(repo)).toEqual([
      { player: "a", wins: 1, losses: 0, draws: 1 },
      { player: "b", wins: 0, losses: 1, draws: 1 },
    ]);
  });

  it("list() 반환값을 변경해도 저장소 상태에 영향이 없다(불변성)", () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageGameRecordRepository(storage);
    repo.save(win("rps"));

    const first = repo.list();
    first.push(tie("card"));
    first.length = 0;

    expect(repo.list()).toEqual([win("rps")]);
  });
});

describe("isLocalStorageAvailable", () => {
  it("정상 Storage면 true", () => {
    expect(isLocalStorageAvailable(new FakeStorage())).toBe(true);
  });

  it("setItem이 throw하면 false(비공개 모드 등)", () => {
    const blocked: Storage = {
      length: 0,
      clear() {},
      getItem() {
        return null;
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {
        throw new Error("blocked");
      },
    };
    expect(isLocalStorageAvailable(blocked)).toBe(false);
  });
});
