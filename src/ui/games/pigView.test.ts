import { describe, it, expect } from "vitest";
import { createPigGame, type PigState } from "../../domain/pig";
import type { RandomSource } from "../../application/dealCards";
import {
  PIG_CPU,
  PIG_HUMAN,
  describePigStatus,
  formatPigCpuLog,
  pigDieLabel,
  pigGoalLabel,
  pigPlayerLabel,
  pigScoreLabel,
  pigTurnLabel,
  pigTurnTotalLabel,
  pigWinSide,
  runCpuPigTurn,
} from "./pigView";

/**
 * 주사위 눈(1..6) 시퀀스를 받아 rollPigDie가 기대하는 nextInt(=die-1)을 순서대로 돌려주는 스텁.
 * 결정적 테스트를 위해 application에 주입하던 RandomSource를 그대로 모킹한다.
 */
function scriptedRng(dice: number[]): RandomSource {
  let i = 0;
  return {
    nextInt: (maxExclusive: number) => {
      const die = dice[i];
      i += 1;
      if (die === undefined) {
        throw new Error("scriptedRng: 굴림 시퀀스 소진");
      }
      if (maxExclusive !== 6) {
        throw new Error(`scriptedRng: 예상치 못한 maxExclusive ${maxExclusive}`);
      }
      return die - 1;
    },
  };
}

describe("pigPlayerLabel / 차례·점수 라벨", () => {
  it("사람=나, CPU=CPU 로 라벨링한다", () => {
    expect(pigPlayerLabel(PIG_HUMAN)).toBe("나");
    expect(pigPlayerLabel(PIG_CPU)).toBe("CPU");
  });

  it("진행 중엔 현재 차례를, 종료 시엔 승자를 표시한다", () => {
    const game = createPigGame();
    expect(pigTurnLabel(game)).toBe("나 차례");
    const cpuTurn: PigState = { ...game, turn: "b" };
    expect(pigTurnLabel(cpuTurn)).toBe("CPU 차례");
    const won: PigState = { ...game, winner: "a" };
    expect(pigTurnLabel(won)).toBe("나 승리");
  });

  it("이번 턴 누계·총점·목표 라벨을 만든다", () => {
    const state: PigState = {
      scores: { a: 42, b: 17 },
      turn: "a",
      turnTotal: 8,
      target: 100,
      winner: null,
    };
    expect(pigTurnTotalLabel(state)).toBe("이번 턴 누계 8점");
    expect(pigScoreLabel(state, "a")).toBe("나 42점");
    expect(pigScoreLabel(state, "b")).toBe("CPU 17점");
    expect(pigGoalLabel(state)).toBe("목표 100점");
  });
});

describe("pigDieLabel", () => {
  it("점 기호 + 숫자를 함께 표시한다(색 비의존)", () => {
    expect(pigDieLabel(1)).toBe("⚀ 1");
    expect(pigDieLabel(3)).toBe("⚂ 3");
    expect(pigDieLabel(6)).toBe("⚅ 6");
  });

  it("범위 밖 눈은 조용히 무시하지 않고 throw한다", () => {
    expect(() => pigDieLabel(0)).toThrow();
    expect(() => pigDieLabel(7)).toThrow();
  });
});

describe("describePigStatus / pigWinSide", () => {
  it("진행 중엔 차례별 안내, 종료 시엔 승패 문구를 준다", () => {
    const game = createPigGame();
    expect(describePigStatus(game)).toContain("굴리기");
    expect(describePigStatus({ ...game, turn: "b" })).toContain("CPU");
    expect(describePigStatus({ ...game, winner: "a" })).toContain("승리");
    expect(describePigStatus({ ...game, winner: "b" })).toContain("패배");
  });

  it("승자를 기록용 a/b로 변환한다", () => {
    expect(pigWinSide("a")).toBe("a");
    expect(pigWinSide("b")).toBe("b");
  });
});

describe("formatPigCpuLog", () => {
  it("굴림/버스트/멈춤을 한국어로 포매팅한다", () => {
    expect(formatPigCpuLog({ kind: "roll", die: 4 })).toBe("굴림 ⚃ 4");
    expect(formatPigCpuLog({ kind: "bust", die: 1 })).toContain("버스트");
    expect(formatPigCpuLog({ kind: "hold", gained: 23 })).toContain("+23점");
  });
});

describe("runCpuPigTurn", () => {
  it("CPU 차례가 아니거나 종료 상태면 아무 것도 하지 않는다", () => {
    const humanTurn = createPigGame(); // turn === "a"
    const rng = scriptedRng([]);
    const result = runCpuPigTurn(humanTurn, rng);
    expect(result.state).toBe(humanTurn);
    expect(result.log).toEqual([]);
  });

  it("기본 holdAt(20) 도달 전까지 굴리다 멈추고 점수를 확정한 뒤 사람 차례로 넘긴다", () => {
    // CPU 차례에서 5,5,5,5(=누계 20)를 굴리면 holdAt 도달 → 멈춤.
    const cpuStart: PigState = {
      scores: { a: 0, b: 0 },
      turn: "b",
      turnTotal: 0,
      target: 100,
      winner: null,
    };
    const rng = scriptedRng([5, 5, 5, 5]);
    const { state, log } = runCpuPigTurn(cpuStart, rng);
    // 굴림 4번 후 멈춤. (4번째 굴림으로 누계 20 → 다음 결정에서 hold)
    expect(log.filter((e) => e.kind === "roll")).toHaveLength(4);
    const last = log[log.length - 1];
    expect(last).toEqual({ kind: "hold", gained: 20 });
    // 멈춤으로 b 총점 20 확정, 미달이라 사람(a) 차례로 전환.
    expect(state.scores.b).toBe(20);
    expect(state.turn).toBe("a");
    expect(state.turnTotal).toBe(0);
    expect(state.winner).toBeNull();
  });

  it("굴려서 1이 나오면 버스트로 누계 소멸 후 사람 차례로 넘기고 종료한다", () => {
    const cpuStart: PigState = {
      scores: { a: 0, b: 0 },
      turn: "b",
      turnTotal: 0,
      target: 100,
      winner: null,
    };
    // 4 굴린 뒤 1(버스트).
    const rng = scriptedRng([4, 1]);
    const { state, log } = runCpuPigTurn(cpuStart, rng);
    expect(log).toEqual([
      { kind: "roll", die: 4 },
      { kind: "bust", die: 1 },
    ]);
    expect(state.scores.b).toBe(0);
    expect(state.turn).toBe("a");
  });

  it("멈춤으로 목표에 도달하면 CPU 승리로 종료한다", () => {
    const cpuStart: PigState = {
      scores: { a: 0, b: 95 },
      turn: "b",
      turnTotal: 0,
      target: 100,
      winner: null,
    };
    // 5를 굴리면 누계 5 → 총점 100 도달 예상이라 다음 결정에서 hold.
    const rng = scriptedRng([5]);
    const { state, log } = runCpuPigTurn(cpuStart, rng);
    expect(state.winner).toBe("b");
    expect(state.scores.b).toBe(100);
    expect(log[log.length - 1]).toEqual({ kind: "hold", gained: 5 });
  });

  it("입력 상태를 변형하지 않는다(불변)", () => {
    const cpuStart: PigState = {
      scores: { a: 0, b: 0 },
      turn: "b",
      turnTotal: 0,
      target: 100,
      winner: null,
    };
    const snapshot = JSON.parse(JSON.stringify(cpuStart));
    runCpuPigTurn(cpuStart, scriptedRng([5, 5, 5, 5]));
    expect(cpuStart).toEqual(snapshot);
  });
});
