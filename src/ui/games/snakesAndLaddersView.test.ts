import { describe, it, expect } from "vitest";
import {
  createSnakesAndLaddersGame,
  type SnakesAndLaddersState,
} from "../../domain/snakesAndLadders";
import {
  rollSnakesAndLaddersDie,
  type SnakesAndLaddersRollResult,
} from "../../application/playSnakesAndLadders";
import type { RandomSource } from "../../application/dealCards";
import {
  SNL_CPU,
  SNL_HUMAN,
  describeSnlStatus,
  formatSnlRoll,
  playSnlRound,
  snlDieLabel,
  snlPlayerLabel,
  snlPositionLabel,
  snlProgressRatio,
  snlTurnLabel,
  snlWinSide,
} from "./snakesAndLaddersView";

// 정해둔 주사위 눈(1..6)을 순서대로 돌려주는 결정적 RandomSource(테스트 전용).
function fakeRng(dice: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive !== 6) {
        throw new Error(`unexpected maxExclusive: ${maxExclusive}`);
      }
      const die = dice[i++];
      if (die === undefined) {
        throw new Error("fakeRng ran out of dice");
      }
      return die - 1;
    },
  };
}

// 작은 보드: size=20, 사다리(3→10)·뱀(15→5)으로 다양한 굴림 결과를 강제한다.
function smallGame(
  positions: { a: number; b: number },
  turn: "a" | "b" = "a",
): SnakesAndLaddersState {
  const base = createSnakesAndLaddersGame({
    size: 20,
    links: [
      { from: 3, to: 10 },
      { from: 15, to: 5 },
    ],
  });
  return { ...base, positions, turn };
}

// 한 굴림 결과를 얻는다(formatSnlRoll 입력용).
function rollOnce(
  state: SnakesAndLaddersState,
  die: number,
): SnakesAndLaddersRollResult {
  return rollSnakesAndLaddersDie(state, fakeRng([die]));
}

describe("snlPlayerLabel / 매핑", () => {
  it("사람=나, CPU=CPU", () => {
    expect(snlPlayerLabel(SNL_HUMAN)).toBe("나");
    expect(snlPlayerLabel(SNL_CPU)).toBe("CPU");
    expect(SNL_HUMAN).toBe("a");
    expect(SNL_CPU).toBe("b");
  });
});

describe("snlTurnLabel", () => {
  it("진행 중이면 현재 차례를 표시한다", () => {
    expect(snlTurnLabel(smallGame({ a: 0, b: 0 }, "a"))).toBe("나 차례");
    expect(snlTurnLabel(smallGame({ a: 0, b: 0 }, "b"))).toBe("CPU 차례");
  });

  it("종료 시 승자를 표시한다", () => {
    const won: SnakesAndLaddersState = { ...smallGame({ a: 20, b: 5 }), winner: "a" };
    expect(snlTurnLabel(won)).toBe("나 승리");
  });
});

describe("snlPositionLabel", () => {
  it("0칸은 출발 전으로 안내한다", () => {
    expect(snlPositionLabel(smallGame({ a: 0, b: 7 }), "a")).toBe("나: 출발 전");
  });

  it("1칸 이상은 위치/골을 표시한다", () => {
    expect(snlPositionLabel(smallGame({ a: 0, b: 7 }), "b")).toBe("CPU: 7 / 20칸");
  });
});

describe("snlProgressRatio", () => {
  it("위치를 골로 나눈 비율(0..1)을 돌려준다", () => {
    expect(snlProgressRatio(smallGame({ a: 0, b: 10 }), "a")).toBe(0);
    expect(snlProgressRatio(smallGame({ a: 0, b: 10 }), "b")).toBe(0.5);
    expect(snlProgressRatio(smallGame({ a: 20, b: 10 }), "a")).toBe(1);
  });
});

describe("snlDieLabel", () => {
  it("점 기호와 숫자를 함께 표시한다(색 비의존)", () => {
    expect(snlDieLabel(3)).toBe("⚂ 3");
  });

  it("범위를 벗어난 눈은 조용히 무시하지 않고 throw한다", () => {
    expect(() => snlDieLabel(7)).toThrow();
  });
});

