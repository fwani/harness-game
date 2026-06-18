import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOMOKU_HUMAN_FIRST,
  DEFAULT_GOMOKU_SIZE,
  GOMOKU_BOARD_SIZES,
  gomokuBoardSizeOptions,
  normalizeGomokuStartOptions,
} from "./gomokuStartOptionsView";

describe("gomokuBoardSizeOptions", () => {
  it("9·13·15·19 크기를 라벨과 함께 순서대로 제공한다", () => {
    expect(gomokuBoardSizeOptions()).toEqual([
      { value: 9, label: "9×9" },
      { value: 13, label: "13×13" },
      { value: 15, label: "15×15" },
      { value: 19, label: "19×19" },
    ]);
  });

  it("선택 가능한 크기 목록과 일치한다", () => {
    expect(gomokuBoardSizeOptions().map((o) => o.value)).toEqual([
      ...GOMOKU_BOARD_SIZES,
    ]);
  });
});

describe("normalizeGomokuStartOptions", () => {
  it("허용 크기는 그대로 통과시킨다", () => {
    for (const size of GOMOKU_BOARD_SIZES) {
      expect(normalizeGomokuStartOptions({ size }).size).toBe(size);
    }
  });

  it("허용 목록 밖 크기는 기본값으로 대체한다", () => {
    expect(normalizeGomokuStartOptions({ size: 7 }).size).toBe(DEFAULT_GOMOKU_SIZE);
    expect(normalizeGomokuStartOptions({ size: 20 }).size).toBe(DEFAULT_GOMOKU_SIZE);
  });

  it("비정수/비숫자 크기는 기본값으로 대체한다", () => {
    expect(normalizeGomokuStartOptions({ size: 15.5 }).size).toBe(DEFAULT_GOMOKU_SIZE);
    expect(normalizeGomokuStartOptions({ size: NaN }).size).toBe(DEFAULT_GOMOKU_SIZE);
    // 타입을 우회한 잘못된 입력도 안전하게 기본값으로 떨어진다.
    expect(
      normalizeGomokuStartOptions({ size: "15" as unknown as number }).size,
    ).toBe(DEFAULT_GOMOKU_SIZE);
  });

  it("size 미지정 시 기본값을 쓴다", () => {
    expect(normalizeGomokuStartOptions({}).size).toBe(DEFAULT_GOMOKU_SIZE);
  });

  it("humanFirst boolean은 그대로, 비boolean/미지정은 기본값으로", () => {
    expect(normalizeGomokuStartOptions({ humanFirst: true }).humanFirst).toBe(true);
    expect(normalizeGomokuStartOptions({ humanFirst: false }).humanFirst).toBe(false);
    expect(normalizeGomokuStartOptions({}).humanFirst).toBe(
      DEFAULT_GOMOKU_HUMAN_FIRST,
    );
    expect(
      normalizeGomokuStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_GOMOKU_HUMAN_FIRST);
  });

  it("기본값은 15×15·사람 선공이다", () => {
    expect(normalizeGomokuStartOptions({})).toEqual({
      size: 15,
      humanFirst: true,
    });
  });
});
