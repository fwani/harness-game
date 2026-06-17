import { describe, expect, it } from "vitest";
import type { RandomSource } from "./dealCards";
import { chooseCpuPigAction, rollPigDie } from "./playPig";
import { createPigGame, type PigState } from "../domain/pig";

/**
 * 미리 정한 정수 시퀀스를 순서대로 돌려주는 결정적 가짜 RandomSource.
 * rollPigDie는 nextInt(6)을 호출하므로 0..5 값을 넣으면 눈은 그 값 + 1 이 된다.
 * 시퀀스가 소진되거나 maxExclusive !== 6 이면 throw 하여 호출 규약을 검증한다.
 */
const seqRng = (values: number[]): RandomSource => {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive !== 6) {
        throw new Error(`expected nextInt(6), got nextInt(${maxExclusive})`);
      }
      if (i >= values.length) {
        throw new Error("seqRng exhausted");
      }
      return values[i++]!;
    },
  };
};

/** maxExclusive와 무관하게 항상 같은 값을 돌려주는 RandomSource(범위 밖 검증용). */
const constRng = (value: number): RandomSource => ({
  nextInt: () => value,
});

describe("rollPigDie", () => {
  it("nextInt(6)+1 로 눈을 만들어 누계에 더한다(busted=false)", () => {
    const state = createPigGame(); // turn=a, turnTotal=0
    const result = rollPigDie(state, seqRng([4])); // die = 5
    expect(result.die).toBe(5);
    expect(result.busted).toBe(false);
    expect(result.state.turnTotal).toBe(5);
    expect(result.state.turn).toBe("a"); // 차례 유지
  });

  it("같은 시드는 같은 결과를 낸다(결정성)", () => {
    const a = rollPigDie(createPigGame(), seqRng([2]));
    const b = rollPigDie(createPigGame(), seqRng([2]));
    expect(a).toEqual(b);
    expect(a.die).toBe(3);
  });

  it("die===1 이면 busted=true, 누계 소멸·차례 전환", () => {
    const start = rollPigDie(createPigGame(), seqRng([3])).state; // turnTotal=4
    expect(start.turnTotal).toBe(4);
    const busted = rollPigDie(start, seqRng([0])); // die = 1
    expect(busted.die).toBe(1);
    expect(busted.busted).toBe(true);
    expect(busted.state.turnTotal).toBe(0);
    expect(busted.state.turn).toBe("b"); // 차례가 상대로
  });

  it("입력 state를 변형하지 않는다(불변성)", () => {
    const state = createPigGame();
    const snapshot = JSON.parse(JSON.stringify(state));
    rollPigDie(state, seqRng([4]));
    expect(state).toEqual(snapshot);
  });

  it("rng가 1..6을 벗어난 눈을 만들면 throw", () => {
    // nextInt가 6을 돌려주면 die = 7 → 범위 밖
    expect(() => rollPigDie(createPigGame(), constRng(6))).toThrow(
      /out-of-range die value/,
    );
    // nextInt가 -1을 돌려주면 die = 0 → 범위 밖
    expect(() => rollPigDie(createPigGame(), constRng(-1))).toThrow(
      /out-of-range die value/,
    );
  });

  it("이미 종료된 state면 도메인 throw를 그대로 전파한다", () => {
    const finished: PigState = {
      scores: { a: 100, b: 0 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: "a",
    };
    expect(() => rollPigDie(finished, seqRng([3]))).toThrow(/이미 종료된 게임/);
  });
});

describe("chooseCpuPigAction", () => {
  const withTurnTotal = (turnTotal: number): PigState => ({
    scores: { a: 0, b: 0 },
    turn: "a",
    turnTotal,
    target: 100,
    winner: null,
  });

  it("기본 holdAt=20 경계: 누계 19면 roll, 20이면 hold", () => {
    expect(chooseCpuPigAction(withTurnTotal(19))).toBe("roll");
    expect(chooseCpuPigAction(withTurnTotal(20))).toBe("hold");
  });

  it("커스텀 holdAt 경계: holdAt-1 이면 roll, holdAt 이면 hold", () => {
    expect(chooseCpuPigAction(withTurnTotal(9), 10)).toBe("roll");
    expect(chooseCpuPigAction(withTurnTotal(10), 10)).toBe("hold");
  });

  it("멈추면 목표 도달이면 holdAt 미달이어도 hold", () => {
    const state: PigState = {
      scores: { a: 95, b: 0 },
      turn: "a",
      turnTotal: 5, // 95 + 5 = 100 >= target
      target: 100,
      winner: null,
    };
    expect(chooseCpuPigAction(state)).toBe("hold");
  });

  it("CPU 차례(b) 기준으로 b의 점수·누계를 본다", () => {
    const state: PigState = {
      scores: { a: 0, b: 96 },
      turn: "b",
      turnTotal: 4, // 96 + 4 = 100 >= target
      target: 100,
      winner: null,
    };
    expect(chooseCpuPigAction(state)).toBe("hold");
  });

  it("누계 0(턴 시작)이면 roll", () => {
    expect(chooseCpuPigAction(withTurnTotal(0))).toBe("roll");
  });

  it("순수: 입력 state를 변형하지 않는다", () => {
    const state = withTurnTotal(20);
    const snapshot = JSON.parse(JSON.stringify(state));
    chooseCpuPigAction(state);
    expect(state).toEqual(snapshot);
  });

  it("holdAt이 양의 정수가 아니면 throw", () => {
    expect(() => chooseCpuPigAction(withTurnTotal(5), 0)).toThrow(/holdAt/);
    expect(() => chooseCpuPigAction(withTurnTotal(5), 1.5)).toThrow(/holdAt/);
  });
});
