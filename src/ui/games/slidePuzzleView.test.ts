import { describe, expect, it } from "vitest";
import { createSlidePuzzle, type SlidePuzzleState } from "../../domain/slidePuzzle";
import {
  DEFAULT_SLIDE_PUZZLE_SIZE,
  SLIDE_PUZZLE_SIZES,
  describeSlidePuzzleStatus,
  moveCountLabel,
  sizeLabel,
  slidePuzzleCells,
} from "./slidePuzzleView";

describe("slidePuzzleView.sizeLabel", () => {
  it("N×N 텍스트로 표시한다", () => {
    expect(sizeLabel(3)).toBe("3×3");
    expect(sizeLabel(4)).toBe("4×4");
  });
});

describe("slidePuzzleView 크기 선택지", () => {
  it("3×3·4×4를 제공하고 기본은 4다", () => {
    expect(SLIDE_PUZZLE_SIZES).toEqual([3, 4]);
    expect(DEFAULT_SLIDE_PUZZLE_SIZE).toBe(4);
  });
});

describe("slidePuzzleView.slidePuzzleCells", () => {
  it("완성 상태(3×3)의 셀 라벨·좌표·빈 칸을 매핑한다", () => {
    const cells = slidePuzzleCells(createSlidePuzzle(3));
    expect(cells).toHaveLength(9);

    // 좌상단 = 타일 1, (행1, 열1)
    expect(cells[0]).toMatchObject({
      tile: 1,
      index: 0,
      row: 0,
      col: 0,
      isBlank: false,
      label: "1",
    });

    // 마지막 칸 = 빈 칸
    const blank = cells[8]!;
    expect(blank.isBlank).toBe(true);
    expect(blank.tile).toBe(0);
    expect(blank.label).toBe("");
    expect(blank.movable).toBe(false);
    expect(blank.ariaLabel).toContain("빈 칸");
  });

  it("빈 칸과 인접한 타일만 movable=true로 표시한다(도메인 합법 수 기준)", () => {
    // 완성 상태(3×3): 빈 칸은 우하단(index 8). 인접 타일은 위(6, index5)·왼쪽(8, index7).
    const cells = slidePuzzleCells(createSlidePuzzle(3));
    const movable = cells.filter((c) => c.movable).map((c) => c.tile).sort((a, b) => a - b);
    expect(movable).toEqual([6, 8]);

    // movable 타일의 aria에는 "밀 수 있음"이 들어간다.
    const six = cells.find((c) => c.tile === 6)!;
    expect(six.movable).toBe(true);
    expect(six.ariaLabel).toContain("밀 수 있음");

    // 인접하지 않은 타일은 movable=false, aria에 "밀 수 있음" 없음.
    const one = cells.find((c) => c.tile === 1)!;
    expect(one.movable).toBe(false);
    expect(one.ariaLabel).not.toContain("밀 수 있음");
  });

  it("빈 칸이 가운데면 상하좌우 4개 타일이 movable이다", () => {
    // 3×3에서 빈 칸을 가운데(index4)로 둔 임의 배치.
    const state: SlidePuzzleState = { tiles: [1, 2, 3, 4, 0, 5, 6, 7, 8], size: 3 };
    const cells = slidePuzzleCells(state);
    const movable = cells.filter((c) => c.movable).map((c) => c.tile).sort((a, b) => a - b);
    // 위(2)·아래(7)·왼(4)·오른(5)
    expect(movable).toEqual([2, 4, 5, 7]);
  });

  it("입력 상태를 변형하지 않는다", () => {
    const state = createSlidePuzzle(3);
    const snapshot = state.tiles.slice();
    slidePuzzleCells(state);
    expect(state.tiles).toEqual(snapshot);
  });
});

describe("slidePuzzleView.describeSlidePuzzleStatus", () => {
  it("클리어면 solved 메시지를 반환한다", () => {
    const status = describeSlidePuzzleStatus(true);
    expect(status.kind).toBe("solved");
    expect(status.message).toContain("클리어");
  });

  it("진행 중이면 playing 안내를 반환한다", () => {
    const status = describeSlidePuzzleStatus(false);
    expect(status.kind).toBe("playing");
    expect(status.message.length).toBeGreaterThan(0);
  });
});

describe("slidePuzzleView.moveCountLabel", () => {
  it("이동 횟수를 라벨로 만든다", () => {
    expect(moveCountLabel(0)).toBe("이동 횟수 0");
    expect(moveCountLabel(12)).toBe("이동 횟수 12");
  });
});
