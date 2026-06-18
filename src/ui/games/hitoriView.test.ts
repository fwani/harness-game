import { describe, expect, it } from "vitest";
import {
  createHitori,
  toggleHitoriCell,
  type HitoriViolation,
} from "../../domain/hitori";
import {
  cellKey,
  hitoriCellLabel,
  hitoriCellViews,
  hitoriProgressLabel,
  hitoriRecordWinSide,
  hitoriStatusMessage,
  hitoriViolationLabel,
  hitoriViolationLabels,
  violationCells,
  violationKeySet,
} from "./hitoriView";

// 단순 3×3 고정 숫자판(테스트 전용, 규칙 충족 여부와 무관).
const NUMBERS = [
  [1, 2, 3],
  [2, 1, 1],
  [3, 3, 2],
];

describe("hitoriView.cellKey", () => {
  it("좌표를 `row,col` 키로 변환한다", () => {
    expect(cellKey({ row: 2, col: 1 })).toBe("2,1");
  });
});

describe("hitoriView.violationCells / violationKeySet", () => {
  const violations: HitoriViolation[] = [
    {
      type: "duplicate-white",
      line: "row",
      index: 1,
      value: 1,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    },
    {
      type: "adjacent-black",
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    },
  ];

  it("모든 위반 유형의 칸 좌표를 평탄화한다", () => {
    expect(violationCells(violations)).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it("위반 칸 좌표를 키 집합으로 모은다", () => {
    const set = violationKeySet(violations);
    expect(set.has("1,1")).toBe(true);
    expect(set.has("1,2")).toBe(true);
    expect(set.has("0,0")).toBe(true);
    expect(set.has("1,0")).toBe(true);
    expect(set.has("2,2")).toBe(false);
    expect(set.size).toBe(4);
  });

  it("빈 위반 목록은 빈 집합", () => {
    expect(violationCells([]).length).toBe(0);
    expect(violationKeySet([]).size).toBe(0);
  });
});

describe("hitoriView.hitoriStatusMessage", () => {
  it("진행 중/클리어를 한국어로 표시한다", () => {
    expect(hitoriStatusMessage("playing")).toBe("진행 중");
    expect(hitoriStatusMessage("solved")).toBe(
      "클리어! 모든 칸을 규칙에 맞게 칠했습니다",
    );
  });
});

describe("hitoriView.hitoriViolationLabel", () => {
  it("white 행/열 중복을 사람이 읽는 라벨로 변환한다", () => {
    expect(
      hitoriViolationLabel({
        type: "duplicate-white",
        line: "row",
        index: 1,
        value: 5,
        cells: [
          { row: 1, col: 0 },
          { row: 1, col: 2 },
        ],
      }),
    ).toBe("2행: 칠하지 않은 숫자 5 중복");
    expect(
      hitoriViolationLabel({
        type: "duplicate-white",
        line: "col",
        index: 2,
        value: 3,
        cells: [
          { row: 0, col: 2 },
          { row: 2, col: 2 },
        ],
      }),
    ).toBe("3열: 칠하지 않은 숫자 3 중복");
  });

  it("인접 black 쌍을 좌표 라벨로 변환한다", () => {
    expect(
      hitoriViolationLabel({
        type: "adjacent-black",
        cells: [
          { row: 1, col: 2 },
          { row: 1, col: 3 },
        ],
      }),
    ).toBe("칠한 칸 인접: 2행 3열·2행 4열");
  });

  it("white 비연결을 분리된 칸 수로 요약한다", () => {
    expect(
      hitoriViolationLabel({
        type: "disconnected-white",
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 2, col: 2 },
        ],
      }),
    ).toBe("칠하지 않은 칸 3개가 분리됨");
  });

  it("hitoriViolationLabels는 목록을 라벨 배열로 변환한다", () => {
    const labels = hitoriViolationLabels([
      {
        type: "adjacent-black",
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ],
      },
      { type: "disconnected-white", cells: [{ row: 2, col: 2 }] },
    ]);
    expect(labels).toEqual([
      "칠한 칸 인접: 1행 1열·2행 1열",
      "칠하지 않은 칸 1개가 분리됨",
    ]);
  });
});

describe("hitoriView.hitoriCellLabel", () => {
  it("안 칠한 칸은 좌표 + 숫자 + 안 칠함", () => {
    const state = createHitori(NUMBERS);
    expect(hitoriCellLabel(state, { row: 0, col: 2 })).toBe(
      "1행 3열, 숫자 3, 안 칠함",
    );
  });

  it("칠한 칸은 좌표 + 숫자 + 칠함", () => {
    const state = toggleHitoriCell(createHitori(NUMBERS), { row: 1, col: 1 });
    expect(hitoriCellLabel(state, { row: 1, col: 1 })).toBe(
      "2행 2열, 숫자 1, 칠함",
    );
  });

  it("위반이면 라벨 끝에 위반을 덧붙인다", () => {
    const state = createHitori(NUMBERS);
    expect(hitoriCellLabel(state, { row: 0, col: 0 }, true)).toBe(
      "1행 1열, 숫자 1, 안 칠함, 위반",
    );
  });
});

describe("hitoriView.hitoriCellViews", () => {
  it("고정 숫자·칠 상태·기호·라벨을 함께 담는다", () => {
    const state = toggleHitoriCell(createHitori(NUMBERS), { row: 1, col: 1 });
    const views = hitoriCellViews(state, []);
    expect(views[0]![0]).toMatchObject({
      row: 0,
      col: 0,
      value: 1,
      symbol: "1",
      mark: "white",
      marked: false,
      violated: false,
      label: "1행 1열, 숫자 1, 안 칠함",
    });
    expect(views[1]![1]).toMatchObject({
      value: 1,
      symbol: "1",
      mark: "black",
      marked: true,
      label: "2행 2열, 숫자 1, 칠함",
    });
  });

  it("위반 좌표를 셀 강조 모델에 매핑한다", () => {
    const state = createHitori(NUMBERS);
    const violations: HitoriViolation[] = [
      {
        type: "duplicate-white",
        line: "col",
        index: 0,
        value: 1,
        cells: [{ row: 0, col: 0 }],
      },
    ];
    const views = hitoriCellViews(state, violations);
    expect(views[0]![0]!.violated).toBe(true);
    expect(views[0]![0]!.label).toBe("1행 1열, 숫자 1, 안 칠함, 위반");
    expect(views[0]![1]!.violated).toBe(false);
  });
});

describe("hitoriView.hitoriProgressLabel", () => {
  it("칠한 칸 수·위반 수를 요약한다", () => {
    const state0 = createHitori(NUMBERS);
    expect(hitoriProgressLabel(state0, 0)).toBe("칠한 칸 0 · 위반 0");

    const state2 = toggleHitoriCell(
      toggleHitoriCell(state0, { row: 0, col: 0 }),
      { row: 2, col: 2 },
    );
    expect(hitoriProgressLabel(state2, 3)).toBe("칠한 칸 2 · 위반 3");
  });
});

describe("hitoriView.hitoriRecordWinSide", () => {
  it("클리어면 a(사람 승), 진행 중이면 null", () => {
    expect(hitoriRecordWinSide("solved")).toBe("a");
    expect(hitoriRecordWinSide("playing")).toBeNull();
  });
});
