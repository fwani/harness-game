import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVERSI_HUMAN_FIRST,
  normalizeReversiStartOptions,
  reversiFirstPlayerOptions,
} from "./reversiStartOptionsView";

describe("reversiFirstPlayerOptions", () => {
  it("흑(선공)→백(후공) 순으로 색 비의존 라벨을 제공한다", () => {
    expect(reversiFirstPlayerOptions()).toEqual([
      { value: true, label: "사람 흑(●) 선공" },
      { value: false, label: "사람 백(○) 후공" },
    ]);
  });
});

describe("normalizeReversiStartOptions", () => {
  it("humanFirst boolean은 그대로 통과시킨다", () => {
    expect(normalizeReversiStartOptions({ humanFirst: true }).humanFirst).toBe(true);
    expect(normalizeReversiStartOptions({ humanFirst: false }).humanFirst).toBe(false);
  });

  it("humanFirst 미지정 시 기본값(사람 흑 선공)을 쓴다", () => {
    expect(normalizeReversiStartOptions({}).humanFirst).toBe(
      DEFAULT_REVERSI_HUMAN_FIRST,
    );
    expect(normalizeReversiStartOptions({})).toEqual({ humanFirst: true });
  });

  it("비boolean 입력은 기본값으로 대체한다", () => {
    expect(
      normalizeReversiStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_REVERSI_HUMAN_FIRST);
    expect(
      normalizeReversiStartOptions({
        humanFirst: 1 as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_REVERSI_HUMAN_FIRST);
    expect(
      normalizeReversiStartOptions({
        humanFirst: null as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_REVERSI_HUMAN_FIRST);
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { humanFirst: false };
    const frozen = Object.freeze({ ...input });
    expect(normalizeReversiStartOptions(frozen)).toEqual({ humanFirst: false });
  });
});
