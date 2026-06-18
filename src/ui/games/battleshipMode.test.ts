import { describe, expect, it } from "vitest";
import {
  BATTLESHIP_MODE_OPTIONS,
  DEFAULT_BATTLESHIP_MODE,
  isModeSelected,
  type BattleshipMode,
} from "./battleshipMode";

describe("battleshipMode", () => {
  it("싱글/멀티 두 선택지를 고정 순서(싱글 먼저)로 제공한다", () => {
    expect(BATTLESHIP_MODE_OPTIONS.map((o) => o.mode)).toEqual(["single", "multi"]);
    // 색 비의존: 모든 선택지에 라벨/설명 텍스트가 있다.
    for (const o of BATTLESHIP_MODE_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.description.length).toBeGreaterThan(0);
    }
  });

  it("기본 모드는 싱글(기존 vs CPU 흐름 유지)", () => {
    expect(DEFAULT_BATTLESHIP_MODE).toBe("single");
  });

  it("isModeSelected는 현재 모드일 때만 true(세그먼트 aria-pressed)", () => {
    const modes: BattleshipMode[] = ["single", "multi"];
    for (const current of modes) {
      for (const option of modes) {
        expect(isModeSelected(current, option)).toBe(current === option);
      }
    }
  });
});
