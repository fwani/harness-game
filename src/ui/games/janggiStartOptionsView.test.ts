import { describe, it, expect } from "vitest";
import {
  DEFAULT_JANGGI_OPTIONS,
  janggiSideOptions,
  normalizeJanggiOptions,
  cpuPlaysFirst,
} from "./janggiStartOptionsView";

describe("DEFAULT_JANGGI_OPTIONS", () => {
  it("기본은 사람=초(선착)로 기존 동작을 보존한다", () => {
    expect(DEFAULT_JANGGI_OPTIONS).toEqual({ humanSide: "cho" });
  });
});

describe("janggiSideOptions", () => {
  it("초(선공)·한(후공) 두 옵션을 순서대로 제공한다", () => {
    const opts = janggiSideOptions();
    expect(opts.map((o) => o.value)).toEqual(["cho", "han"]);
  });

  it("라벨에 한자 기호와 선/후공을 색 비의존으로 명시한다", () => {
    const [cho, han] = janggiSideOptions();
    expect(cho!.label).toContain("楚");
    expect(cho!.label).toContain("선공");
    expect(han!.label).toContain("漢");
    expect(han!.label).toContain("후공");
  });
});

describe("normalizeJanggiOptions", () => {
  it("허용값 cho/han은 그대로 통과시킨다", () => {
    expect(normalizeJanggiOptions({ humanSide: "cho" })).toEqual({
      humanSide: "cho",
    });
    expect(normalizeJanggiOptions({ humanSide: "han" })).toEqual({
      humanSide: "han",
    });
  });

  it("누락·허용 외·잘못된 타입은 기본값(초)으로 정규화한다", () => {
    expect(normalizeJanggiOptions({})).toEqual(DEFAULT_JANGGI_OPTIONS);
    expect(normalizeJanggiOptions({ humanSide: "red" })).toEqual(
      DEFAULT_JANGGI_OPTIONS,
    );
    expect(normalizeJanggiOptions({ humanSide: 1 })).toEqual(
      DEFAULT_JANGGI_OPTIONS,
    );
    expect(normalizeJanggiOptions(null)).toEqual(DEFAULT_JANGGI_OPTIONS);
    expect(normalizeJanggiOptions(undefined)).toEqual(DEFAULT_JANGGI_OPTIONS);
    expect(normalizeJanggiOptions("cho")).toEqual(DEFAULT_JANGGI_OPTIONS);
  });

  it("입력 객체를 변형하지 않고 새 객체를 반환한다", () => {
    const input = { humanSide: "han" as const };
    const out = normalizeJanggiOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ humanSide: "han" });
  });
});

describe("cpuPlaysFirst", () => {
  it("사람이 한(후공)이면 CPU(초)가 선착한다(true)", () => {
    expect(cpuPlaysFirst({ humanSide: "han" })).toBe(true);
  });

  it("사람이 초(선공)이면 CPU 선착이 없다(false)", () => {
    expect(cpuPlaysFirst({ humanSide: "cho" })).toBe(false);
  });
});
