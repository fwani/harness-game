import { describe, it, expect } from "vitest";
import {
  isCpuTurn,
  chooseCpuJanggiMove,
  noMovesOutcome,
  janggiOutcome,
  janggiWinSide,
  janggiCpuWinSide,
  opponentSide,
  CPU_SIDE,
  HUMAN_SIDE,
} from "./janggiCpuView";
import {
  startGame,
  applyMove,
  legalMoves,
  type JanggiState,
} from "../../application/playJanggi";
import type { RandomSource } from "../../application/dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/** 종료 상태를 직접 구성하기 위한 헬퍼(보드는 시작 보드 재사용 — 매핑 함수는 보드를 보지 않는다). */
function finishedState(
  overrides: Partial<JanggiState>,
): JanggiState {
  return { ...startGame(), finished: true, ...overrides };
}

describe("isCpuTurn", () => {
  it("시작 상태(초 차례)에서는 CPU 차례가 아니다", () => {
    expect(isCpuTurn(startGame())).toBe(false);
  });

  it("사람(초)이 한 수 두면 CPU(한) 차례가 된다", () => {
    const first = legalMoves(startGame())[0]!;
    const next = applyMove(startGame(), first.from, first.to);
    expect(next.next).toBe(CPU_SIDE);
    expect(isCpuTurn(next)).toBe(true);
  });

  it("종료 상태면 CPU 차례가 아니다", () => {
    expect(isCpuTurn(finishedState({ next: CPU_SIDE }))).toBe(false);
  });

  it("cpuSide를 초로 주입하면(사람=한) 초 차례가 CPU 차례다", () => {
    // 시작 상태는 초 차례 → 사람이 한이면 그때가 CPU(초) 차례.
    expect(isCpuTurn(startGame(), "cho")).toBe(true);
  });
});

describe("opponentSide", () => {
  it("초↔한 반대 진영을 돌려준다", () => {
    expect(opponentSide("cho")).toBe("han");
    expect(opponentSide("han")).toBe("cho");
  });
});

describe("chooseCpuJanggiMove", () => {
  it("합법 수가 있으면 결정적 인덱스의 한 수를 반환한다", () => {
    const state = startGame();
    const candidates = legalMoves(state);
    const move = chooseCpuJanggiMove(state, fixedRng(0));
    expect(move).toEqual(candidates[0]);
  });

  it("CPU(한) 차례에서 한 진영의 합법 수를 반환한다", () => {
    const first = legalMoves(startGame())[0]!;
    const cpuTurnState = applyMove(startGame(), first.from, first.to);
    const move = chooseCpuJanggiMove(cpuTurnState, fixedRng(0));
    expect(move).not.toBeNull();
    // 반환된 from 칸은 CPU(한) 기물이어야 한다.
    const piece = cpuTurnState.board[move!.from.y]![move!.from.x];
    expect(piece?.side).toBe(CPU_SIDE);
  });

  it("종료 상태면 null을 반환한다", () => {
    expect(chooseCpuJanggiMove(finishedState({}), fixedRng(0))).toBeNull();
  });

  it("입력 state를 변형하지 않는다", () => {
    const state = startGame();
    const snapshot = JSON.stringify(state);
    chooseCpuJanggiMove(state, fixedRng(0));
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("noMovesOutcome", () => {
  it("현재 차례의 상대를 승자로 종료한다(한 차례 → 초 승)", () => {
    const stuck = { ...startGame(), next: CPU_SIDE };
    const out = noMovesOutcome(stuck);
    expect(out.finished).toBe(true);
    expect(out.winner).toBe(HUMAN_SIDE);
    expect(out.endReason).toBe("checkmate");
  });

  it("입력 state를 변형하지 않는다(새 객체 반환)", () => {
    const state = startGame();
    const out = noMovesOutcome(state);
    expect(out).not.toBe(state);
    expect(state.finished).toBe(false);
  });
});

describe("janggiOutcome", () => {
  it("미종료면 finished=false, text=null", () => {
    const out = janggiOutcome(startGame(), "cpu");
    expect(out).toEqual({ finished: false, draw: false, text: null });
  });

  it("빅장은 무승부로 매핑한다", () => {
    const out = janggiOutcome(
      finishedState({ winner: null, endReason: "bikjang" }),
      "cpu",
    );
    expect(out.draw).toBe(true);
    expect(out.text).toContain("무승부");
  });

  it("cpu 모드: 사람(초) 승은 '나' 관점 문구", () => {
    const out = janggiOutcome(
      finishedState({ winner: "cho", endReason: "checkmate" }),
      "cpu",
    );
    expect(out.text).toContain("나(초) 승리");
    expect(out.text).toContain("외통수");
  });

  it("cpu 모드: 한 승은 'CPU' 승리 문구(포획 사유)", () => {
    const out = janggiOutcome(
      finishedState({ winner: "han", endReason: "capture" }),
      "cpu",
    );
    expect(out.text).toContain("CPU(한) 승리");
    expect(out.text).toContain("포획");
  });

  it("local 모드: 진영명으로 승자 표시", () => {
    const out = janggiOutcome(
      finishedState({ winner: "han", endReason: "checkmate" }),
      "local",
    );
    expect(out.text).toContain("한(漢) 승리");
  });

  it("cpu 모드 + 사람=한: 한 승은 '나(한)', 초 승은 'CPU(초)'", () => {
    const humanWin = janggiOutcome(
      finishedState({ winner: "han", endReason: "checkmate" }),
      "cpu",
      "han",
    );
    expect(humanWin.text).toContain("나(한) 승리");
    const cpuWin = janggiOutcome(
      finishedState({ winner: "cho", endReason: "capture" }),
      "cpu",
      "han",
    );
    expect(cpuWin.text).toContain("CPU(초) 승리");
  });
});

describe("janggiCpuWinSide", () => {
  it("사람 진영 승=a, CPU 승=b, 무승부=draw (사람=초)", () => {
    expect(janggiCpuWinSide(finishedState({ winner: "cho" }), "cho")).toBe("a");
    expect(janggiCpuWinSide(finishedState({ winner: "han" }), "cho")).toBe("b");
    expect(janggiCpuWinSide(finishedState({ winner: null }), "cho")).toBe("draw");
  });

  it("사람=한이면 승/패 위치가 뒤집혀도 '나' 관점(a)을 보존한다", () => {
    expect(janggiCpuWinSide(finishedState({ winner: "han" }), "han")).toBe("a");
    expect(janggiCpuWinSide(finishedState({ winner: "cho" }), "han")).toBe("b");
  });
});

describe("janggiWinSide", () => {
  it("초 승=a, 한 승=b, 무승부=draw", () => {
    expect(janggiWinSide(finishedState({ winner: "cho" }))).toBe("a");
    expect(janggiWinSide(finishedState({ winner: "han" }))).toBe("b");
    expect(janggiWinSide(finishedState({ winner: null }))).toBe("draw");
  });
});
