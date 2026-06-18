import { describe, expect, it } from "vitest";
import {
  DEFAULT_TICTACTOE_HUMAN_FIRST,
  normalizeTicTacToeStartOptions,
  ticTacToeFirstPlayerOptions,
} from "./ticTacToeStartOptionsView";

describe("DEFAULT_TICTACTOE_HUMAN_FIRST", () => {
  it("기본값은 사람 X 선공(기존 동작과 동일)이다", () => {
    expect(DEFAULT_TICTACTOE_HUMAN_FIRST).toBe(true);
  });
});

describe("ticTacToeFirstPlayerOptions", () => {
  it("X(선공)→O(후공) 순으로 색 비의존 라벨을 제공한다", () => {
    expect(ticTacToeFirstPlayerOptions()).toEqual([
      { value: true, label: "사람 X 선공" },
      { value: false, label: "사람 O 후공" },
    ]);
  });
});

describe("normalizeTicTacToeStartOptions", () => {
  it("humanFirst boolean은 그대로 통과시킨다", () => {
    expect(normalizeTicTacToeStartOptions({ humanFirst: true }).humanFirst).toBe(true);
    expect(normalizeTicTacToeStartOptions({ humanFirst: false }).humanFirst).toBe(false);
  });

  it("humanFirst 미지정 시 기본값(사람 X 선공)을 쓴다", () => {
    expect(normalizeTicTacToeStartOptions({}).humanFirst).toBe(
      DEFAULT_TICTACTOE_HUMAN_FIRST,
    );
    expect(normalizeTicTacToeStartOptions({})).toEqual({ humanFirst: true });
  });

  it("비boolean 입력은 기본값으로 대체한다", () => {
    expect(
      normalizeTicTacToeStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_TICTACTOE_HUMAN_FIRST);
    expect(
      normalizeTicTacToeStartOptions({
        humanFirst: 0 as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_TICTACTOE_HUMAN_FIRST);
    expect(
      normalizeTicTacToeStartOptions({
        humanFirst: null as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_TICTACTOE_HUMAN_FIRST);
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { humanFirst: false };
    const frozen = Object.freeze({ ...input });
    expect(normalizeTicTacToeStartOptions(frozen)).toEqual({ humanFirst: false });
  });
});
