import { describe, expect, it } from "vitest";
import {
  createKenKen,
  setKenKenValue,
  type KenKenPuzzle,
} from "../../domain/kenken";
import {
  cageAnchor,
  cageClueText,
  cageIndexGrid,
  cageLabel,
  cellKey,
  kenkenCellLabel,
  kenkenCellViews,
  kenkenProgressLabel,
  kenkenStatusMessage,
  violationKeySet,
} from "./kenkenView";

// 3×3 — 케이지가 모든 칸을 덮는 단순 퍼즐(풀이가능성과 무관, 표시 헬퍼 검증용).
//   A: (0,0)(0,1) 곱 6  → 대표 (0,0) "6×"
//   B: (0,2)     단일 합 3 → 대표 (0,2) 고정값 "3"
//   C: (1,0)(2,0) 차 1  → 대표 (1,0) "1−"
//   D: (1,1)(1,2)(2,1)(2,2) 합 9 → 대표 (1,1) "9+"
const PUZZLE: KenKenPuzzle = {
  size: 3,
  cages: [
    { op: "mul", target: 6, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
    { op: "add", target: 3, cells: [{ row: 0, col: 2 }] },
    { op: "sub", target: 1, cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }] },
    {
      op: "add",
      target: 9,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
    },
  ],
};

describe("kenkenView.cellKey / violationKeySet", () => {
  it("좌표를 `row,col` 키로 변환한다", () => {
    expect(cellKey({ row: 2, col: 1 })).toBe("2,1");
  });

  it("위반 좌표 목록을 키 집합으로 모은다", () => {
    const set = violationKeySet([
      { row: 0, col: 0 },
      { row: 1, col: 2 },
    ]);
    expect(set.has("0,0")).toBe(true);
    expect(set.has("1,2")).toBe(true);
    expect(set.has("0,1")).toBe(false);
    expect(set.size).toBe(2);
  });

  it("빈 위반 목록은 빈 집합", () => {
    expect(violationKeySet([]).size).toBe(0);
  });
});

describe("kenkenView.kenkenStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(kenkenStatusMessage("playing")).toBe("진행 중");
    expect(kenkenStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 규칙·케이지에 맞게 채웠습니다",
    );
  });
});

describe("kenkenView.cageLabel / cageClueText", () => {
  it("여러 칸 케이지는 목표값+연산 기호(+, −, ×, ÷)", () => {
    expect(cageLabel("mul", 6, 2)).toBe("6×");
    expect(cageLabel("sub", 3, 2)).toBe("3−");
    expect(cageLabel("div", 2, 2)).toBe("2÷");
    expect(cageLabel("add", 5, 2)).toBe("5+");
  });

  it("단일 칸 케이지는 고정값만 표시한다", () => {
    expect(cageLabel("add", 4, 1)).toBe("4");
    expect(cageLabel("mul", 2, 1)).toBe("2");
  });

  it("접근성 문구는 단일/복수 케이지를 한국어로 구분한다", () => {
    expect(cageClueText("mul", 6, 2)).toBe("목표 6 곱하기");
    expect(cageClueText("sub", 1, 2)).toBe("목표 1 빼기");
    expect(cageClueText("div", 2, 2)).toBe("목표 2 나누기");
    expect(cageClueText("add", 5, 2)).toBe("목표 5 더하기");
    expect(cageClueText("add", 4, 1)).toBe("고정값 4");
  });
});

