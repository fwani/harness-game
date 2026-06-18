import { describe, expect, it } from "vitest";
import {
  DEFAULT_GO_HUMAN_FIRST,
  DEFAULT_GO_SIZE,
  GO_BOARD_SIZES,
  goBoardSizeOptions,
  normalizeGoStartOptions,
} from "./goStartOptionsView";

describe("goBoardSizeOptions", () => {
  it("9·13·19 크기를 순서대로 제공한다", () => {
    expect(goBoardSizeOptions()).toEqual([9, 13, 19]);
  });

  it("선택 가능한 크기 목록과 일치한다", () => {
    expect(goBoardSizeOptions()).toEqual([...GO_BOARD_SIZES]);
  });
});

describe("normalizeGoStartOptions", () => {
  it("허용 크기는 그대로 통과시킨다", () => {
    for (const size of GO_BOARD_SIZES) {
      expect(normalizeGoStartOptions({ size }).size).toBe(size);
    }
  });

  it("허용 목록 밖 크기는 가장 가까운 허용값으로 스냅한다", () => {
    expect(normalizeGoStartOptions({ size: 10 }).size).toBe(9);
    expect(normalizeGoStartOptions({ size: 12 }).size).toBe(13);
    expect(normalizeGoStartOptions({ size: 16 }).size).toBe(13);
    expect(normalizeGoStartOptions({ size: 17 }).size).toBe(19);
    expect(normalizeGoStartOptions({ size: 25 }).size).toBe(19);
    expect(normalizeGoStartOptions({ size: 1 }).size).toBe(9);
  });

  it("비정수/비숫자 크기는 기본값으로 대체한다", () => {
    expect(normalizeGoStartOptions({ size: 13.5 }).size).toBe(DEFAULT_GO_SIZE);
    expect(normalizeGoStartOptions({ size: NaN }).size).toBe(DEFAULT_GO_SIZE);
    expect(
      normalizeGoStartOptions({ size: "13" as unknown as number }).size,
    ).toBe(DEFAULT_GO_SIZE);
  });

  it("size 미지정 시 기본값(9)을 쓴다", () => {
    expect(normalizeGoStartOptions({}).size).toBe(DEFAULT_GO_SIZE);
  });

  it("humanFirst boolean은 그대로, 비boolean/미지정은 기본값으로", () => {
    expect(normalizeGoStartOptions({ humanFirst: true }).humanFirst).toBe(true);
    expect(normalizeGoStartOptions({ humanFirst: false }).humanFirst).toBe(false);
    expect(normalizeGoStartOptions({}).humanFirst).toBe(DEFAULT_GO_HUMAN_FIRST);
    expect(
      normalizeGoStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_GO_HUMAN_FIRST);
  });

  it("기본값은 9×9·사람 선공이다", () => {
    expect(normalizeGoStartOptions({})).toEqual({ size: 9, humanFirst: true });
  });
});
