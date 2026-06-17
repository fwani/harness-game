import { describe, it, expect } from "vitest";
import {
  MUKJJIPPA_HANDS,
  mukjjippaHandLabel,
  mukjjippaPlayerLabel,
  mukjjippaStageLabel,
  mukjjippaAttackerLabel,
  mukjjippaOutcomeLabel,
  mukjjippaWinSide,
  playMukjjippaCpuRound,
} from "./mukjjippaView";
import { createMukjjippaGame, type MukjjippaState } from "../../domain/mukjjippa";
import type { RandomSource } from "../../application/dealCards";

/** 미리 정한 인덱스 수열을 순서대로 반환하는 결정적 스텁(CPU 손 구동). */
function queueRng(indices: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      const v = indices[i] ?? 0;
      i += 1;
      return v;
    },
  };
}

describe("mukjjippaView 라벨 헬퍼", () => {
  it("손 메타는 묵/찌/빠 3개이며 라벨+기호로 표기한다(색 비의존)", () => {
    expect(MUKJJIPPA_HANDS.map((h) => h.label)).toEqual(["묵", "찌", "빠"]);
    expect(mukjjippaHandLabel("rock")).toBe("묵(✊)");
    expect(mukjjippaHandLabel("scissors")).toBe("찌(✌️)");
    expect(mukjjippaHandLabel("paper")).toBe("빠(✋)");
  });

  it("플레이어 라벨은 a=사람 / b=CPU", () => {
    expect(mukjjippaPlayerLabel("a")).toBe("사람");
    expect(mukjjippaPlayerLabel("b")).toBe("CPU");
  });

  it("단계 라벨: 선공 미정/공격 중/종료", () => {
    expect(mukjjippaStageLabel({ attacker: null, finished: false, winner: null })).toBe(
      "선공 결정 중 (가위바위보)",
    );
    expect(mukjjippaStageLabel({ attacker: "a", finished: false, winner: null })).toBe(
      "공격 중",
    );
    expect(mukjjippaStageLabel({ attacker: "a", finished: true, winner: "a" })).toBe(
      "종료",
    );
  });

  it("공격자 라벨: 미정/사람/CPU", () => {
    expect(mukjjippaAttackerLabel({ attacker: null, finished: false, winner: null })).toBe(
      "미정",
    );
    expect(mukjjippaAttackerLabel({ attacker: "a", finished: false, winner: null })).toBe(
      "사람",
    );
    expect(mukjjippaAttackerLabel({ attacker: "b", finished: false, winner: null })).toBe(
      "CPU",
    );
  });

  it("종료 안내·전적 side: 사람 승=a / CPU 승=b, 미종료면 null", () => {
    const humanWin: MukjjippaState = { attacker: "a", finished: true, winner: "a" };
    const cpuWin: MukjjippaState = { attacker: "b", finished: true, winner: "b" };
    const playing: MukjjippaState = { attacker: "a", finished: false, winner: null };
    expect(mukjjippaOutcomeLabel(humanWin)).toBe("사람 승리! 🎉");
    expect(mukjjippaOutcomeLabel(cpuWin)).toBe("CPU 승리! 😢");
    expect(mukjjippaOutcomeLabel(playing)).toBeNull();
    expect(mukjjippaWinSide(humanWin)).toBe("a");
    expect(mukjjippaWinSide(cpuWin)).toBe("b");
    expect(mukjjippaWinSide(playing)).toBeNull();
  });
});

describe("playMukjjippaCpuRound 흐름(선공 결정→공격자 전환→같은 손 종료)", () => {
  it("선공 결정: 사람 rock vs CPU scissors → 사람이 공격자", () => {
    const start = createMukjjippaGame();
    // CPU 손: idx 2 = scissors. rock > scissors → 사람(a) 승 → attacker a.
    const { a, b, state } = playMukjjippaCpuRound(start, "rock", queueRng([2]));
    expect(a).toBe("rock");
    expect(b).toBe("scissors");
    expect(state.attacker).toBe("a");
    expect(state.finished).toBe(false);
  });

  it("공격자 결정 후 다른 손이면 공격권이 라운드 승자에게 이동", () => {
    const attacking: MukjjippaState = { attacker: "a", finished: false, winner: null };
    // 사람 scissors vs CPU rock(idx 0) → CPU(b) 승 → 공격권 b로 이동(미종료).
    const { state } = playMukjjippaCpuRound(attacking, "scissors", queueRng([0]));
    expect(state.attacker).toBe("b");
    expect(state.finished).toBe(false);
  });

  it("선공 결정→공격 유지→같은 손이면 공격자(사람) 승으로 종료, 전적 side=a", () => {
    let state = createMukjjippaGame();
    // 1라운드(선공 결정): 사람 rock vs CPU scissors(idx2) → attacker a.
    // 2라운드(공격 중): 사람 rock vs CPU scissors(idx2) → 다른 손, a 승 → attacker 유지 a.
    // 3라운드(공격 중): 사람 rock vs CPU rock(idx0) → 같은 손 → 공격자 a 승리로 종료.
    const rng = queueRng([2, 2, 0]);

    state = playMukjjippaCpuRound(state, "rock", rng).state;
    expect(state.attacker).toBe("a");
    expect(state.finished).toBe(false);

    state = playMukjjippaCpuRound(state, "rock", rng).state;
    expect(state.attacker).toBe("a");
    expect(state.finished).toBe(false);

    state = playMukjjippaCpuRound(state, "rock", rng).state;
    expect(state.finished).toBe(true);
    expect(state.winner).toBe("a");
    expect(mukjjippaWinSide(state)).toBe("a"); // recordGame(...,"a")로 전적 저장됨
    expect(mukjjippaOutcomeLabel(state)).toBe("사람 승리! 🎉");
  });

  it("종료 상태에 추가 입력하면 불변으로 반환(입력 차단 동작 근거)", () => {
    const finished: MukjjippaState = { attacker: "b", finished: true, winner: "b" };
    const { state } = playMukjjippaCpuRound(finished, "rock", queueRng([0]));
    expect(state).toBe(finished);
  });
});
