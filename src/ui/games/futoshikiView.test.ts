import { describe, expect, it } from "vitest";
import {
  createFutoshiki,
  setFutoshikiValue,
  type FutoshikiPuzzle,
} from "../../domain/futoshiki";
import {
  cellKey,
  constraintViewMap,
  futoshikiBoardView,
  futoshikiCellLabel,
  futoshikiCellViews,
  futoshikiGridStyle,
  futoshikiProgressLabel,
  futoshikiStatusMessage,
  violationKeySet,
} from "./futoshikiView";

const _ = null;

// 좌상단 1(고정 단서), 가로/세로 제약이 하나씩 있는 단순 4×4 퍼즐.
//   - 가로: (0,0) < (0,1)
//   - 세로: (1,0) > (0,0)  → 위(0,0)가 더 큼
const PUZZLE: FutoshikiPuzzle = {
  givens: [
    [1, _, _, _],
    [_, _, _, _],
    [_, _, _, _],
    [_, _, _, _],
  ],
  constraints: [
    { lt: { row: 0, col: 0 }, gt: { row: 0, col: 1 } }, // (0,0) < (0,1)
    { lt: { row: 1, col: 0 }, gt: { row: 0, col: 0 } }, // (1,0) < (0,0) → 위가 더 큼
  ],
};

describe("futoshikiView.cellKey / violationKeySet", () => {
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

describe("futoshikiView.futoshikiStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(futoshikiStatusMessage("playing")).toBe("진행 중");
    expect(futoshikiStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 규칙에 맞게 채웠습니다",
    );
  });
});

describe("futoshikiView.futoshikiCellLabel", () => {
  const state = createFutoshiki(PUZZLE);

  it("빈 칸은 좌표 + 빈 칸으로 라벨링", () => {
    expect(futoshikiCellLabel(state, { row: 1, col: 1 })).toBe("2행 2열, 빈 칸");
  });

  it("고정 단서는 좌표 + 고정 단서 값", () => {
    expect(futoshikiCellLabel(state, { row: 0, col: 0 })).toBe("1행 1열, 고정 단서 1");
  });

  it("입력 칸은 좌표 + 입력 값, 위반이면 위반을 덧붙인다", () => {
    const next = setFutoshikiValue(state, { row: 1, col: 1 }, 3);
    expect(futoshikiCellLabel(next, { row: 1, col: 1 })).toBe("2행 2열, 입력 3");
    expect(futoshikiCellLabel(next, { row: 1, col: 1 }, true)).toBe(
      "2행 2열, 입력 3, 위반",
    );
  });
});

describe("futoshikiView.futoshikiCellViews", () => {
  const state = createFutoshiki(PUZZLE);

  it("위반 좌표를 셀 강조 모델에 매핑한다", () => {
    const views = futoshikiCellViews(state, [{ row: 0, col: 0 }]);
    expect(views[0]![0]!.violated).toBe(true);
    expect(views[0]![1]!.violated).toBe(false);
  });

  it("고정 단서 칸을 given(비활성 대상)으로, 빈 칸은 편집 가능으로 표시", () => {
    const views = futoshikiCellViews(state, []);
    expect(views[0]![0]!.given).toBe(true); // 고정 단서 1
    expect(views[1]![1]!.given).toBe(false); // 빈 칸
  });

  it("값·기호·라벨을 함께 담는다", () => {
    const views = futoshikiCellViews(state, []);
    expect(views[0]![0]).toMatchObject({
      row: 0,
      col: 0,
      value: 1,
      symbol: "1",
      label: "1행 1열, 고정 단서 1",
    });
    expect(views[1]![1]).toMatchObject({ value: null, symbol: "" });
  });
});

