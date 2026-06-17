import { describe, expect, it } from "vitest";
import {
  applyHanoiMove,
  createHanoi,
  isHanoiSolved,
  isLegalHanoiMove,
  legalHanoiMoves,
  minHanoiMoves,
  type HanoiMove,
  type HanoiState,
} from "./hanoi";

describe("createHanoi", () => {
  it("모든 디스크를 0번 기둥에 큰 것이 바닥으로 쌓는다", () => {
    const state = createHanoi(3);
    expect(state.diskCount).toBe(3);
    expect(state.pegs).toEqual([[3, 2, 1], [], []]);
  });

  it("pegCount 기본 3, 지정하면 그 수만큼 빈 기둥을 만든다", () => {
    expect(createHanoi(2).pegs).toHaveLength(3);
    expect(createHanoi(2, 4).pegs).toEqual([[2, 1], [], [], []]);
  });

  it("디스크 1개도 유효하다", () => {
    expect(createHanoi(1).pegs).toEqual([[1], [], []]);
  });

  it("호출마다 독립 인스턴스를 반환한다", () => {
    const a = createHanoi(3);
    const b = createHanoi(3);
    expect(a).not.toBe(b);
    expect(a.pegs).not.toBe(b.pegs);
    a.pegs[0]!.push(99);
    expect(createHanoi(3).pegs[0]).toEqual([3, 2, 1]);
  });

  it("diskCount<1 또는 비정수면 throw", () => {
    expect(() => createHanoi(0)).toThrow();
    expect(() => createHanoi(-1)).toThrow();
    expect(() => createHanoi(2.5)).toThrow();
    expect(() => createHanoi(Number.NaN)).toThrow();
  });

  it("pegCount<1 또는 비정수면 throw", () => {
    expect(() => createHanoi(3, 0)).toThrow();
    expect(() => createHanoi(3, -2)).toThrow();
    expect(() => createHanoi(3, 2.5)).toThrow();
  });
});

describe("legalHanoiMoves", () => {
  it("초기 배치에서는 맨 위(가장 작은) 디스크만 두 기둥으로 옮길 수 있다", () => {
    // pegs = [[3,2,1], [], []] — 맨 위 디스크 1을 1번/2번 기둥(빈 곳)으로.
    expect(legalHanoiMoves(createHanoi(3))).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 2 },
    ]);
  });

  it("from 오름차순, 그 안에서 to 오름차순으로 결정적 열거", () => {
    // pegs[0]=[2] (위=2), pegs[1]=[3] (위=3), pegs[2]=[] 인 상태.
    const state: HanoiState = { pegs: [[2], [3], []], diskCount: 3 };
    expect(legalHanoiMoves(state)).toEqual([
      { from: 0, to: 1 }, // 2를 3 위에 → 합법
      { from: 0, to: 2 }, // 2를 빈 기둥 → 합법
      { from: 1, to: 2 }, // 3을 빈 기둥 → 합법 (3을 2 위에 두는 1→0은 불법이라 빠짐)
    ]);
  });

  it("빈 기둥에서 꺼내거나 큰 디스크를 작은 디스크 위에 올리는 수는 제외", () => {
    const state: HanoiState = { pegs: [[1], [3, 2], []], diskCount: 3 };
    const moves = legalHanoiMoves(state);
    // 1을 [3,2](위=2) 위에 → 합법, 1을 빈 기둥 → 합법.
    expect(moves).toContainEqual({ from: 0, to: 1 });
    expect(moves).toContainEqual({ from: 0, to: 2 });
    // 2(peg1 위)를 [1](위=1) 위에 → 불법(2>1).
    expect(moves).not.toContainEqual({ from: 1, to: 0 });
  });
});

describe("isLegalHanoiMove", () => {
  const state = createHanoi(3); // [[3,2,1],[],[]]

  it("맨 위 디스크를 빈 기둥/더 큰 디스크 위로 옮기는 수는 합법", () => {
    expect(isLegalHanoiMove(state, { from: 0, to: 1 })).toBe(true);
  });

  it("빈 기둥에서 꺼내는 수는 불법", () => {
    expect(isLegalHanoiMove(state, { from: 1, to: 2 })).toBe(false);
  });

  it("큰 디스크를 작은 디스크 위에 올리면 불법", () => {
    const s: HanoiState = { pegs: [[2], [1], []], diskCount: 2 };
    expect(isLegalHanoiMove(s, { from: 0, to: 1 })).toBe(false);
  });

  it("from==to(제자리)는 불법", () => {
    expect(isLegalHanoiMove(state, { from: 0, to: 0 })).toBe(false);
  });

  it("범위 밖·비정수 인덱스는 불법", () => {
    expect(isLegalHanoiMove(state, { from: -1, to: 1 })).toBe(false);
    expect(isLegalHanoiMove(state, { from: 0, to: 3 })).toBe(false);
    expect(isLegalHanoiMove(state, { from: 0.5, to: 1 })).toBe(false);
  });
});

