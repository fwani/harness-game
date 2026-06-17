import { describe, it, expect } from "vitest";
import { createInitialBoard } from "../../domain/janggi";
import type { PieceType, Side } from "../../domain/janggi";
import {
  pieceGlyph,
  sideName,
  sideMark,
  pieceName,
  pieceAriaLabel,
  capturedPieces,
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

describe("capturedPieces 따냄 현황", () => {
  // 초기 배치 보드의 첫 번째 (side, type) 기물 위치를 찾는다.
  const findPiece = (
    board: ReturnType<typeof createInitialBoard>,
    side: Side,
    type: PieceType,
  ): { x: number; y: number } => {
    for (let y = 0; y < board.length; y++) {
      const row = board[y]!;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x]!;
        if (cell !== null && cell.side === side && cell.type === type) {
          return { x, y };
        }
      }
    }
    throw new Error(`piece not found: ${side} ${type}`);
  };

  it("초기 배치에는 양 진영 따냄이 모두 없다", () => {
    const board = createInitialBoard();
    const captured = capturedPieces(board);
    expect(captured.cho).toEqual([]);
    expect(captured.han).toEqual([]);
  });

  it("상대 기물이 사라지면 그 반대 진영의 따냄으로 집계한다", () => {
    const board = createInitialBoard();
    // 한(漢) 졸 1개와 초(楚) 포 1개를 보드에서 제거(=잡힌 상황).
    const hanSoldier = findPiece(board, "han", "soldier");
    const choCannon = findPiece(board, "cho", "cannon");
    board[hanSoldier.y]![hanSoldier.x] = null;
    board[choCannon.y]![choCannon.x] = null;

    const captured = capturedPieces(board);
    // 한 졸이 사라졌으니 초가 따낸 것.
    expect(captured.cho).toEqual([{ type: "soldier", count: 1 }]);
    // 초 포가 사라졌으니 한이 따낸 것.
    expect(captured.han).toEqual([{ type: "cannon", count: 1 }]);
  });

  it("같은 종류를 여러 개 잡으면 개수가 합산된다", () => {
    const board = createInitialBoard();
    let removed = 0;
    for (let y = 0; y < board.length && removed < 2; y++) {
      const row = board[y]!;
      for (let x = 0; x < row.length && removed < 2; x++) {
        const cell = row[x]!;
        if (cell !== null && cell.side === "han" && cell.type === "soldier") {
          board[y]![x] = null;
          removed += 1;
        }
      }
    }
    expect(removed).toBe(2);
    expect(capturedPieces(board).cho).toEqual([{ type: "soldier", count: 2 }]);
  });

  it("따냄 집계는 표시 순서(가치 큰 기물 우선)를 따른다", () => {
    const board = createInitialBoard();
    // 한(漢)의 졸 1개와 차 1개를 제거 → 초의 따냄. chariot이 soldier보다 먼저 와야 한다.
    const hanSoldier = findPiece(board, "han", "soldier");
    const hanChariot = findPiece(board, "han", "chariot");
    board[hanSoldier.y]![hanSoldier.x] = null;
    board[hanChariot.y]![hanChariot.x] = null;
    expect(capturedPieces(board).cho).toEqual([
      { type: "chariot", count: 1 },
      { type: "soldier", count: 1 },
    ]);
  });
});