describe("kenkenView.cageAnchor", () => {
  it("좌상단(최소 행, 동률이면 최소 열) 칸을 고른다", () => {
    expect(
      cageAnchor([
        { row: 2, col: 2 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ]),
    ).toEqual({ row: 1, col: 1 });
  });
});

describe("kenkenView.cageIndexGrid", () => {
  it("각 칸에 케이지 인덱스를 채운다(모든 칸이 케이지에 속함)", () => {
    const state = createKenKen(PUZZLE);
    const grid = cageIndexGrid(state);
    expect(grid[0]).toEqual([0, 0, 1]);
    expect(grid[1]).toEqual([2, 3, 3]);
    expect(grid[2]).toEqual([2, 3, 3]);
    // 미지정(-1)이 없어야 한다.
    expect(grid.flat().every((v) => v >= 0)).toBe(true);
  });
});

describe("kenkenView.kenkenCellLabel", () => {
  it("좌표 + 케이지 단서 + 값/위반을 색 비의존 텍스트로 노출한다", () => {
    expect(kenkenCellLabel({ row: 0, col: 0 }, null, "목표 6 곱하기")).toBe(
      "1행 1열, 케이지 목표 6 곱하기, 빈 칸",
    );
    expect(kenkenCellLabel({ row: 2, col: 1 }, 3, "목표 9 더하기")).toBe(
      "3행 2열, 케이지 목표 9 더하기, 입력 3",
    );
    expect(kenkenCellLabel({ row: 2, col: 1 }, 3, "목표 9 더하기", true)).toBe(
      "3행 2열, 케이지 목표 9 더하기, 입력 3, 위반",
    );
  });
});

describe("kenkenView.kenkenCellViews", () => {
  it("케이지 대표 칸에만 목표/연산 라벨을 그린다", () => {
    const state = createKenKen(PUZZLE);
    const views = kenkenCellViews(state, []);
    expect(views[0]![0]!.cageLabel).toBe("6×"); // A 대표
    expect(views[0]![1]!.cageLabel).toBe(""); // A 비대표
    expect(views[0]![2]!.cageLabel).toBe("3"); // B 단일 고정값
    expect(views[1]![0]!.cageLabel).toBe("1−"); // C 대표
    expect(views[1]![1]!.cageLabel).toBe("9+"); // D 대표
    expect(views[2]![2]!.cageLabel).toBe(""); // D 비대표
  });

  it("케이지 경계: 이웃이 다른 케이지/격자 밖인 방향만 굵게 표시한다", () => {
    const state = createKenKen(PUZZLE);
    const views = kenkenCellViews(state, []);
    // (0,0): 위/왼쪽 격자 밖 → 경계, 오른쪽 (0,1) 같은 케이지 A → 경계 아님, 아래 (1,0) 케이지 C → 경계.
    expect(views[0]![0]!.borders).toEqual({
      top: true,
      right: false,
      bottom: true,
      left: true,
    });
    // (0,1): 오른쪽 (0,2) 케이지 B → 경계, 왼쪽 (0,0) 같은 A → 경계 아님.
    expect(views[0]![1]!.borders).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: false,
    });
    // (1,1): 아래 (2,1)·오른쪽 (1,2) 모두 같은 케이지 D → 경계 아님.
    expect(views[1]![1]!.borders).toEqual({
      top: true,
      right: false,
      bottom: false,
      left: true,
    });
  });

  it("위반 좌표를 색 비의존 강조(violated + 라벨 '위반')로 매핑한다", () => {
    let state = createKenKen(PUZZLE);
    // 같은 행에 1을 두 번 → (0,0),(0,1) 행 중복 위반.
    state = setKenKenValue(state, { row: 0, col: 0 }, 1);
    state = setKenKenValue(state, { row: 0, col: 1 }, 1);
    const violations = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];
    const views = kenkenCellViews(state, violations);
    expect(views[0]![0]!.violated).toBe(true);
    expect(views[0]![0]!.label).toContain("위반");
    expect(views[0]![1]!.violated).toBe(true);
    // 위반 아닌 칸은 강조하지 않는다.
    expect(views[2]![2]!.violated).toBe(false);
    expect(views[2]![2]!.label).not.toContain("위반");
  });

  it("값/빈 칸의 표시 기호를 만든다", () => {
    let state = createKenKen(PUZZLE);
    state = setKenKenValue(state, { row: 0, col: 0 }, 2);
    const views = kenkenCellViews(state, []);
    expect(views[0]![0]!.symbol).toBe("2");
    expect(views[0]![1]!.symbol).toBe("");
  });
});

describe("kenkenView.kenkenProgressLabel", () => {
  it("채운 칸·남은 칸·위반 수를 한 줄로 요약한다", () => {
    let state = createKenKen(PUZZLE);
    expect(kenkenProgressLabel(state, 0)).toBe("채운 칸 0 · 남은 칸 9 · 위반 0");
    state = setKenKenValue(state, { row: 0, col: 0 }, 1);
    state = setKenKenValue(state, { row: 0, col: 1 }, 1);
    expect(kenkenProgressLabel(state, 2)).toBe("채운 칸 2 · 남은 칸 7 · 위반 2");
  });
});
