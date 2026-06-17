import { describe, it, expect } from "vitest";
import { createMukjjippaGame, type MukjjippaState } from "../domain/mukjjippa";
import { chooseRandomMukjjippaHand, playMukjjippaTurn } from "./playMukjjippa";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 돌려주는 결정적 RandomSource 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("chooseRandomMukjjippaHand", () => {
  it("nextInt(3) 값 0/1/2를 rock/paper/scissors에 매핑한다", () => {
    expect(chooseRandomMukjjippaHand(fixedRng(0))).toBe("rock");
    expect(chooseRandomMukjjippaHand(fixedRng(1))).toBe("paper");
    expect(chooseRandomMukjjippaHand(fixedRng(2))).toBe("scissors");
  });

  it("nextInt에 손 개수(3)를 maxExclusive로 넘긴다", () => {
    let seen = -1;
    const rng: RandomSource = {
      nextInt(maxExclusive: number): number {
        seen = maxExclusive;
        return 0;
      },
    };
    chooseRandomMukjjippaHand(rng);
    expect(seen).toBe(3);
  });

  it("범위 밖 인덱스를 주면 throw 한다", () => {
    expect(() => chooseRandomMukjjippaHand(fixedRng(3))).toThrow();
    expect(() => chooseRandomMukjjippaHand(fixedRng(-1))).toThrow();
  });
});

describe("playMukjjippaTurn", () => {
  it("선공 결정 단계: 무승부면 attacker null 유지(미종료)", () => {
    const state = createMukjjippaGame();
    const result = playMukjjippaTurn(state, "rock", "rock");
    expect(result.a).toBe("rock");
    expect(result.b).toBe("rock");
    expect(result.state).toEqual({
      attacker: null,
      finished: false,
      winner: null,
    });
  });

  it("선공 결정 단계: 승부가 나면 이긴 쪽이 attacker(미종료)", () => {
    const state = createMukjjippaGame();
    // rock > scissors → a 승
    const aWin = playMukjjippaTurn(state, "rock", "scissors");
    expect(aWin.state).toEqual({ attacker: "a", finished: false, winner: null });

    // scissors < rock → b 승
    const bWin = playMukjjippaTurn(state, "scissors", "rock");
    expect(bWin.state).toEqual({ attacker: "b", finished: false, winner: null });
  });

  it("공격자 결정 후 같은 손이면 공격자 승리로 종료", () => {
    const state: MukjjippaState = { attacker: "a", finished: false, winner: null };
    const result = playMukjjippaTurn(state, "rock", "rock");
    expect(result.state).toEqual({ attacker: "a", finished: true, winner: "a" });
  });

  it("공격자 결정 후 다른 손이면 라운드 승자가 새 공격자(공격권 이동, 미종료)", () => {
    const state: MukjjippaState = { attacker: "a", finished: false, winner: null };
    // rock < paper → b 승 → 공격권 b로 이동
    const result = playMukjjippaTurn(state, "rock", "paper");
    expect(result.state).toEqual({ attacker: "b", finished: false, winner: null });
  });

  it("finished 상태 입력 시 불변 반환(입력 손은 그대로 echo)", () => {
    const state: MukjjippaState = { attacker: "b", finished: true, winner: "b" };
    const result = playMukjjippaTurn(state, "rock", "scissors");
    expect(result.a).toBe("rock");
    expect(result.b).toBe("scissors");
    expect(result.state).toEqual(state);
    expect(result.state).not.toBe(state); // 새 객체(불변)
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = createMukjjippaGame();
    const snapshot = { ...state };
    playMukjjippaTurn(state, "rock", "scissors");
    expect(state).toEqual(snapshot);
  });
});
