import { describe, expect, it } from "vitest";
import { createBinairo, type BinairoGrid } from "../../domain/binairo";
import {
  binairoCellLabel,
  binairoCellSymbol,
  binairoCellViews,
  binairoProgressLabel,
  binairoStatusMessage,
  cellKey,
  nextBinairoValue,
  violationKeySet,
} from "./binairoView";

const _ = null;

// 좌상단 0(고정 단서), 우측에 1(고정 단서), 나머지 빈 칸인 단순 4×4 보드.
const PUZZLE: BinairoGrid = [
  [0, _, _, 1],
  [_, _, _, _],
  [_, _, _, _],
  [_, _, _, _],
];

describe("binairoView.cellKey / violationKeySet", () => {
  it("좌표를 `row,col` 키로 변환한다", () => {
    expect(cellKey({ row: 2, col: 3 })).toBe("2,3");
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

describe("binairoView.nextBinairoValue", () => {
  it("빈 칸 → 0 → 1 → 빈 칸으로 순환한다", () => {
    expect(nextBinairoValue(null)).toBe(0);
    expect(nextBinairoValue(0)).toBe(1);
    expect(nextBinairoValue(1)).toBe(null);
  });
});

describe("binairoView.binairoCellSymbol", () => {
  it("0/1/빈 칸을 기호로 변환한다", () => {
    expect(binairoCellSymbol(0)).toBe("0");
    expect(binairoCellSymbol(1)).toBe("1");
    expect(binairoCellSymbol(null)).toBe("");
  });
});

describe("binairoView.binairoStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(binairoStatusMessage("playing")).toBe("진행 중");
    expect(binairoStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 규칙에 맞게 채웠습니다",
    );
  });
});

describe("binairoView.binairoCellLabel", () => {
  const state = createBinairo(PUZZLE);

  it("빈 칸은 좌표 + 빈 칸으로 라벨링", () => {
    expect(binairoCellLabel(state, { row: 1, col: 1 })).toBe("2행 2열, 빈 칸");
  });

  it("고정 단서는 좌표 + 고정 단서 값", () => {
    expect(binairoCellLabel(state, { row: 0, col: 0 })).toBe("1행 1열, 고정 단서 0");
    expect(binairoCellLabel(state, { row: 0, col: 3 })).toBe("1행 4열, 고정 단서 1");
  });

  it("위반이면 라벨 끝에 위반을 덧붙인다", () => {
    expect(binairoCellLabel(state, { row: 0, col: 0 }, true)).toBe(
      "1행 1열, 고정 단서 0, 위반",
    );
  });
});

describe("binairoView.binairoCellViews", () => {
  const state = createBinairo(PUZZLE);

  it("위반 좌표를 셀 강조 모델에 매핑한다", () => {
    const views = binairoCellViews(state, [{ row: 0, col: 0 }]);
    expect(views[0]![0]!.violated).toBe(true);
    expect(views[0]![1]!.violated).toBe(false);
  });

  it("고정 단서 칸을 given(비활성 대상)으로, 빈 칸은 편집 가능으로 표시", () => {
    const views = binairoCellViews(state, []);
    expect(views[0]![0]!.given).toBe(true); // 고정 단서 0
    expect(views[0]![3]!.given).toBe(true); // 고정 단서 1
    expect(views[1]![1]!.given).toBe(false); // 빈 칸
  });

  it("값·기호·라벨을 함께 담는다", () => {
    const views = binairoCellViews(state, []);
    expect(views[0]![0]).toMatchObject({
      row: 0,
      col: 0,
      value: 0,
      symbol: "0",
      label: "1행 1열, 고정 단서 0",
    });
    expect(views[1]![1]).toMatchObject({ value: null, symbol: "" });
  });
});

describe("binairoView.binairoProgressLabel", () => {
  it("채운 칸·남은 칸·위반 수를 요약한다", () => {
    const state = createBinairo(PUZZLE);
    // 4×4=16칸 중 고정 단서 2칸만 채워짐.
    expect(binairoProgressLabel(state, 0)).toBe("채운 칸 2 · 남은 칸 14 · 위반 0");
    expect(binairoProgressLabel(state, 3)).toBe("채운 칸 2 · 남은 칸 14 · 위반 3");
  });
});
