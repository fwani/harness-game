import { describe, expect, it } from "vitest";

import type { Hand } from "./rps";
import {
  applyMukjjippaRound,
  createMukjjippaGame,
  type MukjjippaState,
} from "./mukjjippa";

const HANDS: Hand[] = ["rock", "paper", "scissors"];

/** a 기준으로 이기는 손(a가 이김): rock>scissors, scissors>paper, paper>rock. */
const WINNING_AGAINST: Record<Hand, Hand> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

describe("createMukjjippaGame", () => {
  it("초기 상태는 공격자 미정·미종료·승자 없음", () => {
    expect(createMukjjippaGame()).toEqual({
      attacker: null,
      finished: false,
      winner: null,
    });
  });
});

describe("applyMukjjippaRound — 선공(공격자) 결정 단계", () => {
  it("같은 손이면 비김 → 공격자 미정 유지, 미종료", () => {
    for (const hand of HANDS) {
      const next = applyMukjjippaRound(createMukjjippaGame(), hand, hand);
      expect(next).toEqual({ attacker: null, finished: false, winner: null });
    }
  });

  it("a가 이기는 손이면 attacker=a, 미종료", () => {
    for (const hand of HANDS) {
      const next = applyMukjjippaRound(
        createMukjjippaGame(),
        hand,
        WINNING_AGAINST[hand],
      );
      expect(next).toEqual({ attacker: "a", finished: false, winner: null });
    }
  });

  it("b가 이기는 손이면 attacker=b, 미종료", () => {
    for (const hand of HANDS) {
      // a가 지는 손: b가 hand로 a의 WINNING_AGAINST[hand]를 이긴다.
      const next = applyMukjjippaRound(
        createMukjjippaGame(),
        WINNING_AGAINST[hand],
        hand,
      );
      expect(next).toEqual({ attacker: "b", finished: false, winner: null });
    }
  });
});

describe("applyMukjjippaRound — 공격자 설정 상태", () => {
  it("다른 손이면 라운드 승자가 새 공격자(공격권 이동), 미종료", () => {
    // 공격자 a인데 b가 이기는 손 → 공격권이 b로 이동.
    const stateAttackerA: MukjjippaState = {
      attacker: "a",
      finished: false,
      winner: null,
    };
    const moved = applyMukjjippaRound(stateAttackerA, "scissors", "rock");
    expect(moved).toEqual({ attacker: "b", finished: false, winner: null });

    // 공격자 b인데 a가 이기는 손 → 공격권이 a로 이동.
    const stateAttackerB: MukjjippaState = {
      attacker: "b",
      finished: false,
      winner: null,
    };
    const movedBack = applyMukjjippaRound(stateAttackerB, "rock", "scissors");
    expect(movedBack).toEqual({ attacker: "a", finished: false, winner: null });
  });

  it("같은 손이면 현재 공격자가 그 자리에서 승리로 종료", () => {
    for (const attacker of ["a", "b"] as const) {
      for (const hand of HANDS) {
        const next = applyMukjjippaRound(
          { attacker, finished: false, winner: null },
          hand,
          hand,
        );
        expect(next).toEqual({ attacker, finished: true, winner: attacker });
      }
    }
  });
});

describe("applyMukjjippaRound — 손 3종 조합과 양쪽 공격자 대칭성", () => {
  it("모든 손 조합·양쪽 공격자에서 결과가 규칙과 일치한다", () => {
    for (const attacker of ["a", "b"] as const) {
      for (const a of HANDS) {
        for (const b of HANDS) {
          const next = applyMukjjippaRound(
            { attacker, finished: false, winner: null },
            a,
            b,
          );
          if (a === b) {
            // 같은 손 → 현재 공격자 승리.
            expect(next).toEqual({ attacker, finished: true, winner: attacker });
          } else {
            // 다른 손 → 이긴 쪽이 새 공격자.
            const expected = WINNING_AGAINST[a] === b ? "a" : "b";
            expect(next).toEqual({
              attacker: expected,
              finished: false,
              winner: null,
            });
          }
        }
      }
    }
  });
});

describe("applyMukjjippaRound — 종료/불변성", () => {
  it("이미 finished인 상태에 라운드를 더 적용해도 상태가 그대로", () => {
    const finished: MukjjippaState = {
      attacker: "a",
      finished: true,
      winner: "a",
    };
    const next = applyMukjjippaRound(finished, "rock", "scissors");
    expect(next).toEqual(finished);
    expect(next).not.toBe(finished); // 새 객체 반환(불변)
  });

  it("입력 state 객체를 변형하지 않는다(불변성)", () => {
    const initial = createMukjjippaGame();
    const snapshot = { ...initial };
    applyMukjjippaRound(initial, "rock", "scissors");
    expect(initial).toEqual(snapshot);

    const attackerState: MukjjippaState = {
      attacker: "a",
      finished: false,
      winner: null,
    };
    const attackerSnapshot = { ...attackerState };
    applyMukjjippaRound(attackerState, "rock", "rock");
    expect(attackerState).toEqual(attackerSnapshot);
  });
});
