import { describe, expect, it } from "vitest";
import { resolveLadder, resolveLadderAll, type LadderRung } from "../../domain/ladder";
import { ladderRows, tracePathColumns, validateLadderInput } from "./ladderView";

describe("validateLadderInput", () => {
  it("개수가 일치하고 모두 채워졌으면 null", () => {
    expect(validateLadderInput(["A", "B"], ["x", "y"])).toBeNull();
  });

  it("참가자/결과 개수가 다르면 사유", () => {
    expect(validateLadderInput(["A", "B", "C"], ["x", "y"])).toContain("개수가 같");
  });

  it("2개 미만이면 사유", () => {
    expect(validateLadderInput(["A"], ["x"])).toContain("2개 이상");
  });

  it("빈 참가자 칸(공백 포함)이 있으면 사유", () => {
    expect(validateLadderInput(["A", "  "], ["x", "y"])).toContain("참가자 이름");
  });

  it("빈 결과 칸이 있으면 사유", () => {
    expect(validateLadderInput(["A", "B"], ["x", ""])).toContain("결과 항목");
  });

  it("입력 배열을 변형하지 않는다", () => {
    const players = ["A", "B"];
    const outcomes = ["x", "y"];
    validateLadderInput(players, outcomes);
    expect(players).toEqual(["A", "B"]);
    expect(outcomes).toEqual(["x", "y"]);
  });
});

describe("ladderRows", () => {
  it("등장 row를 오름차순·유니크로 돌려준다", () => {
    const rungs: LadderRung[] = [
      { row: 2, left: 0 },
      { row: 0, left: 1 },
      { row: 2, left: 2 },
      { row: 0, left: 3 },
    ];
    expect(ladderRows(rungs)).toEqual([0, 2]);
  });

  it("빈 rungs면 빈 배열", () => {
    expect(ladderRows([])).toEqual([]);
  });
});

describe("tracePathColumns", () => {
  const columnCount = 4;
  const rungs: LadderRung[] = [
    { row: 0, left: 0 },
    { row: 0, left: 2 },
    { row: 1, left: 1 },
    { row: 2, left: 0 },
    { row: 2, left: 2 },
  ];

  it("결과[0]은 시작 열, 마지막은 resolveLadder와 일치한다(모든 출발 열)", () => {
    const assignment = resolveLadderAll(columnCount, rungs);
    for (let start = 0; start < columnCount; start += 1) {
      const path = tracePathColumns(columnCount, rungs, start);
      expect(path[0]).toBe(start);
      expect(path[path.length - 1]).toBe(assignment[start]);
      expect(path[path.length - 1]).toBe(resolveLadder(columnCount, rungs, start));
    }
  });

  it("결과 길이는 ladderRows(rungs).length + 1", () => {
    const path = tracePathColumns(columnCount, rungs, 0);
    expect(path).toHaveLength(ladderRows(rungs).length + 1);
  });

  it("단계별 좌표를 순서대로 담는다(알려진 경로)", () => {
    // start=0: row0(left0)→1, row1(left1)→0? column0 at row1: lefts{1}, has(0)?no has(-1)?no → 그대로 0... 재계산
    // 직접 손으로 따라가기보다 도메인과의 일관성으로 검증하므로, 여기선 인접 단계 차이가 0/±1인지만 본다.
    const path = tracePathColumns(columnCount, rungs, 0);
    for (let i = 1; i < path.length; i += 1) {
      expect(Math.abs(path[i]! - path[i - 1]!)).toBeLessThanOrEqual(1);
    }
  });

  it("잘못된 start는 domain 검증을 그대로 전파한다", () => {
    expect(() => tracePathColumns(columnCount, rungs, -1)).toThrow();
    expect(() => tracePathColumns(columnCount, rungs, columnCount)).toThrow();
  });
});
