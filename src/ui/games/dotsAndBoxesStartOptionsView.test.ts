import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOTS_OPTIONS,
  DOTS_BOARD_SIZES,
  dotsBoardSizeOptions,
  normalizeDotsStartOptions,
} from "./dotsAndBoxesStartOptionsView";

describe("dotsBoardSizeOptions", () => {
  it("작은·표준·큰 프리셋을 라벨과 함께 순서대로 제공한다", () => {
    expect(dotsBoardSizeOptions()).toEqual([
      { value: { rows: 3, cols: 3 }, label: "작은 (3×3)" },
      { value: { rows: 5, cols: 5 }, label: "표준 (5×5)" },
      { value: { rows: 7, cols: 7 }, label: "큰 (7×7)" },
    ]);
  });

  it("선택 가능한 크기 목록과 순서가 일치한다", () => {
    expect(dotsBoardSizeOptions().map((o) => o.value)).toEqual(
      DOTS_BOARD_SIZES.map((s) => ({ rows: s.rows, cols: s.cols })),
    );
  });
});

describe("normalizeDotsStartOptions", () => {
  it("허용 프리셋은 그대로 통과시킨다", () => {
    for (const s of DOTS_BOARD_SIZES) {
      expect(normalizeDotsStartOptions({ rows: s.rows, cols: s.cols })).toEqual({
        rows: s.rows,
        cols: s.cols,
      });
    }
  });

  it("허용 목록 밖 크기는 기본값으로 대체한다", () => {
    expect(normalizeDotsStartOptions({ rows: 4, cols: 4 })).toEqual(
      DEFAULT_DOTS_OPTIONS,
    );
    expect(normalizeDotsStartOptions({ rows: 10, cols: 10 })).toEqual(
      DEFAULT_DOTS_OPTIONS,
    );
    // rows/cols 한쪽만 프리셋과 맞아도(비정사각·비프리셋 조합) 폴백한다.
    expect(normalizeDotsStartOptions({ rows: 3, cols: 5 })).toEqual(
      DEFAULT_DOTS_OPTIONS,
    );
  });

  it("비정수/비숫자 크기는 기본값으로 대체한다", () => {
    expect(normalizeDotsStartOptions({ rows: 5.5, cols: 5 })).toEqual(
      DEFAULT_DOTS_OPTIONS,
    );
    expect(normalizeDotsStartOptions({ rows: NaN, cols: NaN })).toEqual(
      DEFAULT_DOTS_OPTIONS,
    );
    // 타입을 우회한 잘못된 입력도 안전하게 기본값으로 떨어진다.
    expect(
      normalizeDotsStartOptions({
        rows: "5" as unknown as number,
        cols: "5" as unknown as number,
      }),
    ).toEqual(DEFAULT_DOTS_OPTIONS);
  });

  it("rows/cols 미지정 시 기본값(5×5)을 쓴다", () => {
    expect(normalizeDotsStartOptions({})).toEqual(DEFAULT_DOTS_OPTIONS);
    expect(normalizeDotsStartOptions({ rows: 5 })).toEqual(DEFAULT_DOTS_OPTIONS);
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { rows: 7, cols: 7 };
    const out = normalizeDotsStartOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ rows: 7, cols: 7 });
  });

  it("기본값은 표준 5×5다", () => {
    expect(DEFAULT_DOTS_OPTIONS).toEqual({ rows: 5, cols: 5 });
  });
});
