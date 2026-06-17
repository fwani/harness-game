import { describe, expect, it } from "vitest";
import type { RandomSource } from "./dealCards";
import {
  rollSnakesAndLaddersDie,
  playSnakesAndLaddersTurn,
} from "./playSnakesAndLadders";
import {
  createSnakesAndLaddersGame,
  findSnakesAndLaddersWinner,
  type SnakesAndLaddersState,
} from "../domain/snakesAndLadders";

/**
 * 미리 정한 정수 시퀀스를 순서대로 돌려주는 결정적 가짜 RandomSource.
 * rollSnakesAndLaddersDie는 nextInt(6)을 호출하므로 0..5 값을 넣으면 눈은 그 값 + 1 이 된다.
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

describe("rollSnakesAndLaddersDie", () => {
  it("nextInt(6)+1 로 눈을 만들어 도메인 이동에 위임한다(일반 전진)", () => {
    const state = createSnakesAndLaddersGame({ size: 20, links: [] });
    const result = rollSnakesAndLaddersDie(state, seqRng([2])); // die = 3
    expect(result.die).toBe(3);
    expect(result.mover).toBe("a");
    expect(result.from).toBe(0);
    expect(result.to).toBe(3);
    expect(result.slid).toBe(false);
    expect(result.overshoot).toBe(false);
    expect(result.state.positions.a).toBe(3);
    expect(result.state.turn).toBe("b"); // 차례 전환
    expect(result.state.winner).toBeNull();
  });

  it("같은 시퀀스는 같은 결과를 낸다(결정성)", () => {
    const a = rollSnakesAndLaddersDie(
      createSnakesAndLaddersGame({ size: 20, links: [] }),
      seqRng([4]),
    );
    const b = rollSnakesAndLaddersDie(
      createSnakesAndLaddersGame({ size: 20, links: [] }),
      seqRng([4]),
    );
    expect(a).toEqual(b);
    expect(a.die).toBe(5);
  });

  it("rng가 1..6을 벗어난 눈을 만들면 throw 한다", () => {
    const state = createSnakesAndLaddersGame({ size: 20, links: [] });
    // constRng(6) → die = 7 (범위 밖)
    expect(() => rollSnakesAndLaddersDie(state, constRng(6))).toThrow(
      /out-of-range die value/,
    );
  });

  it("사다리 칸에 도달하면 slid=true 로 상승한다", () => {
    const state = createSnakesAndLaddersGame({
      size: 20,
      links: [{ from: 3, to: 10 }],
    });
    const result = rollSnakesAndLaddersDie(state, seqRng([2])); // die = 3 → 3칸, 사다리로 10
    expect(result.from).toBe(0);
    expect(result.to).toBe(10);
    expect(result.slid).toBe(true);
    expect(result.overshoot).toBe(false);
    expect(result.state.positions.a).toBe(10);
  });

  it("뱀 칸에 도달하면 slid=true 로 하강한다", () => {
    const base = createSnakesAndLaddersGame({
      size: 20,
      links: [{ from: 6, to: 2 }],
    });
    // a를 미리 1칸으로 둬서 die=5 로 6(뱀 머리)에 닿게 한다.
    const state: SnakesAndLaddersState = {
      ...base,
      positions: { a: 1, b: 0 },
    };
    const result = rollSnakesAndLaddersDie(state, seqRng([4])); // die = 5 → 6, 뱀으로 2
    expect(result.from).toBe(1);
    expect(result.to).toBe(2);
    expect(result.slid).toBe(true);
    expect(result.overshoot).toBe(false);
    expect(result.state.positions.a).toBe(2);
  });

  it("size 를 초과하면 overshoot=true 로 제자리에 머문다(턴만 전환)", () => {
    const base = createSnakesAndLaddersGame({ size: 6, links: [] });
    const state: SnakesAndLaddersState = {
      ...base,
      positions: { a: 4, b: 0 },
    };
    const result = rollSnakesAndLaddersDie(state, seqRng([2])); // die = 3 → 4+3=7 > 6
    expect(result.from).toBe(4);
    expect(result.to).toBe(4); // 제자리
    expect(result.overshoot).toBe(true);
    expect(result.slid).toBe(false);
    expect(result.state.positions.a).toBe(4);
    expect(result.state.turn).toBe("b");
    expect(result.state.winner).toBeNull();
  });

  it("정확히 size 에 도달하면 승자를 산출한다(findSnakesAndLaddersWinner와 일관)", () => {
    const base = createSnakesAndLaddersGame({ size: 6, links: [] });
    const state: SnakesAndLaddersState = {
      ...base,
      positions: { a: 3, b: 0 },
    };
    const result = rollSnakesAndLaddersDie(state, seqRng([2])); // die = 3 → 3+3=6 = size
    expect(result.from).toBe(3);
    expect(result.to).toBe(6);
    expect(result.slid).toBe(false);
    expect(result.overshoot).toBe(false);
    expect(result.state.winner).toBe("a");
    expect(result.state.turn).toBe("a"); // 승리 시 턴 미전환
    expect(findSnakesAndLaddersWinner(result.state)).toBe("a");
  });

  it("이미 종료된 state 면 도메인 throw 를 그대로 전파한다", () => {
    const base = createSnakesAndLaddersGame({ size: 6, links: [] });
    const finished: SnakesAndLaddersState = {
      ...base,
      positions: { a: 6, b: 0 },
      winner: "a",
    };
    expect(() => rollSnakesAndLaddersDie(finished, seqRng([0]))).toThrow();
  });

  it("입력 state 를 변형하지 않는다(immutability)", () => {
    const state = createSnakesAndLaddersGame({
      size: 20,
      links: [{ from: 3, to: 10 }],
    });
    const snapshot = JSON.parse(JSON.stringify(state));
    rollSnakesAndLaddersDie(state, seqRng([2]));
    expect(state).toEqual(snapshot);
    expect(state.positions).toEqual({ a: 0, b: 0 });
    expect(state.turn).toBe("a");
    expect(state.winner).toBeNull();
  });
});

describe("playSnakesAndLaddersTurn", () => {
  it("rollSnakesAndLaddersDie 와 동일한 한 턴 결과를 낸다(얇은 래퍼)", () => {
    const state = createSnakesAndLaddersGame({ size: 20, links: [] });
    const viaTurn = playSnakesAndLaddersTurn(state, seqRng([3]));
    const viaRoll = rollSnakesAndLaddersDie(state, seqRng([3]));
    expect(viaTurn).toEqual(viaRoll);
    expect(viaTurn.die).toBe(4);
  });

  it("winner 가 날 때까지 반복 호출해 한 게임을 끝낼 수 있다", () => {
    let state = createSnakesAndLaddersGame({ size: 10, links: [] });
    // a,b 교대로 굴려 누군가 정확히 10에 도달할 때까지 진행한다.
    const dice = [4, 4, 4, 4, 1]; // nextInt 값들(눈 = +1): a=5,b=5,a=5,b=5,a=2 → a 위치 5→?
    let guard = 0;
    while (state.winner === null && guard < 100) {
      const result = playSnakesAndLaddersTurn(state, seqRng([dice[guard % dice.length]!]));
      state = result.state;
      guard++;
    }
    expect(state.winner).not.toBeNull();
    expect(findSnakesAndLaddersWinner(state)).toBe(state.winner);
  });
});
