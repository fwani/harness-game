import { describe, it, expect } from "vitest";
import {
  createNonogram,
  isNonogramSolved,
  type NonogramSolution,
  type NonogramState,
} from "../../domain/nonogram";
import {
  NONOGRAM_PUZZLES,
  applyNonogramInput,
  columnClueLabels,
  describeNonogramStatus,
  nonogramCellViews,
  nonogramFilledLabel,
  rowClueLabels,
  toggleNonogramCross,
  toggleNonogramFill,
} from "./nonogramView";

/** 해답 칸만 정확히 칠한(클리어된) 상태를 만든다(풀이 가능성 검증용). */
function solvedState(solution: NonogramSolution): NonogramState {
  let state = createNonogram(solution);
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution[row]!.length; col += 1) {
      if (solution[row]![col]) {
        state = toggleNonogramFill(state, { row, col });
      }
    }
  }
  return state;
}

describe("NONOGRAM_PUZZLES", () => {
  it("최소 3개 이상이고 각 id가 고유하다", () => {
    expect(NONOGRAM_PUZZLES.length).toBeGreaterThanOrEqual(3);
    const ids = NONOGRAM_PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("각 퍼즐은 5×5 직사각·값은 boolean이며 createNonogram을 통과한다", () => {
    for (const puzzle of NONOGRAM_PUZZLES) {
      expect(puzzle.solution.length).toBe(5);
      for (const rowCells of puzzle.solution) {
        expect(rowCells.length).toBe(5);
        for (const cell of rowCells) {
          expect(typeof cell).toBe("boolean");
        }
      }
      expect(() => createNonogram(puzzle.solution)).not.toThrow();
      expect(puzzle.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("각 퍼즐은 해답 칸만 칠하면 클리어된다(풀이 가능)", () => {
    for (const puzzle of NONOGRAM_PUZZLES) {
      expect(isNonogramSolved(solvedState(puzzle.solution))).toBe(true);
    }
  });
});

describe("nonogramCellViews", () => {
  it("표시 상태를 색 비의존 기호·좌표 라벨로 변환한다", () => {
    let state = createNonogram([
      [true, false],
      [false, false],
    ]);
    state = toggleNonogramFill(state, { row: 0, col: 0 }); // 칠
    state = toggleNonogramCross(state, { row: 1, col: 1 }); // X

    const views = nonogramCellViews(state);
    expect(views.length).toBe(2);
    expect(views[0]!.length).toBe(2);

    expect(views[0]![0]).toMatchObject({ mark: "filled", symbol: "■" });
    expect(views[0]![0]!.ariaLabel).toBe("행 1, 열 1, 칠해짐");

    expect(views[1]![1]).toMatchObject({ mark: "crossed", symbol: "✕" });
    expect(views[1]![1]!.ariaLabel).toBe("행 2, 열 2, X 표시");

    // 빈 칸은 기호 없이 좌표·상태만(색 비의존).
    expect(views[0]![1]).toMatchObject({ mark: "empty", symbol: "" });
    expect(views[0]![1]!.ariaLabel).toBe("행 1, 열 2, 빈 칸");
  });
});

describe("clue labels", () => {
  it("행 단서를 domain에 위임해 라벨로, 빈 줄은 0으로 표기한다", () => {
    const solution: NonogramSolution = [
      [false, true, false, true, false], // 1 1
      [true, true, true, true, true], // 5
      [false, false, false, false, false], // 0 (빈 행)
    ];
    expect(rowClueLabels(solution)).toEqual(["1 1", "5", "0"]);
  });

  it("열 단서를 domain에 위임해 라벨로, 빈 열은 0으로 표기한다", () => {
    const solution: NonogramSolution = [
      [true, false, false],
      [true, false, false],
      [false, false, true],
    ];
    // col0: 2, col1: 0(빈 열), col2: 1
    expect(columnClueLabels(solution)).toEqual(["2", "0", "1"]);
  });

  it("하트 퍼즐 단서가 기대값과 일치한다", () => {
    const heart = NONOGRAM_PUZZLES.find((p) => p.id === "heart")!;
    expect(rowClueLabels(heart.solution)).toEqual(["1 1", "5", "5", "3", "1"]);
    expect(columnClueLabels(heart.solution)).toEqual(["2", "4", "4", "4", "2"]);
  });
});

describe("describeNonogramStatus / nonogramFilledLabel", () => {
  it("진행 중과 클리어를 구분해 문구로 만든다", () => {
    const heart = NONOGRAM_PUZZLES.find((p) => p.id === "heart")!;
    const start = createNonogram(heart.solution);
    expect(describeNonogramStatus(start).solved).toBe(false);
    expect(describeNonogramStatus(start).text).toContain("진행 중");

    const done = solvedState(heart.solution);
    const status = describeNonogramStatus(done);
    expect(status.solved).toBe(true);
    expect(status.text).toContain("클리어");
  });

  it("칠한 칸 수를 센다(X·빈은 제외)", () => {
    let state = createNonogram([
      [true, true],
      [true, false],
    ]);
    expect(nonogramFilledLabel(state)).toBe("칠한 칸 0개");
    state = toggleNonogramFill(state, { row: 0, col: 0 });
    state = toggleNonogramCross(state, { row: 1, col: 1 });
    expect(nonogramFilledLabel(state)).toBe("칠한 칸 1개");
  });
});

describe("표시 토글 (domain markNonogramCell 위임)", () => {
  it("toggleNonogramFill: 빈↔칠 토글, 입력 불변", () => {
    const state = createNonogram([
      [true, false],
      [false, false],
    ]);
    const filled = toggleNonogramFill(state, { row: 0, col: 0 });
    expect(filled.marks[0]![0]).toBe("filled");
    expect(state.marks[0]![0]).toBe("empty"); // 입력 불변
    const cleared = toggleNonogramFill(filled, { row: 0, col: 0 });
    expect(cleared.marks[0]![0]).toBe("empty");
  });

  it("toggleNonogramCross: 빈↔X 토글, 칠해진 칸 위에는 X를 덮는다", () => {
    let state = createNonogram([
      [true, false],
      [false, false],
    ]);
    const crossed = toggleNonogramCross(state, { row: 0, col: 1 });
    expect(crossed.marks[0]![1]).toBe("crossed");
    expect(toggleNonogramCross(crossed, { row: 0, col: 1 }).marks[0]![1]).toBe("empty");

    state = toggleNonogramFill(state, { row: 1, col: 0 });
    expect(toggleNonogramCross(state, { row: 1, col: 0 }).marks[1]![0]).toBe("crossed");
  });

  it("applyNonogramInput: 모드에 맞는 토글로 매핑한다", () => {
    const state = createNonogram([
      [true, false],
      [false, false],
    ]);
    expect(applyNonogramInput(state, { row: 0, col: 0 }, "fill").marks[0]![0]).toBe("filled");
    expect(applyNonogramInput(state, { row: 0, col: 0 }, "cross").marks[0]![0]).toBe("crossed");
  });

  it("경계 밖 좌표는 조용히 무시하지 않고 도메인 에러를 전파한다", () => {
    const state = createNonogram([
      [true, false],
      [false, false],
    ]);
    expect(() => toggleNonogramFill(state, { row: 5, col: 0 })).toThrow(/경계 밖/);
    expect(() => toggleNonogramCross(state, { row: 0, col: -1 })).toThrow(/경계 밖/);
    expect(() => applyNonogramInput(state, { row: 0, col: 9 }, "fill")).toThrow(/경계 밖/);
  });
});
