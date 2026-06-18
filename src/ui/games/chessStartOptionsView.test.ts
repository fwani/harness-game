import { describe, expect, it } from "vitest";
import {
  chessColorOptions,
  chessHumanColor,
  cpuPlaysFirst,
  DEFAULT_CHESS_HUMAN_WHITE,
  normalizeChessStartOptions,
} from "./chessStartOptionsView";
import { startChessGame } from "../../application/playChess";
import { chooseCpuChessMove } from "./chessCpuView";
import { applyChessMove } from "../../application/playChess";
import type { RandomSource } from "../../application/dealCards";

describe("chessColorOptions", () => {
  it("백 선공·흑 후공을 색 비의존(자형+텍스트) 라벨과 함께 순서대로 제공한다", () => {
    expect(chessColorOptions()).toEqual([
      { value: true, label: "사람 백(♔) 선공" },
      { value: false, label: "사람 흑(♚) 후공" },
    ]);
  });
});

describe("normalizeChessStartOptions", () => {
  it("humanWhite boolean은 그대로 통과시킨다", () => {
    expect(normalizeChessStartOptions({ humanWhite: true })).toEqual({
      humanWhite: true,
    });
    expect(normalizeChessStartOptions({ humanWhite: false })).toEqual({
      humanWhite: false,
    });
  });

  it("humanWhite 미지정/비boolean은 기본값으로 대체한다", () => {
    expect(normalizeChessStartOptions({})).toEqual({
      humanWhite: DEFAULT_CHESS_HUMAN_WHITE,
    });
    expect(
      normalizeChessStartOptions({
        humanWhite: "yes" as unknown as boolean,
      }),
    ).toEqual({ humanWhite: DEFAULT_CHESS_HUMAN_WHITE });
    expect(
      normalizeChessStartOptions({
        humanWhite: 1 as unknown as boolean,
      }),
    ).toEqual({ humanWhite: DEFAULT_CHESS_HUMAN_WHITE });
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { humanWhite: false };
    const out = normalizeChessStartOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ humanWhite: false });
  });

  it("기본값은 사람 백(선공)이다", () => {
    expect(DEFAULT_CHESS_HUMAN_WHITE).toBe(true);
    expect(normalizeChessStartOptions({})).toEqual({ humanWhite: true });
  });
});

describe("chessHumanColor", () => {
  it("백 선택이면 white, 흑 선택이면 black을 조작한다", () => {
    expect(chessHumanColor(true)).toBe("white");
    expect(chessHumanColor(false)).toBe("black");
  });
});

describe("cpuPlaysFirst", () => {
  it("사람이 흑(후공)이면 true(CPU=백 선착), 백(선공)이면 false", () => {
    expect(cpuPlaysFirst(false)).toBe(true);
    expect(cpuPlaysFirst(true)).toBe(false);
  });
});

describe("흑 선택 시 CPU 선착(시작 배선)", () => {
  // 항상 첫 합법 수를 고르는 결정적 난수원(테스트용).
  const firstMoveRng: RandomSource = { nextInt: () => 0 };

  it("흑(humanWhite=false)이면 사람은 black, CPU(백)가 시작 시 한 수 둔다", () => {
    const human = chessHumanColor(false);
    expect(human).toBe("black");
    expect(cpuPlaysFirst(false)).toBe(true);

    // 새 게임의 첫 차례는 항상 백. 사람이 흑이므로 CPU가 백으로 먼저 둔다.
    const state = startChessGame();
    expect(state.next).toBe("white");
    const cpuMove = chooseCpuChessMove(state, firstMoveRng);
    expect(cpuMove).not.toBeNull();
    const after = applyChessMove(state, cpuMove!.from, cpuMove!.to);

    // CPU(백)가 한 수 둔 뒤 사람(흑) 차례가 된다.
    expect(after.next).toBe("black");
    expect(after.finished).toBe(false);
  });

  it("백(humanWhite=true)이면 사람은 white이고 첫 차례가 사람이다", () => {
    const human = chessHumanColor(true);
    expect(human).toBe("white");
    expect(cpuPlaysFirst(true)).toBe(false);
    // 새 게임의 첫 차례는 백 — 사람이 백 선공이므로 CPU 선착이 없다.
    expect(startChessGame().next).toBe("white");
  });
});