describe("futoshikiView.constraintViewMap", () => {
  const state = createFutoshiki(PUZZLE);
  const map = constraintViewMap(state);

  it("가로 제약: lt가 왼쪽이면 < (왼쪽이 더 작음)", () => {
    const view = map.get("h:0:0");
    expect(view).toEqual({
      orientation: "h",
      symbol: "<",
      label: "왼쪽 칸이 더 작음",
    });
  });

  it("세로 제약: lt가 아래쪽(위가 더 큼)이면 ∨", () => {
    // 제약 (1,0) < (0,0): topRow=0, lt(1,0)는 위쪽이 아니므로 ∨.
    const view = map.get("v:0:0");
    expect(view).toEqual({
      orientation: "v",
      symbol: "∨",
      label: "위 칸이 더 큼",
    });
  });

  it("제약이 없는 사이 칸은 Map에 없다", () => {
    expect(map.get("h:2:2")).toBeUndefined();
  });

  it("lt가 오른쪽/위쪽인 제약은 반대 기호로 매핑한다", () => {
    const puzzle: FutoshikiPuzzle = {
      givens: [
        [_, _],
        [_, _],
      ],
      constraints: [
        { lt: { row: 0, col: 1 }, gt: { row: 0, col: 0 } }, // 오른쪽이 더 작음 → 왼쪽이 더 큼 ">"
        { lt: { row: 0, col: 1 }, gt: { row: 1, col: 1 } }, // 위가 더 작음 "∧"
      ],
    };
    const m = constraintViewMap(createFutoshiki(puzzle));
    expect(m.get("h:0:0")).toMatchObject({ symbol: ">", label: "왼쪽 칸이 더 큼" });
    expect(m.get("v:0:1")).toMatchObject({ symbol: "∧", label: "위 칸이 더 작음" });
  });
});

describe("futoshikiView.futoshikiBoardView", () => {
  const state = createFutoshiki(PUZZLE);

  it("N×N 보드를 (2N-1)×(2N-1) 확장 그리드로 펼친다", () => {
    const board = futoshikiBoardView(state, []);
    expect(board.length).toBe(7); // 4*2-1
    expect(board[0]!.length).toBe(7);
  });

  it("짝수행/짝수열은 실제 칸 슬롯이다", () => {
    const board = futoshikiBoardView(state, []);
    const slot = board[0]![0]!;
    expect(slot.kind).toBe("cell");
    if (slot.kind === "cell") {
      expect(slot.cell).toMatchObject({ row: 0, col: 0, value: 1 });
    }
  });

  it("칸 사이 슬롯에 제약 기호를 배치하고, 없으면 empty다", () => {
    const board = futoshikiBoardView(state, []);
    // (0,0)-(0,1) 사이 가로 슬롯 = 확장 좌표 [0][1].
    const hSlot = board[0]![1]!;
    expect(hSlot.kind).toBe("constraint");
    if (hSlot.kind === "constraint") {
      expect(hSlot.constraint.symbol).toBe("<");
    }
    // (0,0)-(1,0) 사이 세로 슬롯 = 확장 좌표 [1][0].
    const vSlot = board[1]![0]!;
    expect(vSlot.kind).toBe("constraint");
    // (1,1)-(1,2) 사이엔 제약 없음 → empty(확장 [2][3]).
    expect(board[2]![3]!.kind).toBe("empty");
    // 홀수행/홀수열 모서리는 empty(확장 [1][1]).
    expect(board[1]![1]!.kind).toBe("empty");
  });

  it("위반 칸은 확장 그리드의 셀 슬롯에도 반영된다", () => {
    const board = futoshikiBoardView(state, [{ row: 0, col: 0 }]);
    const slot = board[0]![0]!;
    expect(slot.kind === "cell" && slot.cell.violated).toBe(true);
  });
});

describe("futoshikiView.futoshikiGridStyle", () => {
  it("칸/사이 트랙을 번갈아 만들고 maxWidth를 캡한다", () => {
    const style = futoshikiGridStyle(4, 44, 20);
    expect(style.gridTemplateColumns).toBe(
      "minmax(0, 1fr) 20px minmax(0, 1fr) 20px minmax(0, 1fr) 20px minmax(0, 1fr)",
    );
    expect(style.gridTemplateRows).toBe("44px 20px 44px 20px 44px 20px 44px");
    // 칸 4개(44) + 사이 3개(20) = 176 + 60 = 236.
    expect(style.maxWidth).toBe("236px");
  });

  it("size < 2는 throw", () => {
    expect(() => futoshikiGridStyle(1)).toThrow();
  });
});

describe("futoshikiView.futoshikiProgressLabel", () => {
  it("채운 칸·남은 칸·위반 수를 요약한다", () => {
    const state = createFutoshiki(PUZZLE);
    // 4×4=16칸 중 고정 단서 1칸만 채워짐.
    expect(futoshikiProgressLabel(state, 0)).toBe("채운 칸 1 · 남은 칸 15 · 위반 0");
    expect(futoshikiProgressLabel(state, 2)).toBe("채운 칸 1 · 남은 칸 15 · 위반 2");
  });
});
