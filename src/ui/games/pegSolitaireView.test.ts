import { describe, it, expect } from "vitest";
import { createPegSolitaire, type PegSolitaireState } from "../../domain/pegSolitaire";
import {
  describePegSolitaireStatus,
  pegMoveErrorReason,
  pegRemainingLabel,
  pegSelectionPrompt,
  pegSolitaireCells,
  samePosition,
} from "./pegSolitaireView";

/** valid 집합은 표준 보드의 것을 재사용하고 pegs만 바꾼 상태를 만든다(테스트 픽스처). */
function stateWithPegs(pegKeys: string[]): PegSolitaireState {
  const base = createPegSolitaire();
  return { size: base.size, valid: base.valid, pegs: new Set(pegKeys) };
}

/** 행→열 평탄화 배열에서 특정 칸을 집는다. */
function cellAt(
  cells: ReturnType<typeof pegSolitaireCells>,
  row: number,
  col: number,
) {
  return cells.find((c) => c.pos.row === row && c.pos.col === col)!;
}

describe("samePosition", () => {
  it("같은 좌표면 true, 다르면 false", () => {
    expect(samePosition({ row: 3, col: 3 }, { row: 3, col: 3 })).toBe(true);
    expect(samePosition({ row: 3, col: 3 }, { row: 3, col: 4 })).toBe(false);
  });
});

describe("pegSolitaireCells", () => {
  it("7×7 = 49칸을 만들고 코너(보드 밖)는 inBoard=false로 표시한다", () => {
    const cells = pegSolitaireCells(createPegSolitaire(), null);
    expect(cells).toHaveLength(49);
    const corner = cellAt(cells, 0, 0);
    expect(corner.inBoard).toBe(false);
    expect(corner.ariaLabel).toBe("행 1, 열 1, 보드 밖");
  });

  it("시작 상태: 중앙(3,3)만 빈 구멍이고 나머지 보드 안 칸은 못이 있다", () => {
    const cells = pegSolitaireCells(createPegSolitaire(), null);
    const center = cellAt(cells, 3, 3);
    expect(center.inBoard).toBe(true);
    expect(center.hasPeg).toBe(false);
    expect(cellAt(cells, 0, 2).hasPeg).toBe(true);
  });

  it("선택 없음: 중앙으로 뛸 수 있는 4개 못만 selectable로 강조한다", () => {
    const cells = pegSolitaireCells(createPegSolitaire(), null);
    const selectable = cells.filter((c) => c.selectable).map((c) => `${c.pos.row},${c.pos.col}`);
    expect(new Set(selectable)).toEqual(new Set(["1,3", "5,3", "3,1", "3,5"]));
    // 강조되지 않은 못은 selectable=false.
    expect(cellAt(cells, 0, 2).selectable).toBe(false);
  });

  it("출발(1,3) 선택 시 합법 착지(3,3)만 movableTarget로 강조한다", () => {
    const cells = pegSolitaireCells(createPegSolitaire(), { row: 1, col: 3 });
    expect(cellAt(cells, 1, 3).selected).toBe(true);
    const targets = cells.filter((c) => c.movableTarget).map((c) => `${c.pos.row},${c.pos.col}`);
    expect(targets).toEqual(["3,3"]);
    expect(cellAt(cells, 3, 3).ariaLabel).toContain("착지 가능");
  });

  it("종료 상태에서는 어떤 칸도 selectable/movableTarget/selected로 강조하지 않는다(표시-상태 일치)", () => {
    // 못 1개만 남으면 합법 수가 없어 종료 상태다.
    const finished = stateWithPegs(["3,3"]);
    // selected를 넘겨도 종료면 강조하지 않는다.
    const cells = pegSolitaireCells(finished, { row: 3, col: 3 });
    expect(cells.some((c) => c.selectable)).toBe(false);
    expect(cells.some((c) => c.movableTarget)).toBe(false);
    expect(cells.some((c) => c.selected)).toBe(false);
  });
});