describe("describeSnlStatus", () => {
  it("사람 승/CPU 승/진행 중을 구분한다", () => {
    const humanWin: SnakesAndLaddersState = { ...smallGame({ a: 20, b: 5 }), winner: "a" };
    const cpuWin: SnakesAndLaddersState = { ...smallGame({ a: 5, b: 20 }), winner: "b" };
    expect(describeSnlStatus(humanWin)).toContain("승리");
    expect(describeSnlStatus(cpuWin)).toContain("패배");
    expect(describeSnlStatus(smallGame({ a: 0, b: 0 }, "a"))).toContain("주사위");
    expect(describeSnlStatus(smallGame({ a: 0, b: 0 }, "b"))).toContain("CPU");
  });
});

describe("snlWinSide", () => {
  it("승자를 기록 값(a/b)으로 매핑한다", () => {
    expect(snlWinSide("a")).toBe("a");
    expect(snlWinSide("b")).toBe("b");
  });
});

describe("formatSnlRoll", () => {
  it("단순 전진을 표시한다", () => {
    const r = rollOnce(smallGame({ a: 0, b: 0 }, "a"), 2);
    expect(formatSnlRoll(r)).toBe("나: ⚁ 2 — 0칸에서 2칸으로 이동");
  });

  it("사다리를 타고 오르는 이동을 표시한다", () => {
    // a=1, die=2 → 3칸(사다리) → 10칸
    const r = rollOnce(smallGame({ a: 1, b: 0 }, "a"), 2);
    expect(formatSnlRoll(r)).toBe("나: ⚁ 2 — 3칸에서 사다리를 타고 올라 10칸으로 이동");
  });

  it("뱀에 미끄러지는 이동을 표시한다", () => {
    // a=13, die=2 → 15칸(뱀) → 5칸
    const r = rollOnce(smallGame({ a: 13, b: 0 }, "a"), 2);
    expect(formatSnlRoll(r)).toBe("나: ⚁ 2 — 15칸에서 뱀에 미끄러져 5칸으로 이동");
  });

  it("골 초과는 제자리에 머무름을 안내한다", () => {
    // a=19, die=2 → 21 > 20 초과
    const r = rollOnce(smallGame({ a: 19, b: 0 }, "a"), 2);
    expect(formatSnlRoll(r)).toBe("나: ⚁ 2 — 골(20칸)을 초과해 제자리(19칸)에 머무름");
  });

  it("정확히 골에 도달하면 승리를 안내한다", () => {
    // a=18, die=2 → 20 == size 승리
    const r = rollOnce(smallGame({ a: 18, b: 0 }, "a"), 2);
    expect(formatSnlRoll(r)).toBe("나: ⚁ 2 — 골(20칸)에 정확히 도달! 승리");
    expect(r.state.winner).toBe("a");
  });
});

describe("playSnlRound", () => {
  it("사람 한 턴 후 미종료면 CPU 한 턴을 진행한다", () => {
    const state = smallGame({ a: 0, b: 0 }, "a");
    const round = playSnlRound(state, fakeRng([2, 4])); // 사람 2, CPU 4
    expect(round.cpu).not.toBeNull();
    expect(round.state.positions.a).toBe(2);
    expect(round.state.positions.b).toBe(4);
    expect(round.log).toHaveLength(2);
    expect(round.log[0]).toContain("나:");
    expect(round.log[1]).toContain("CPU:");
    // 라운드가 끝나면 다시 사람 차례로 돌아온다.
    expect(round.state.winner).toBeNull();
    expect(round.state.turn).toBe("a");
  });

  it("사람이 이번 턴에 이기면 CPU는 굴리지 않는다", () => {
    const state = smallGame({ a: 18, b: 0 }, "a");
    const round = playSnlRound(state, fakeRng([2])); // 사람 2 → 골 도달
    expect(round.state.winner).toBe("a");
    expect(round.cpu).toBeNull();
    expect(round.log).toHaveLength(1);
    expect(round.log[0]).toContain("승리");
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = smallGame({ a: 0, b: 0 }, "a");
    const before = JSON.stringify(state);
    playSnlRound(state, fakeRng([2, 4]));
    expect(JSON.stringify(state)).toBe(before);
  });
});
