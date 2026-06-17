import { describe, it, expect } from "vitest";
import { resolveLadder, resolveLadderAll, type LadderRung } from "./ladder";

describe("resolveLadder", () => {
  it("가로줄이 없으면 항등 배정(출발 열 = 도착 열)", () => {
    expect(resolveLadder(3, [], 0)).toBe(0);
    expect(resolveLadder(3, [], 1)).toBe(1);
    expect(resolveLadder(3, [], 2)).toBe(2);
  });

  it("단일 rung로 두 열 스왑", () => {
    const rungs: LadderRung[] = [{ row: 0, left: 0 }];
    expect(resolveLadder(3, rungs, 0)).toBe(1);
    expect(resolveLadder(3, rungs, 1)).toBe(0);
    expect(resolveLadder(3, rungs, 2)).toBe(2); // 닿지 않는 열은 그대로
  });

  it("여러 row를 거쳐 경로를 추적한다", () => {
    // 4열. row0: 0-1 스왑, row1: 1-2 스왑, row2: 2-3 스왑.
    const rungs: LadderRung[] = [
      { row: 0, left: 0 },
      { row: 1, left: 1 },
      { row: 2, left: 2 },
    ];
    // 0열: row0에서 1로, row1에서 2로, row2에서 3으로 → 3
    expect(resolveLadder(4, rungs, 0)).toBe(3);
    // 1열: row0에서 0으로, 이후 닿는 가로줄 없음 → 0
    expect(resolveLadder(4, rungs, 1)).toBe(0);
  });

  it("row 순서는 정렬되어 적용된다(입력 순서 무관)", () => {
    const rungs: LadderRung[] = [
      { row: 2, left: 2 },
      { row: 0, left: 0 },
      { row: 1, left: 1 },
    ];
    expect(resolveLadder(4, rungs, 0)).toBe(3);
  });

  it("범위 밖/잘못된 columnCount면 throw", () => {
    expect(() => resolveLadder(1, [], 0)).toThrow();
    expect(() => resolveLadder(2.5, [], 0)).toThrow();
    expect(() => resolveLadder(NaN, [], 0)).toThrow();
  });

  it("범위 밖 left/row면 throw", () => {
    expect(() => resolveLadder(3, [{ row: 0, left: 2 }], 0)).toThrow(); // left 최대 columnCount-2=1
    expect(() => resolveLadder(3, [{ row: 0, left: -1 }], 0)).toThrow();
    expect(() => resolveLadder(3, [{ row: -1, left: 0 }], 0)).toThrow();
    expect(() => resolveLadder(3, [{ row: 0.5, left: 0 }], 0)).toThrow();
    expect(() => resolveLadder(3, [{ row: 0, left: 0.5 }], 0)).toThrow();
  });

  it("범위 밖/잘못된 startColumn이면 throw", () => {
    expect(() => resolveLadder(3, [], -1)).toThrow();
    expect(() => resolveLadder(3, [], 3)).toThrow();
    expect(() => resolveLadder(3, [], 1.5)).toThrow();
  });

  it("같은 row에서 노드를 공유하는(인접/중복) 가로줄이면 throw", () => {
    // 인접: left 0과 left 1이 같은 row → 열 1을 공유
    expect(() => resolveLadder(4, [{ row: 0, left: 0 }, { row: 0, left: 1 }], 0)).toThrow();
    // 중복: 같은 left 두 번
    expect(() => resolveLadder(4, [{ row: 0, left: 1 }, { row: 0, left: 1 }], 0)).toThrow();
    // 다른 row의 인접 가로줄은 허용
    expect(() =>
      resolveLadder(4, [{ row: 0, left: 0 }, { row: 1, left: 1 }], 0),
    ).not.toThrow();
    // 같은 row라도 떨어진 가로줄은 허용
    expect(() =>
      resolveLadder(4, [{ row: 0, left: 0 }, { row: 0, left: 2 }], 0),
    ).not.toThrow();
  });

  it("입력 배열/객체를 변형하지 않는다", () => {
    const rungs: LadderRung[] = [
      { row: 1, left: 1 },
      { row: 0, left: 0 },
    ];
    const snapshot = JSON.parse(JSON.stringify(rungs));
    resolveLadder(4, rungs, 0);
    expect(rungs).toEqual(snapshot);
  });
});

describe("resolveLadderAll", () => {
  it("가로줄이 없으면 항등 순열", () => {
    expect(resolveLadderAll(3, [])).toEqual([0, 1, 2]);
  });

  it("결과는 항상 0..columnCount-1의 순열", () => {
    const rungs: LadderRung[] = [
      { row: 0, left: 0 },
      { row: 1, left: 1 },
      { row: 2, left: 2 },
      { row: 3, left: 0 },
    ];
    const result = resolveLadderAll(4, rungs);
    expect(result).toHaveLength(4);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("단일 rung는 두 열만 스왑한 순열", () => {
    expect(resolveLadderAll(4, [{ row: 0, left: 1 }])).toEqual([0, 2, 1, 3]);
  });

  it("잘못된 입력이면 throw", () => {
    expect(() => resolveLadderAll(1, [])).toThrow();
    expect(() => resolveLadderAll(3, [{ row: 0, left: 2 }])).toThrow();
  });
});