describe("pegMoveErrorReason", () => {
  const start = createPegSolitaire();

  it("합법 수(1,3 → 3,3)는 빈 문자열을 돌려준다", () => {
    expect(pegMoveErrorReason(start, { row: 1, col: 3 }, { row: 3, col: 3 })).toBe("");
  });

  it("도착 칸에 못이 있으면 비어 있지 않다는 사유", () => {
    const reason = pegMoveErrorReason(start, { row: 0, col: 2 }, { row: 2, col: 2 });
    expect(reason).toContain("비어 있지 않");
  });

  it("직선 2칸이 아니면(대각선) 직선 점프만 가능하다는 사유", () => {
    // (2,2) 못 → (3,3) 빈 구멍은 대각선·1칸이라 직선 2칸 점프가 아니다.
    const reason = pegMoveErrorReason(start, { row: 2, col: 2 }, { row: 3, col: 3 });
    expect(reason).toContain("직선");
  });

  it("보드 밖(코너) 착지는 보드 밖 사유", () => {
    const reason = pegMoveErrorReason(start, { row: 1, col: 3 }, { row: 1, col: 1 });
    expect(reason).toContain("보드 밖");
  });

  it("출발 칸에 못이 없으면 그 사유", () => {
    const reason = pegMoveErrorReason(start, { row: 3, col: 3 }, { row: 3, col: 5 });
    expect(reason).toContain("출발 칸에 못이 없");
  });

  it("건너뛸 이웃 칸에 못이 없으면 그 사유", () => {
    // (3,1) 못, (3,2)·(3,3) 모두 빈 구멍 → 건너뛸 못이 없다.
    const state = stateWithPegs(["3,1"]);
    const reason = pegMoveErrorReason(state, { row: 3, col: 1 }, { row: 3, col: 3 });
    expect(reason).toContain("건너뛸 이웃 칸에 못이 없");
  });
});

describe("describePegSolitaireStatus", () => {
  it("진행 중: finished=false, 남은 못 수 안내", () => {
    const status = describePegSolitaireStatus(createPegSolitaire());
    expect(status.finished).toBe(false);
    expect(status.cleared).toBe(false);
    expect(status.text).toContain("진행 중");
    expect(status.text).toContain("32개");
  });

  it("완벽 클리어: 마지막 1개가 중앙", () => {
    const status = describePegSolitaireStatus(stateWithPegs(["3,3"]));
    expect(status.finished).toBe(true);
    expect(status.cleared).toBe(true);
    expect(status.perfect).toBe(true);
    expect(status.text).toContain("완벽 클리어");
  });

  it("클리어(완벽 아님): 1개가 중앙이 아님", () => {
    const status = describePegSolitaireStatus(stateWithPegs(["0,2"]));
    expect(status.finished).toBe(true);
    expect(status.cleared).toBe(true);
    expect(status.perfect).toBe(false);
    expect(status.text).toContain("클리어");
    expect(status.text).toContain("중앙은 아닙니다");
  });

  it("실패: 더 둘 수 없는데 못이 2개 이상 남음", () => {
    // 멀리 떨어진 두 못은 서로 뛸 수 없어 종료(합법 수 0).
    const status = describePegSolitaireStatus(stateWithPegs(["0,2", "0,4"]));
    expect(status.finished).toBe(true);
    expect(status.cleared).toBe(false);
    expect(status.perfect).toBe(false);
    expect(status.text).toContain("실패");
    expect(status.text).toContain("2개");
  });
});

describe("pegRemainingLabel / pegSelectionPrompt", () => {
  it("남은 못 라벨", () => {
    expect(pegRemainingLabel(createPegSolitaire())).toBe("남은 못 32개");
  });

  it("선택 안내: 미선택 / 선택됨 / 종료", () => {
    expect(pegSelectionPrompt(null, false)).toContain("출발 칸을 선택");
    expect(pegSelectionPrompt({ row: 1, col: 3 }, false)).toContain("착지할 빈 구멍");
    expect(pegSelectionPrompt(null, true)).toContain("게임이 끝났습니다");
  });
});
