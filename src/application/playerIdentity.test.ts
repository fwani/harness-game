import { describe, expect, it } from "vitest";
import {
  randomDisplayName,
  createAnonymousIdentity,
  validateDisplayName,
  renameIdentity,
  type IdSource,
  type PlayerIdentity,
} from "./playerIdentity";
import type { RandomSource } from "./dealCards";

/** 미리 정한 nextInt 시퀀스를 순서대로 돌려주는 결정적 스텁. 시퀀스를 다 쓰면 throw. */
class SequenceRandom implements RandomSource {
  private i = 0;
  constructor(private readonly seq: readonly number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    if (this.i >= this.seq.length) {
      throw new Error("SequenceRandom: sequence exhausted");
    }
    return this.seq[this.i++]!;
  }
}

/** 미리 정한 id 목록을 순서대로 발급하는 결정적 스텁. */
class SequenceIds implements IdSource {
  private i = 0;
  constructor(private readonly ids: readonly string[]) {}
  newId(): string {
    if (this.i >= this.ids.length) {
      throw new Error("SequenceIds: ids exhausted");
    }
    return this.ids[this.i++]!;
  }
}

describe("randomDisplayName", () => {
  it("결정적: 같은 rng 시퀀스 → 같은 이름", () => {
    const a = randomDisplayName(new SequenceRandom([0, 0, 0]));
    const b = randomDisplayName(new SequenceRandom([0, 0, 0]));
    expect(a).toBe(b);
  });

  it("형용사 + 동물 + 숫자 형식, 숫자는 0..99 범위", () => {
    const name = randomDisplayName(new SequenceRandom([2, 3, 37]));
    const parts = name.split(" ");
    expect(parts).toHaveLength(3);
    const suffix = Number(parts[2]);
    expect(Number.isInteger(suffix)).toBe(true);
    expect(suffix).toBeGreaterThanOrEqual(0);
    expect(suffix).toBeLessThanOrEqual(99);
  });

  it("단어 뱅크 범위 내 출력: nextInt에 전달된 maxExclusive로 인덱스를 뽑는다", () => {
    // 형용사/동물 길이 각각의 maxExclusive 안에서만 인덱스를 뽑으므로
    // 인덱스 0(맨 앞 단어)은 항상 유효한 단어를 만든다.
    const name = randomDisplayName(new SequenceRandom([0, 0, 0]));
    const parts = name.split(" ");
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
    expect(parts[2]).toBe("0");
  });

  it("서로 다른 시퀀스 → 서로 다른 단어 선택 가능", () => {
    const first = randomDisplayName(new SequenceRandom([0, 0, 0]));
    const second = randomDisplayName(new SequenceRandom([1, 1, 1]));
    expect(first).not.toBe(second);
  });
});

describe("createAnonymousIdentity", () => {
  it("id는 주입된 IdSource.newId() 결과를 사용한다", () => {
    const identity = createAnonymousIdentity(
      new SequenceRandom([0, 0, 5]),
      new SequenceIds(["anon-123"]),
    );
    expect(identity.id).toBe("anon-123");
  });

  it("displayName은 randomDisplayName(rng)과 같다(결정적)", () => {
    const rngForName = new SequenceRandom([1, 2, 7]);
    const expectedName = randomDisplayName(rngForName);
    const identity = createAnonymousIdentity(
      new SequenceRandom([1, 2, 7]),
      new SequenceIds(["x"]),
    );
    expect(identity.displayName).toBe(expectedName);
  });
});

describe("validateDisplayName", () => {
  it("정상: 트림된 값을 통과로 반환", () => {
    const result = validateDisplayName("  꼬마 ");
    expect(result).toEqual({ ok: true, value: "꼬마" });
  });

  it("빈 문자열 거부", () => {
    const result = validateDisplayName("");
    expect(result.ok).toBe(false);
  });

  it("공백뿐인 문자열 거부", () => {
    const result = validateDisplayName("    ");
    expect(result.ok).toBe(false);
  });

  it("최대 길이(20자) 초과 거부", () => {
    const result = validateDisplayName("가".repeat(21));
    expect(result.ok).toBe(false);
  });

  it("최대 길이(20자) 경계는 통과", () => {
    const result = validateDisplayName("가".repeat(20));
    expect(result).toEqual({ ok: true, value: "가".repeat(20) });
  });
});

describe("renameIdentity", () => {
  const base: PlayerIdentity = { id: "id-1", displayName: "옛 이름" };

  it("검증 통과 시 displayName만 교체한 새 객체 반환", () => {
    const renamed = renameIdentity(base, "  새 이름 ");
    expect(renamed).toEqual({ id: "id-1", displayName: "새 이름" });
  });

  it("불변: 원본 identity는 변경되지 않는다", () => {
    renameIdentity(base, "다른 이름");
    expect(base.displayName).toBe("옛 이름");
    expect(renameIdentity(base, "또 다른 이름")).not.toBe(base);
  });

  it("검증 실패 시 사유 메시지로 throw", () => {
    expect(() => renameIdentity(base, "   ")).toThrow();
    expect(() => renameIdentity(base, "가".repeat(21))).toThrow();
  });
});
