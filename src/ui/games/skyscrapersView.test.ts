import { describe, expect, it } from "vitest";
import {
  createSkyscrapers,
  setSkyscraperValue,
  skyscraperViolations,
  type SkyscraperPuzzle,
} from "../../domain/skyscrapers";
import {
  cellKey,
  sideClueLabel,
  skyscraperBoardView,
  skyscraperCellLabel,
  skyscraperCellViews,
  skyscraperClueViews,
  skyscraperGridStyle,
  skyscraperProgressLabel,
  skyscraperStatusMessage,
  violationKeySet,
} from "./skyscrapersView";

// 4×4 프리셋(도메인 SKYSCRAPER_PUZZLES와 동일). 정답:
//   1 2 3 4 / 2 3 4 1 / 3 4 1 2 / 4 1 2 3
const PUZZLE: SkyscraperPuzzle = {
  size: 4,
  clues: {
    top: [4, 3, 2, 1],
    bottom: [1, 2, 2, 2],
    left: [4, 3, 2, 1],
    right: [1, 2, 2, 2],
  },
  givens: [
    [1, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, 3],
  ],
};

const SOLUTION: number[][] = [
  [1, 2, 3, 4],
  [2, 3, 4, 1],
  [3, 4, 1, 2],
  [4, 1, 2, 3],
];

describe("skyscrapersView.cellKey / violationKeySet", () => {
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

describe("skyscrapersView.skyscraperStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(skyscraperStatusMessage("playing")).toBe("진행 중");
    expect(skyscraperStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 규칙·변 단서에 맞게 채웠습니다",
    );
  });
});

describe("skyscrapersView.skyscraperCellLabel", () => {
  it("좌표 + 고정 단서/입력/빈 칸/위반을 색 비의존 텍스트로 노출한다", () => {
    const state = createSkyscrapers(PUZZLE);
    // (0,0)은 고정 단서 1.
    expect(skyscraperCellLabel(state, { row: 0, col: 0 })).toBe(
      "1행 1열, 고정 단서 1",
    );
    // (0,1)은 빈 칸.
    expect(skyscraperCellLabel(state, { row: 0, col: 1 })).toBe("1행 2열, 빈 칸");
    const filled = setSkyscraperValue(state, { row: 0, col: 1 }, 2);
    expect(skyscraperCellLabel(filled, { row: 0, col: 1 })).toBe(
      "1행 2열, 입력 2",
    );
    expect(skyscraperCellLabel(filled, { row: 0, col: 1 }, true)).toBe(
      "1행 2열, 입력 2, 위반",
    );
  });
});

describe("skyscrapersView.skyscraperCellViews", () => {
  it("고정 단서 칸은 given=true(비활성), 빈 칸은 false로 표시한다", () => {
    const state = createSkyscrapers(PUZZLE);
    const views = skyscraperCellViews(state, []);
    expect(views[0]![0]!.given).toBe(true); // 고정 단서 1
    expect(views[3]![3]!.given).toBe(true); // 고정 단서 3
    expect(views[0]![1]!.given).toBe(false); // 빈 칸
    expect(views[0]![0]!.symbol).toBe("1");
    expect(views[0]![1]!.symbol).toBe("");
  });

  it("위반 좌표를 색 비의존 강조(violated + 라벨 '위반')로 매핑한다", () => {
    // 같은 행에 같은 값을 두 번 → 행 중복 위반.
    let state = createSkyscrapers(PUZZLE);
    state = setSkyscraperValue(state, { row: 0, col: 1 }, 1); // (0,0) 고정 1과 같은 행 중복
    const violations = skyscraperViolations(state);
    const views = skyscraperCellViews(state, violations);
    expect(views[0]![0]!.violated).toBe(true);
    expect(views[0]![0]!.label).toContain("위반");
    expect(views[0]![1]!.violated).toBe(true);
    // 위반 아닌 칸은 강조하지 않는다.
    expect(views[2]![2]!.violated).toBe(false);
    expect(views[2]![2]!.label).not.toContain("위반");
  });
});

