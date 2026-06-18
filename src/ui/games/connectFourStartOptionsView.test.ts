import { describe, expect, it } from "vitest";
import {
  connectFourFirstPlayerOptions,
  connectFourHumanPlayer,
  DEFAULT_CONNECT_FOUR_HUMAN_FIRST,
  normalizeConnectFourStartOptions,
} from "./connectFourStartOptionsView";
import { createConnectFourBoard } from "../../domain/connectFour";
import { playConnectFourMove } from "../../application/playConnectFour";
import { chooseCpuConnectFourColumn } from "./connectFourCpuView";
import type { RandomSource } from "../../application/dealCards";

describe("connectFourFirstPlayerOptions", () => {
  it("선공·후공을 색 비의존 라벨과 함께 순서대로 제공한다", () => {
    expect(connectFourFirstPlayerOptions()).toEqual([
      { value: true, label: "선공 (● 내가 먼저)" },
      { value: false, label: "후공 (○ CPU가 먼저)" },
    ]);
  });
});

describe("normalizeConnectFourStartOptions", () => {
  it("humanFirst boolean은 그대로 통과시킨다", () => {
    expect(normalizeConnectFourStartOptions({ humanFirst: true })).toEqual({
      humanFirst: true,
    });
    expect(normalizeConnectFourStartOptions({ humanFirst: false })).toEqual({
      humanFirst: false,
    });
  });

  it("humanFirst 미지정/비boolean은 기본값으로 대체한다", () => {
    expect(normalizeConnectFourStartOptions({})).toEqual({
      humanFirst: DEFAULT_CONNECT_FOUR_HUMAN_FIRST,
    });
    expect(
      normalizeConnectFourStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }),
    ).toEqual({ humanFirst: DEFAULT_CONNECT_FOUR_HUMAN_FIRST });
    expect(
      normalizeConnectFourStartOptions({
        humanFirst: 1 as unknown as boolean,
      }),
    ).toEqual({ humanFirst: DEFAULT_CONNECT_FOUR_HUMAN_FIRST });
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { humanFirst: false };
    const out = normalizeConnectFourStartOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ humanFirst: false });
  });

  it("기본값은 사람 선공(●)이다", () => {
    expect(DEFAULT_CONNECT_FOUR_HUMAN_FIRST).toBe(true);
    expect(normalizeConnectFourStartOptions({})).toEqual({ humanFirst: true });
  });
});

describe("connectFourHumanPlayer", () => {
  it("선공이면 1(●), 후공이면 2(○)를 조작한다", () => {
    expect(connectFourHumanPlayer(true)).toBe(1);
    expect(connectFourHumanPlayer(false)).toBe(2);
  });
});

describe("후공 선택 시 CPU 선착(시작 배선)", () => {
  // 항상 첫 합법 열을 고르는 결정적 난수원(테스트용).
  const firstColumnRng: RandomSource = { nextInt: () => 0 };

  it("후공(humanFirst=false)이면 사람은 ○(2), CPU(●=1)가 시작 시 한 수 둔다", () => {
    const board = createConnectFourBoard();
    const human = connectFourHumanPlayer(false);
    expect(human).toBe(2);

    // 빈 보드의 첫 차례는 항상 player 1(●). 사람이 후공이므로 CPU가 player 1로 먼저 둔다.
    const cpuCol = chooseCpuConnectFourColumn(board, firstColumnRng);
    expect(cpuCol).not.toBeNull();
    const after = playConnectFourMove(board, cpuCol!, 1);

    // CPU가 ●(1)을 한 개 떨어뜨렸고, 이어서 사람(○=2) 차례가 된다.
    const discs = after.board.flat().filter((c) => c !== 0);
    expect(discs).toEqual([1]);
    expect(after.over).toBe(false);
  });

  it("선공(humanFirst=true)이면 사람은 ●(1)이고 빈 보드의 첫 차례가 사람이다", () => {
    const human = connectFourHumanPlayer(true);
    expect(human).toBe(1);
    // 빈 보드의 첫 차례는 player 1 — 사람이 선공이므로 CPU 선착이 없다.
  });
});
