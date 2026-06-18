import { describe, it, expect } from "vitest";
import {
  cellKey,
  checkersCellView,
  checkersOutcomeLabel,
  checkersTurnLabel,
  checkersWinSide,
  hasForcedJump,
  legalDestinations,
  movablePieceKeys,
} from "./checkersView";
import {
  createCheckersBoard,
  legalCheckersMoves,
  type CheckersBoard,
} from "../../domain/checkers";

/** 모두 빈 8×8 보드. 특정 칸만 채워 점프/이동 시나리오를 만든다. */
function emptyBoard(): CheckersBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("cellKey", () => {
  it("row,col 문자열 키를 만든다", () => {
    expect(cellKey(2, 5)).toBe("2,5");
  });
});

describe("checkersCellView", () => {
  it("빈 칸은 글리프 없이 '빈 칸' 레이블", () => {
    expect(checkersCellView(null)).toEqual({ glyph: "", label: "빈 칸" });
  });

  it("일반 기물은 색 기호 ●/○ 와 흑/백 레이블(색 비의존)", () => {
    expect(checkersCellView({ color: "dark", king: false })).toEqual({
      glyph: "●",
      label: "흑",
    });
    expect(checkersCellView({ color: "light", king: false })).toEqual({
      glyph: "○",
      label: "백",
    });
  });

  it("king은 ♚/♔ 와 '왕' 레이블로 구분", () => {
    expect(checkersCellView({ color: "dark", king: true })).toEqual({
      glyph: "♚",
      label: "흑 왕",
    });
    expect(checkersCellView({ color: "light", king: true })).toEqual({
      glyph: "♔",
      label: "백 왕",
    });
  });
});

describe("checkersTurnLabel", () => {
  it("로컬 모드(humanColor=null)는 색 기호+흑/백 차례", () => {
    expect(checkersTurnLabel("dark", null, false)).toBe("● 흑 차례");
    expect(checkersTurnLabel("light", null, false)).toBe("○ 백 차례");
  });

  it("vs CPU에서 사람=흑이면 dark=내 차례·light=CPU 차례", () => {
    expect(checkersTurnLabel("dark", "dark", false)).toBe("● 내 차례");
    expect(checkersTurnLabel("light", "dark", false)).toBe("○ CPU 차례");
  });

  it("vs CPU에서 사람=백이면 light=내 차례·dark=CPU 차례", () => {
    expect(checkersTurnLabel("light", "light", false)).toBe("○ 내 차례");
    expect(checkersTurnLabel("dark", "light", false)).toBe("● CPU 차례");
  });

  it("연속 점프(continues)면 같은 기물 안내를 덧붙인다", () => {
    expect(checkersTurnLabel("dark", null, true)).toContain("연속 점프");
  });
});

describe("checkersOutcomeLabel", () => {
  it("진행 중(null)이면 빈 문자열", () => {
    expect(checkersOutcomeLabel(null)).toBe("");
  });

  it("승자를 색 기호+승리 문구로", () => {
    expect(checkersOutcomeLabel("dark")).toContain("흑");
    expect(checkersOutcomeLabel("dark")).toContain("승리");
    expect(checkersOutcomeLabel("light")).toContain("백");
  });
});

describe("checkersWinSide", () => {
  it("dark=a, light=b로 매핑(무승부 없음)", () => {
    expect(checkersWinSide("dark")).toBe("a");
    expect(checkersWinSide("light")).toBe("b");
  });
});

describe("legalDestinations", () => {
  it("초기 보드에서 한 기물의 합법 수만 추려 반환한다(domain 위임)", () => {
    const board = createCheckersBoard();
    // dark 기물 중 row 5의 한 칸(예: 5,0)에서 둘 수 있는 단순 이동.
    const dest = legalDestinations(board, { row: 5, col: 0 }, "dark");
    // 모두 from이 (5,0)이어야 한다.
    expect(dest.length).toBeGreaterThan(0);
    expect(dest.every((m) => m.from.row === 5 && m.from.col === 0)).toBe(true);
    // 전체 합법 수의 부분집합이다.
    const all = legalCheckersMoves(board, "dark");
    for (const m of dest) {
      expect(all).toContainEqual(m);
    }
  });

  it("점프 강제 상황에서 점프할 수 없는 기물은 빈 배열(같은 기물 제한·강제 점프)", () => {
    const board = emptyBoard();
    // dark man (5,2)이 light (4,3)을 뛰어넘어 (3,4)로 점프 가능. 다른 dark man (5,0)은 점프 불가.
    board[5]![2] = { color: "dark", king: false };
    board[4]![3] = { color: "light", king: false };
    board[5]![0] = { color: "dark", king: false };
    const jumper = legalDestinations(board, { row: 5, col: 2 }, "dark");
    expect(jumper).toHaveLength(1);
    expect(jumper[0]!.to).toEqual({ row: 3, col: 4 });
    expect(jumper[0]!.captured).toEqual({ row: 4, col: 3 });
    // 점프가 강제되므로 점프 못 하는 (5,0)은 둘 수 없다.
    expect(legalDestinations(board, { row: 5, col: 0 }, "dark")).toHaveLength(0);
  });
});

describe("hasForcedJump", () => {
  it("점프 가능 수가 있으면 true, 단순 이동만 있으면 false", () => {
    const board = emptyBoard();
    board[5]![2] = { color: "dark", king: false };
    board[4]![3] = { color: "light", king: false };
    expect(hasForcedJump(board, "dark")).toBe(true);

    const simple = emptyBoard();
    simple[5]![2] = { color: "dark", king: false };
    expect(hasForcedJump(simple, "dark")).toBe(false);
  });
});

describe("movablePieceKeys", () => {
  it("합법 수가 시작되는 기물 좌표만 키로 모은다", () => {
    const board = emptyBoard();
    board[5]![2] = { color: "dark", king: false }; // 이동 가능
    board[7]![0] = { color: "dark", king: false }; // (7,0)은 아래 막혀 위로만, 이동 가능
    const keys = movablePieceKeys(board, "dark");
    expect(keys.has("5,2")).toBe(true);
  });

  it("강제 점프 상황에서는 점프 가능한 기물만 포함된다", () => {
    const board = emptyBoard();
    board[5]![2] = { color: "dark", king: false };
    board[4]![3] = { color: "light", king: false };
    board[5]![0] = { color: "dark", king: false }; // 점프 불가
    const keys = movablePieceKeys(board, "dark");
    expect(keys.has("5,2")).toBe(true);
    expect(keys.has("5,0")).toBe(false);
  });
});