describe("applyHanoiMove", () => {
  it("맨 위 디스크 한 개를 옮긴 새 상태를 반환한다", () => {
    const next = applyHanoiMove(createHanoi(3), { from: 0, to: 2 });
    expect(next.pegs).toEqual([[3, 2], [], [1]]);
  });

  it("입력 상태를 변형하지 않는다(불변)", () => {
    const state = createHanoi(3);
    const next = applyHanoiMove(state, { from: 0, to: 1 });
    expect(state.pegs).toEqual([[3, 2, 1], [], []]);
    expect(next).not.toBe(state);
    expect(next.pegs).not.toBe(state.pegs);
  });

  it("불법 수면 사유와 함께 throw", () => {
    const state = createHanoi(3);
    expect(() => applyHanoiMove(state, { from: 1, to: 2 })).toThrow(/하노이 불법 수/);
    const s2: HanoiState = { pegs: [[2], [1], []], diskCount: 2 };
    expect(() => applyHanoiMove(s2, { from: 0, to: 1 })).toThrow(/하노이 불법 수/);
    expect(() => applyHanoiMove(state, { from: 0, to: 9 })).toThrow();
  });
});

describe("isHanoiSolved", () => {
  it("모든 디스크가 마지막 기둥에 올바른 순서로 모이면 true", () => {
    const solved: HanoiState = { pegs: [[], [], [3, 2, 1]], diskCount: 3 };
    expect(isHanoiSolved(solved)).toBe(true);
  });

  it("targetPeg를 지정하면 그 기둥 기준으로 판정", () => {
    const onPeg1: HanoiState = { pegs: [[], [3, 2, 1], []], diskCount: 3 };
    expect(isHanoiSolved(onPeg1, 1)).toBe(true);
    expect(isHanoiSolved(onPeg1)).toBe(false); // 기본 마지막 기둥은 비어있음
  });

  it("초기 배치(0번 기둥에 전부)는 마지막 기둥 기준 미클리어", () => {
    expect(isHanoiSolved(createHanoi(3))).toBe(false);
  });

  it("범위 밖 targetPeg는 false", () => {
    const solved: HanoiState = { pegs: [[], [], [3, 2, 1]], diskCount: 3 };
    expect(isHanoiSolved(solved, 9)).toBe(false);
  });
});

describe("minHanoiMoves", () => {
  it("표준 3기둥 최소 이동 수 = 2^n - 1", () => {
    expect(minHanoiMoves(1)).toBe(1);
    expect(minHanoiMoves(3)).toBe(7);
    expect(minHanoiMoves(4)).toBe(15);
    expect(minHanoiMoves(0)).toBe(0);
  });

  it("음수·비정수는 throw", () => {
    expect(() => minHanoiMoves(-1)).toThrow();
    expect(() => minHanoiMoves(2.5)).toThrow();
  });
});

describe("3디스크 표준 최소 7수 풀이", () => {
  it("최소 수 시퀀스를 적용하면 마지막 기둥에 모여 클리어된다", () => {
    const moves: HanoiMove[] = [
      { from: 0, to: 2 },
      { from: 0, to: 1 },
      { from: 2, to: 1 },
      { from: 0, to: 2 },
      { from: 1, to: 0 },
      { from: 1, to: 2 },
      { from: 0, to: 2 },
    ];
    expect(moves).toHaveLength(minHanoiMoves(3));
    let state = createHanoi(3);
    for (const move of moves) {
      state = applyHanoiMove(state, move);
    }
    expect(isHanoiSolved(state)).toBe(true);
    expect(state.pegs).toEqual([[], [], [3, 2, 1]]);
  });

  it("풀이 도중에는 클리어가 아니다", () => {
    const state = applyHanoiMove(createHanoi(3), { from: 0, to: 2 });
    expect(isHanoiSolved(state)).toBe(false);
  });
});
