import { describe, it, expect } from "vitest";
import {
  describe2048Status,
  formatScore,
  highestTile,
  mapKeyToDirection,
} from "./game2048View";
import type { Board } from "../../domain/game2048";

describe("game2048View", () => {
  describe("mapKeyToDirection", () => {
    it("화살표 키를 대응 방향으로 변환한다", () => {
      expect(mapKeyToDirection("ArrowLeft")).toBe("left");
      expect(mapKeyToDirection("ArrowRight")).toBe("right");
      expect(mapKeyToDirection("ArrowUp")).toBe("up");
      expect(mapKeyToDirection("ArrowDown")).toBe("down");
    });

    it("화살표가 아닌 키는 null", () => {
      expect(mapKeyToDirection("Enter")).toBeNull();
      expect(mapKeyToDirection("a")).toBeNull();
      expect(mapKeyToDirection(" ")).toBeNull();
      expect(mapKeyToDirection("")).toBeNull();
    });
  });

  describe("describe2048Status", () => {
    it("승리(목표 도달)면 won, 메시지에 승리 표시", () => {
      const s = describe2048Status(true, false);
      expect(s.kind).toBe("won");
      expect(s.message).toContain("승리");
    });

    it("승리는 게임오버보다 우선한다(둘 다 true여도 won)", () => {
      expect(describe2048Status(true, true).kind).toBe("won");
    });

    it("게임오버(이동 불가)면 over로 구분", () => {
      const s = describe2048Status(false, true);
      expect(s.kind).toBe("over");
      expect(s.message).toContain("게임 오버");
    });

    it("진행 중이면 playing(조작 안내)", () => {
      const s = describe2048Status(false, false);
      expect(s.kind).toBe("playing");
      expect(s.message.length).toBeGreaterThan(0);
    });
  });

  describe("formatScore", () => {
    it("천 단위 쉼표를 넣는다(로캘 비의존)", () => {
      expect(formatScore(0)).toBe("0");
      expect(formatScore(48)).toBe("48");
      expect(formatScore(2048)).toBe("2,048");
      expect(formatScore(1234567)).toBe("1,234,567");
    });
  });

  describe("highestTile", () => {
    it("가장 큰 타일 값을 반환한다", () => {
      const board: Board = [
        [2, 4, 0, 0],
        [0, 8, 16, 0],
        [0, 0, 0, 32],
        [0, 0, 0, 0],
      ];
      expect(highestTile(board)).toBe(32);
    });

    it("모두 0이면 0", () => {
      const board: Board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      expect(highestTile(board)).toBe(0);
    });
  });
});
