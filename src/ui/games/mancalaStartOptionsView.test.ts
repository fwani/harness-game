import { describe, expect, it } from "vitest";
import {
  DEFAULT_MANCALA_HUMAN_FIRST,
  DEFAULT_MANCALA_SEEDS_PER_PIT,
  MANCALA_SEEDS_OPTIONS,
  mancalaFirstPlayerOptions,
  mancalaHumanPlayer,
  normalizeMancalaStartOptions,
} from "./mancalaStartOptionsView";
import { createMancalaBoard } from "../../domain/mancala";
import { chooseRandomMancalaMove, playMancalaTurn } from "../../application/playMancala";
import type { RandomSource } from "../../application/dealCards";

describe("MANCALA_SEEDS_OPTIONS", () => {
  it("3/4/6 프리셋을 변형명이 명시된 라벨과 함께 제공한다", () => {
    expect(MANCALA_SEEDS_OPTIONS).toEqual([
      { value: 3, label: "3개 (Kalah 6/3)" },
      { value: 4, label: "4개 (표준 Kalah 6/4)" },
      { value: 6, label: "6개 (Kalah 6/6)" },
    ]);
  });

  it("기본 씨앗 수는 표준 Kalah 6/4의 4개다", () => {
    expect(DEFAULT_MANCALA_SEEDS_PER_PIT).toBe(4);
    expect(MANCALA_SEEDS_OPTIONS.map((o) => o.value)).toContain(
      DEFAULT_MANCALA_SEEDS_PER_PIT,
    );
  });
});

describe("mancalaFirstPlayerOptions", () => {
  it("선공·후공을 색 비의존 라벨과 함께 순서대로 제공한다", () => {
    expect(mancalaFirstPlayerOptions()).toEqual([
      { value: true, label: "선공 (내가 먼저)" },
      { value: false, label: "후공 (CPU가 먼저)" },
    ]);
  });
});

describe("normalizeMancalaStartOptions", () => {
  it("허용 씨앗 수·boolean humanFirst는 그대로 통과시킨다", () => {
    expect(normalizeMancalaStartOptions({ seedsPerPit: 3, humanFirst: false })).toEqual({
      seedsPerPit: 3,
      humanFirst: false,
    });
    expect(normalizeMancalaStartOptions({ seedsPerPit: 6, humanFirst: true })).toEqual({
      seedsPerPit: 6,
      humanFirst: true,
    });
  });

  it("허용 목록 밖/비정수 씨앗 수는 기본값으로 대체한다", () => {
    expect(normalizeMancalaStartOptions({ seedsPerPit: 5 }).seedsPerPit).toBe(
      DEFAULT_MANCALA_SEEDS_PER_PIT,
    );
    expect(normalizeMancalaStartOptions({ seedsPerPit: 0 }).seedsPerPit).toBe(
      DEFAULT_MANCALA_SEEDS_PER_PIT,
    );
    expect(
      normalizeMancalaStartOptions({ seedsPerPit: 4.5 }).seedsPerPit,
    ).toBe(DEFAULT_MANCALA_SEEDS_PER_PIT);
    expect(
      normalizeMancalaStartOptions({
        seedsPerPit: "4" as unknown as number,
      }).seedsPerPit,
    ).toBe(DEFAULT_MANCALA_SEEDS_PER_PIT);
  });

  it("humanFirst 미지정/비boolean은 기본값으로 대체한다", () => {
    expect(normalizeMancalaStartOptions({}).humanFirst).toBe(
      DEFAULT_MANCALA_HUMAN_FIRST,
    );
    expect(
      normalizeMancalaStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }).humanFirst,
    ).toBe(DEFAULT_MANCALA_HUMAN_FIRST);
    expect(
      normalizeMancalaStartOptions({ humanFirst: 1 as unknown as boolean }).humanFirst,
    ).toBe(DEFAULT_MANCALA_HUMAN_FIRST);
  });

  it("빈 입력은 표준 기본값(6/4·사람 선공)으로 정규화된다", () => {
    expect(normalizeMancalaStartOptions({})).toEqual({
      seedsPerPit: DEFAULT_MANCALA_SEEDS_PER_PIT,
      humanFirst: DEFAULT_MANCALA_HUMAN_FIRST,
    });
    expect(DEFAULT_MANCALA_HUMAN_FIRST).toBe(true);
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { seedsPerPit: 3, humanFirst: false };
    const out = normalizeMancalaStartOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ seedsPerPit: 3, humanFirst: false });
  });
});

describe("mancalaHumanPlayer", () => {
  it("선공이면 1, 후공이면 2를 조작한다", () => {
    expect(mancalaHumanPlayer(true)).toBe(1);
    expect(mancalaHumanPlayer(false)).toBe(2);
  });
});

describe("후공 선택 시 CPU 선착(시작 배선)", () => {
  // 항상 첫 합법 구덩이를 고르는 결정적 난수원(테스트용).
  const firstPitRng: RandomSource = { nextInt: () => 0 };

  it("후공(humanFirst=false)이면 사람은 2, CPU(player 1)가 시작 시 한 수 둔다", () => {
    const board = createMancalaBoard(6, DEFAULT_MANCALA_SEEDS_PER_PIT);
    const human = mancalaHumanPlayer(false);
    expect(human).toBe(2);

    // 새 보드의 첫 차례는 항상 player 1. 사람이 후공이므로 CPU가 player 1로 먼저 둔다.
    const pit = chooseRandomMancalaMove(board, 1, firstPitRng);
    expect(pit).not.toBeNull();
    const after = playMancalaTurn(board, 1, pit!);

    // CPU(1)가 한 수 뒀고, 게임은 계속된다(다음은 again이면 1, 아니면 사람 2 차례).
    expect(after.over).toBe(false);
    expect(after.board.pits[1]![pit!]).toBe(0);
  });

  it("선공(humanFirst=true)이면 사람은 1이고 새 보드의 첫 차례가 사람이다", () => {
    expect(mancalaHumanPlayer(true)).toBe(1);
    // 새 보드의 첫 차례는 player 1 — 사람이 선공이므로 CPU 선착이 없다.
  });

  it("선택한 씨앗 수가 createMancalaBoard config로 전달된다(구덩이당 씨앗 반영)", () => {
    const board = createMancalaBoard(6, 3);
    expect(board.pits[1]).toEqual([3, 3, 3, 3, 3, 3]);
    expect(board.pits[2]).toEqual([3, 3, 3, 3, 3, 3]);
  });
});