describe("skyscrapersView.sideClueLabel / skyscraperClueViews", () => {
  it("각 변의 단서 라벨을 매핑 방향과 함께 한국어로 만든다", () => {
    expect(sideClueLabel("top", 0, 4)).toBe("1열 위에서 보이는 빌딩 4개");
    expect(sideClueLabel("bottom", 2, 2)).toBe("3열 아래에서 보이는 빌딩 2개");
    expect(sideClueLabel("left", 1, 3)).toBe("2행 왼쪽에서 보이는 빌딩 3개");
    expect(sideClueLabel("right", 3, 2)).toBe("4행 오른쪽에서 보이는 빌딩 2개");
  });

  it("단서가 없으면(null) 라벨/기호가 빈 문자열", () => {
    expect(sideClueLabel("top", 0, null)).toBe("");
  });

  it("네 변 단서 배열을 행/열 매핑과 함께 도출한다", () => {
    const state = createSkyscrapers(PUZZLE);
    const clues = skyscraperClueViews(state);
    expect(clues.top.map((c) => c.value)).toEqual([4, 3, 2, 1]);
    expect(clues.bottom.map((c) => c.value)).toEqual([1, 2, 2, 2]);
    expect(clues.left.map((c) => c.value)).toEqual([4, 3, 2, 1]);
    expect(clues.right.map((c) => c.value)).toEqual([1, 2, 2, 2]);
    // top 단서는 같은 인덱스의 열에 매핑된다.
    expect(clues.top[0]).toMatchObject({ side: "top", index: 0, symbol: "4" });
    // left 단서는 같은 인덱스의 행에 매핑된다.
    expect(clues.left[1]).toMatchObject({ side: "left", index: 1, symbol: "3" });
  });
});

describe("skyscrapersView.skyscraperBoardView", () => {
  it("입력 격자를 네 변 단서를 두른 (N+2)×(N+2) 슬롯 그리드로 변환한다", () => {
    const state = createSkyscrapers(PUZZLE);
    const board = skyscraperBoardView(state, []);
    const span = state.size + 2;
    expect(board.length).toBe(span);
    expect(board.every((row) => row.length === span)).toBe(true);

    // 네 모서리는 corner.
    expect(board[0]![0]!.kind).toBe("corner");
    expect(board[0]![span - 1]!.kind).toBe("corner");
    expect(board[span - 1]![0]!.kind).toBe("corner");
    expect(board[span - 1]![span - 1]!.kind).toBe("corner");

    // 맨 윗줄 1..N열은 top 단서, 맨 아랫줄은 bottom 단서.
    const topSlot = board[0]![1]!;
    expect(topSlot.kind).toBe("clue");
    if (topSlot.kind === "clue") {
      expect(topSlot.clue).toMatchObject({ side: "top", index: 0, symbol: "4" });
    }
    const bottomSlot = board[span - 1]![1]!;
    if (bottomSlot.kind === "clue") {
      expect(bottomSlot.clue.side).toBe("bottom");
    }

    // 맨 왼쪽/오른쪽 열은 left/right 단서.
    const leftSlot = board[1]![0]!;
    if (leftSlot.kind === "clue") {
      expect(leftSlot.clue).toMatchObject({ side: "left", index: 0 });
    }
    const rightSlot = board[1]![span - 1]!;
    if (rightSlot.kind === "clue") {
      expect(rightSlot.clue.side).toBe("right");
    }

    // 안쪽 (1,1)은 입력 격자의 (0,0) 칸.
    const innerSlot = board[1]![1]!;
    expect(innerSlot.kind).toBe("cell");
    if (innerSlot.kind === "cell") {
      expect(innerSlot.cell).toMatchObject({ row: 0, col: 0, symbol: "1" });
    }
  });
});

describe("skyscrapersView.skyscraperGridStyle", () => {
  it("(N+2) 트랙 그리드 + maxWidth 캡을 만든다", () => {
    const style = skyscraperGridStyle(4, 44);
    expect(style.gridTemplateColumns).toBe("repeat(6, minmax(0, 1fr))");
    expect(style.gridTemplateRows).toBe("repeat(6, 44px)");
    expect(style.maxWidth).toBe("264px");
  });

  it("size가 2 미만/비정수면 throw", () => {
    expect(() => skyscraperGridStyle(1)).toThrow();
    expect(() => skyscraperGridStyle(2.5)).toThrow();
  });
});

describe("skyscrapersView.skyscraperProgressLabel", () => {
  it("채운 칸(고정 단서 포함)·남은 칸·위반 수를 한 줄로 요약한다", () => {
    const state = createSkyscrapers(PUZZLE);
    // 고정 단서 2칸이 이미 채워져 있다.
    expect(skyscraperProgressLabel(state, 0)).toBe(
      "채운 칸 2 · 남은 칸 14 · 위반 0",
    );
    const next = setSkyscraperValue(state, { row: 0, col: 1 }, 2);
    expect(skyscraperProgressLabel(next, 1)).toBe(
      "채운 칸 3 · 남은 칸 13 · 위반 1",
    );
  });
});

describe("skyscrapersView 클리어 상태", () => {
  it("정답을 모두 채우면 위반 0 · 모든 칸 채움(클리어 표시 가능)", () => {
    let state = createSkyscrapers(PUZZLE);
    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        if (state.givens[row]![col]) continue;
        state = setSkyscraperValue(state, { row, col }, SOLUTION[row]![col]!);
      }
    }
    const violations = skyscraperViolations(state);
    expect(violations).toEqual([]);
    expect(skyscraperProgressLabel(state, violations.length)).toBe(
      "채운 칸 16 · 남은 칸 0 · 위반 0",
    );
  });
});
