import { describe, expect, it } from "vitest";
import type { LightsOutBoard } from "../../domain/lightsOut";
import {
  DEFAULT_LIGHTS_OUT_SIZE,
  LIGHTS_OUT_SIZES,
  LIT_SYMBOL,
  UNLIT_SYMBOL,
  describeLightsOutStatus,
  lightsOutCellViews,
  litCountLabel,
  moveCountLabel,
  sizeLabel,
} from "./lightsOutView";

// 테스트용 보드 헬퍼: true=켜짐.
const board: LightsOutBoard = [
  [true, false],
  [false, true],
];

describe("lightsOutView", () => {
  it("기본 크기·선택지가 노출된다", () => {
    expect(LIGHTS_OUT_SIZES).toContain(DEFAULT_LIGHTS_OUT_SIZE);
    expect(LIGHTS_OUT_SIZES.every((s) => Number.isInteger(s) && s > 0)).toBe(true);
  });

  it("sizeLabel은 N×N 형식이다", () => {
    expect(sizeLabel(5)).toBe("5×5");
    expect(sizeLabel(3)).toBe("3×3");
  });

  describe("lightsOutCellViews", () => {
    it("켜짐/꺼짐을 색이 아니라 기호·라벨·aria로 구분한다", () => {
      const views = lightsOutCellViews(board);
      expect(views).toHaveLength(2);
      expect(views[0]).toHaveLength(2);

      const lit = views[0]![0]!;
      expect(lit.lit).toBe(true);
      expect(lit.symbol).toBe(LIT_SYMBOL);
      expect(lit.label).toBe("켜짐");
      expect(lit.ariaLabel).toBe("행 1, 열 1 — 켜짐");

      const unlit = views[0]![1]!;
      expect(unlit.lit).toBe(false);
      expect(unlit.symbol).toBe(UNLIT_SYMBOL);
      expect(unlit.label).toBe("꺼짐");
      expect(unlit.ariaLabel).toBe("행 1, 열 2 — 꺼짐");
    });

    it("좌표가 board[row][col]과 일치한다", () => {
      const views = lightsOutCellViews(board);
      expect(views[1]![0]).toMatchObject({ row: 1, col: 0, lit: false });
      expect(views[1]![1]).toMatchObject({ row: 1, col: 1, lit: true });
    });

    it("입력 board를 변형하지 않는다(불변)", () => {
      const snapshot = board.map((r) => r.slice());
      lightsOutCellViews(board);
      expect(board).toEqual(snapshot);
    });
  });

  describe("moveCountLabel / litCountLabel", () => {
    it("누른 횟수를 표시한다", () => {
      expect(moveCountLabel(0)).toBe("누른 횟수 0");
      expect(moveCountLabel(7)).toBe("누른 횟수 7");
    });

    it("남은 켜진 칸 수는 domain countLitCells를 따른다", () => {
      expect(litCountLabel(board)).toBe("남은 켜진 칸 2");
      expect(
        litCountLabel([
          [false, false],
          [false, false],
        ]),
      ).toBe("남은 켜진 칸 0");
    });
  });

  describe("describeLightsOutStatus", () => {
    it("진행 중이면 남은 켜진 칸 수를 안내한다", () => {
      const msg = describeLightsOutStatus(board, 3);
      expect(msg).toContain("2");
      expect(msg).not.toContain("클리어");
    });

    it("모두 꺼지면 누른 횟수를 포함한 클리어 문구를 반환한다", () => {
      const solved: LightsOutBoard = [
        [false, false],
        [false, false],
      ];
      const msg = describeLightsOutStatus(solved, 5);
      expect(msg).toContain("클리어");
      expect(msg).toContain("5");
    });
  });
});
