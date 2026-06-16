import { describe, it, expect } from "vitest";
import { expectedScore, updateElo } from "./elo";

describe("expectedScore", () => {
  it("동일 레이팅이면 0.5다", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
  });

  it("대칭성: expectedScore(a,b) + expectedScore(b,a) === 1", () => {
    const a = 1623;
    const b = 1411;
    expect(expectedScore(a, b) + expectedScore(b, a)).toBeCloseTo(1, 12);
  });

  it("레이팅이 높을수록 기대 승률이 크다", () => {
    expect(expectedScore(1800, 1500)).toBeGreaterThan(0.5);
    expect(expectedScore(1500, 1800)).toBeLessThan(0.5);
  });

  it("400 차이면 표준 식대로 약 0.909다", () => {
    expect(expectedScore(1900, 1500)).toBeCloseTo(1 / (1 + 10 ** -1), 12);
  });

  it("유한수가 아니면 throw한다", () => {
    expect(() => expectedScore(Number.NaN, 1500)).toThrow();
    expect(() => expectedScore(1500, Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("updateElo", () => {
  it("동일 레이팅에서 win이면 +K/2(=+16), 진 쪽은 -16", () => {
    const { ratingA, ratingB } = updateElo(1500, 1500, "win");
    expect(ratingA).toBe(1516);
    expect(ratingB).toBe(1484);
  });

  it("동일 레이팅에서 loss면 A는 내려가고 B는 올라간다", () => {
    const { ratingA, ratingB } = updateElo(1500, 1500, "loss");
    expect(ratingA).toBe(1484);
    expect(ratingB).toBe(1516);
  });

  it("동일 레이팅에서 draw면 변동이 없다", () => {
    expect(updateElo(1500, 1500, "draw")).toEqual({ ratingA: 1500, ratingB: 1500 });
  });

  it("결과는 정수로 반올림된다", () => {
    const { ratingA, ratingB } = updateElo(1500, 1400, "win");
    expect(Number.isInteger(ratingA)).toBe(true);
    expect(Number.isInteger(ratingB)).toBe(true);
    // 기대승률 ≈ 0.6401 → +32*(1-0.6401) ≈ +11.52 → 1512
    expect(ratingA).toBe(1512);
    expect(ratingB).toBe(1388);
  });

  it("약자가 강자를 이기면 변동폭이 더 크다", () => {
    const upset = updateElo(1400, 1800, "win"); // 약자(A) 승리
    const expected = updateElo(1800, 1400, "win"); // 강자(A) 승리
    const upsetGain = upset.ratingA - 1400;
    const expectedGain = expected.ratingA - 1800;
    expect(upsetGain).toBeGreaterThan(expectedGain);
  });

  it("무승부에서는 더 낮은 레이팅 쪽이 오른다", () => {
    const { ratingA, ratingB } = updateElo(1400, 1800, "draw");
    expect(ratingA).toBeGreaterThan(1400); // 약자 상승
    expect(ratingB).toBeLessThan(1800); // 강자 하락
  });

  it("점수 변동은 합이 보존된다(zero-sum)", () => {
    const before = 1500 + 1700;
    const { ratingA, ratingB } = updateElo(1500, 1700, "win");
    // 반올림 오차 범위 내에서 총합 보존
    expect(ratingA + ratingB).toBeCloseTo(before, 0);
  });

  it("kFactor를 키우면 변동폭이 커진다", () => {
    const small = updateElo(1500, 1500, "win", 16);
    const large = updateElo(1500, 1500, "win", 64);
    expect(small.ratingA - 1500).toBe(8);
    expect(large.ratingA - 1500).toBe(32);
  });

  it("입력 레이팅을 변형하지 않는다(순수 함수)", () => {
    const a = 1500;
    const b = 1600;
    updateElo(a, b, "win");
    expect(a).toBe(1500);
    expect(b).toBe(1600);
  });

  it("레이팅이 유한수가 아니면 throw한다", () => {
    expect(() => updateElo(Number.NaN, 1500, "win")).toThrow();
    expect(() => updateElo(1500, Number.POSITIVE_INFINITY, "win")).toThrow();
  });

  it("kFactor가 0 이하이거나 유한수가 아니면 throw한다", () => {
    expect(() => updateElo(1500, 1500, "win", 0)).toThrow();
    expect(() => updateElo(1500, 1500, "win", -32)).toThrow();
    expect(() => updateElo(1500, 1500, "win", Number.NaN)).toThrow();
  });

  it("잘못된 outcome이면 throw한다", () => {
    // @ts-expect-error 런타임 검증을 위해 의도적으로 잘못된 값 전달
    expect(() => updateElo(1500, 1500, "tie")).toThrow();
  });
});
