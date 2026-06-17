import { describe, it, expect } from "vitest";
import { chooseRandomMukjjippaHand, playMukjjippaTurn } from "./playMukjjippa";
import { createMukjjippaGame, type MukjjippaState } from "../domain/mukjjippa";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("chooseRandomMukjjippaHand", () => {
  it("nextInt(3) 0/1/2 → rock/paper/scissors 로 매핑한다", () => {
    expect(chooseRandomMukjjippaHand(fixedRng(0))).toBe("rock");
    expect(chooseRandomMukjjippaHand(fixedRng(1))).toBe("paper");
    expect(chooseRandomMukjjippaHand(fixedRng(2))).toBe("scissors");
  });

  it("범위 밖 인덱스를 주는 RandomSource면 throw 한다", () => {
    expect(() => chooseRandomMukjjippaHand(fixedRng(3))).toThrow();
    expect(() => chooseRandomMukjjippaHand(fixedRng(-1))).toThrow();
  });
});

describe("playMukjjippaTurn", () => {
  it("선공 결정 단계 무승부면 attacker null 유지(미종료)", () => {
    const start = createMukjjippaGame();
    const { state } = playMukjjippaTurn(start, "rock", "rock");
    expect(state.attacker).toBeNull();
    expect(state.finished).toBe(false);
    expect(state.winner).toBeNull();
  });

  it("선공 결정 단계 승부면 이긴 쪽이 attacker(미종료)", () => {
    const start = createMukjjippaGame();
    // rock > scissors → a 승 → attacker a.
    const r1 = playMukjjippaTurn(start, "rock", "scissors");
    expect(r1.state.attacker).toBe("a");
    expect(r1.state.finished).toBe(false);
    // scissors < rock → b 승 → attacker b.
    const r2 = playMukjjippaTurn(start, "scissors", "rock");
    expect(r2.state.attacker).toBe("b");
    expect(r2.state.finished).toBe(false);
  });

  it("공격자 결정 후 같은 손이면 공격자 승리로 종료", () => {
    const attacking: MukjjippaState = { attacker: "a", finished: false, winner: null };
    const { state } = playMukjjippaTurn(attacking, "rock", "rock");
    expect(state.finished).toBe(true);
    expect(state.winner).toBe("a");
  });

  it("공격자 결정 후 다른 손이면 라운드 승자가 새 공격자(공격권 이동, 미종료)", () => {
    const attacking: MukjjippaState = { attacker: "a", finished: false, winner: null };
    // a=scissors, b=rock → b 승 → 공격권이 b로 이동.
    const { state } = playMukjjippaTurn(attacking, "scissors", "rock");
    expect(state.attacker).toBe("b");
    expect(state.finished).toBe(false);
    expect(state.winner).toBeNull();
  });

  it("이미 finished인 상태면 불변으로 반환하고 손은 그대로 echo한다", () => {
    const finished: MukjjippaState = { attacker: "b", finished: true, winner: "b" };
    const result = playMukjjippaTurn(finished, "rock", "paper");
    expect(result.a).toBe("rock");
    expect(result.b).toBe("paper");
    expect(result.state).toBe(finished); // 동일 참조(불변)
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const start = createMukjjippaGame();
    const snapshot = JSON.stringify(start);
    playMukjjippaTurn(start, "rock", "scissors");
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});
