import { describe, it, expect } from "vitest";
import { CryptoIdSource } from "./cryptoIdSource";
import type { RandomSource } from "../application/dealCards";

/** 주어진 시퀀스를 순환 반환하는 결정적 가짜 RandomSource(더미 값만 사용). */
function seqRng(values: readonly number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      const v = values[i % values.length]! % maxExclusive;
      i += 1;
      return v;
    },
  };
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("CryptoIdSource", () => {
  it("주입된 randomUUID가 있으면 그 값을 사용한다(native 경로)", () => {
    const ids = new CryptoIdSource({ randomUUID: () => "dummy-native-id" });
    expect(ids.newId()).toBe("dummy-native-id");
  });

  it("randomUUID가 null이면 폴백 RandomSource로 UUID 형태 식별자를 만든다", () => {
    const ids = new CryptoIdSource({
      randomUUID: null,
      fallbackRng: seqRng([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
    });
    expect(ids.newId()).toMatch(UUID_SHAPE);
  });

  it("같은 rng 시퀀스면 같은 폴백 식별자(결정적)", () => {
    const seq = [3, 14, 1, 5, 9, 2, 6, 8, 7, 13, 0, 4, 11, 10, 15, 12];
    const a = new CryptoIdSource({ randomUUID: null, fallbackRng: seqRng(seq) });
    const b = new CryptoIdSource({ randomUUID: null, fallbackRng: seqRng(seq) });
    expect(a.newId()).toBe(b.newId());
  });

  it("연속 호출은 rng를 계속 소비해 서로 다른 식별자를 만든다", () => {
    const ids = new CryptoIdSource({
      randomUUID: null,
      fallbackRng: seqRng([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
    });
    expect(ids.newId()).not.toBe(ids.newId());
  });

  it("native UUID도 폴백 rng도 없으면 throw(약식별자 조용히 발급 금지)", () => {
    const ids = new CryptoIdSource({ randomUUID: null });
    expect(() => ids.newId()).toThrow();
  });
});
