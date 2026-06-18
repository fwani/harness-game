import { describe, expect, it } from "vitest";
import {
  checkersFirstPlayerOptions,
  checkersHumanColor,
  cpuPlaysFirst,
  DEFAULT_CHECKERS_HUMAN_FIRST,
  normalizeCheckersStartOptions,
} from "./checkersStartOptionsView";
import { createCheckersBoard, type CheckersColor } from "../../domain/checkers";
import { chooseCpuCheckersMove } from "./checkersCpuView";
import type { RandomSource } from "../../application/dealCards";

describe("checkersFirstPlayerOptions", () => {
  it("선공(흑)·후공(백)을 색 비의존(기호+텍스트) 라벨과 함께 순서대로 제공한다", () => {
    expect(checkersFirstPlayerOptions()).toEqual([
      { value: true, label: "선공 (● 흑, 내가 먼저)" },
      { value: false, label: "후공 (○ 백, CPU가 먼저)" },
    ]);
  });
});

describe("normalizeCheckersStartOptions", () => {
  it("humanFirst boolean은 그대로 통과시킨다", () => {
    expect(normalizeCheckersStartOptions({ humanFirst: true })).toEqual({
      humanFirst: true,
    });
    expect(normalizeCheckersStartOptions({ humanFirst: false })).toEqual({
      humanFirst: false,
    });
  });

  it("humanFirst 미지정/비boolean은 기본값으로 대체한다", () => {
    expect(normalizeCheckersStartOptions({})).toEqual({
      humanFirst: DEFAULT_CHECKERS_HUMAN_FIRST,
    });
    expect(
      normalizeCheckersStartOptions({
        humanFirst: "yes" as unknown as boolean,
      }),
    ).toEqual({ humanFirst: DEFAULT_CHECKERS_HUMAN_FIRST });
    expect(
      normalizeCheckersStartOptions({
        humanFirst: 0 as unknown as boolean,
      }),
    ).toEqual({ humanFirst: DEFAULT_CHECKERS_HUMAN_FIRST });
  });

  it("입력 객체를 변형하지 않는다(불변)", () => {
    const input = { humanFirst: false };
    const out = normalizeCheckersStartOptions(input);
    expect(out).not.toBe(input);
    expect(input).toEqual({ humanFirst: false });
  });

  it("기본값은 사람 선공(흑)이다", () => {
    expect(DEFAULT_CHECKERS_HUMAN_FIRST).toBe(true);
    expect(normalizeCheckersStartOptions({})).toEqual({ humanFirst: true });
  });
});

describe("checkersHumanColor", () => {
  it("선공이면 dark(흑), 후공이면 light(백)을 조작한다", () => {
    expect(checkersHumanColor(true)).toBe("dark");
    expect(checkersHumanColor(false)).toBe("light");
  });
});

describe("cpuPlaysFirst", () => {
  it("사람이 후공(백)이면 true(CPU=흑 선착), 선공(흑)이면 false", () => {
    expect(cpuPlaysFirst(false)).toBe(true);
    expect(cpuPlaysFirst(true)).toBe(false);
  });
});

describe("후공 선택 시 CPU(흑) 선착(시작 배선)", () => {
  // 항상 첫 합법 수를 고르는 결정적 난수원(테스트용).
  const firstMoveRng: RandomSource = { nextInt: () => 0 };

  it("후공(humanFirst=false)이면 사람은 light(백), CPU=dark(흑)가 시작 시 한 수 둘 수 있다", () => {
    const human = checkersHumanColor(false);
    expect(human).toBe("light");
    expect(cpuPlaysFirst(false)).toBe(true);

    const cpu: CheckersColor = human === "dark" ? "light" : "dark";
    expect(cpu).toBe("dark");

    // 체커는 항상 흑(dark)이 선착. 사람이 백이면 CPU(흑)가 초기 보드에서 첫 수를 둔다.
    const board = createCheckersBoard();
    const move = chooseCpuCheckersMove(board, cpu, firstMoveRng);
    expect(move).not.toBeNull();
    expect(move!.from).toBeDefined();
  });

  it("선공(humanFirst=true)이면 사람은 dark(흑)이고 첫 차례가 사람이다(CPU 선착 없음)", () => {
    expect(checkersHumanColor(true)).toBe("dark");
    expect(cpuPlaysFirst(true)).toBe(false);
  });
});
