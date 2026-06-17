import { describe, it, expect } from "vitest";
import type { PieceType, Side } from "../../domain/janggi";
import {
  pieceGlyph,
  sideName,
  sideMark,
  pieceName,
  pieceAriaLabel,
} from "./janggiView";

const TYPES: PieceType[] = [
  "general",
  "guard",
  "elephant",
  "horse",
  "chariot",
  "cannon",
  "soldier",
];
const SIDES: Side[] = ["cho", "han"];

describe("janggiView 접근성 헬퍼", () => {
  it("모든 기물의 한자가 양 진영에서 서로 달라 색 없이도 구분된다(#209 핵심)", () => {
    for (const type of TYPES) {
      const cho = pieceGlyph(type, "cho");
      const han = pieceGlyph(type, "han");
      expect(cho).not.toBe(han);
    }
  });

  it("모든 한자는 비어 있지 않다", () => {
    for (const type of TYPES) {
      for (const side of SIDES) {
        expect(pieceGlyph(type, side).length).toBeGreaterThan(0);
      }
    }
  });

  it("진영별 도형 표식은 색이 아닌 모양으로 구분된다", () => {
    expect(sideMark("cho")).toBe("●");
    expect(sideMark("han")).toBe("■");
    expect(sideMark("cho")).not.toBe(sideMark("han"));
  });

  it("진영 이름을 한국어로 돌려준다", () => {
    expect(sideName("cho")).toBe("초");
    expect(sideName("han")).toBe("한");
  });

  it("졸/병처럼 진영별로 이름이 다른 기물을 반영한다", () => {
    expect(pieceName("soldier", "cho")).toBe("졸");
    expect(pieceName("soldier", "han")).toBe("병");
    expect(pieceName("chariot", "cho")).toBe("차");
    expect(pieceName("chariot", "han")).toBe("차");
  });

  it("접근성 라벨은 진영+기물 이름을 텍스트로 제공한다(색 비의존)", () => {
    expect(pieceAriaLabel("chariot", "cho")).toBe("초 차");
    expect(pieceAriaLabel("chariot", "han")).toBe("한 차");
    expect(pieceAriaLabel("soldier", "han")).toBe("한 병");
    expect(pieceAriaLabel("general", "cho")).toBe("초 장");
  });
});
