import { describe, it, expect } from "vitest";
import {
  chooseRandomCheckersMove,
  playCheckersMove,
} from "./playCheckers";
import {
  createCheckersBoard,
  legalCheckersMoves,
  pieceAt,
  type CheckersBoard,
  type CheckersCell,
} from "../domain/checkers";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁(maxExclusive 검증 포함). */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/**
 * row-major 행 문자열 배열을 8×8 보드로 만든다(상단 row0 → 하단 row7).
 * '.'=빈 칸, 'd'=dark man, 'D'=dark king, 'l'=light man, 'L'=light king.
 */
function boardFrom(rows: string[]): CheckersBoard {
  return rows.map((line) =>
    [...line].map((ch): CheckersCell => {
      switch (ch) {
        case "d":
          return { color: "dark", king: false };
        case "D":
          return { color: "dark", king: true };
        case "l":
          return { color: "light", king: false };
        case "L":
          return { color: "light", king: true };
        default:
          return null;
      }
    }),
  );
}

describe("chooseRandomCheckersMove", () => {
  it("초기 보드 dark의 합법 수를 주입 인덱스로 결정적으로 고른다", () => {
    const board = createCheckersBoard();
    const moves = legalCheckersMoves(board, "dark");
    expect(moves.length).toBeGreaterThan(0);
    for (let i = 0; i < moves.length; i += 1) {
      expect(chooseRandomCheckersMove(board, "dark", fixedRng(i))).toStrictEqual(moves[i]);
    }
  });

  it("강제 점프 상황에서는 점프 수만 후보로 나온다(도메인 위임)", () => {
    // dark man (5,2)가 light (4,3)을 점프할 수 있고, 단순 이동도 보드에 존재.
    const board = boardFrom([
      "........",
      "........",
      "........",
      "........",
      "...l....",
      "..d.....",
      "........",
      "........",
    ]);
    const moves = legalCheckersMoves(board, "dark");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.captured !== undefined)).toBe(true);
    const chosen = chooseRandomCheckersMove(board, "dark", fixedRng(0));
    expect(chosen?.captured).toBeDefined();
  });

  it("둘 곳이 하나도 없으면 null", () => {
    const empty = boardFrom([
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    expect(chooseRandomCheckersMove(empty, "dark", fixedRng(0))).toBeNull();
  });

  it("범위 밖 인덱스를 주면 throw", () => {
    const board = createCheckersBoard();
    const count = legalCheckersMoves(board, "dark").length;
    expect(() => chooseRandomCheckersMove(board, "dark", fixedRng(count))).toThrow();
  });
});

describe("playCheckersMove", () => {
  it("단순 이동: continues=false, nextToMove=상대 색", () => {
    // dark man (5,0) 단순 전진, light man (2,2)는 이동 가능(게임 진행 중).
    const board = boardFrom([
      "........",
      "........",
      "..l.....",
      "........",
      "........",
      "d.......",
      "........",
      "........",
    ]);
    const moves = legalCheckersMoves(board, "dark");
    expect(moves).toHaveLength(1);
    const result = playCheckersMove(board, moves[0]!, "dark");
    expect(result.continues).toBe(false);
    expect(result.nextToMove).toBe("light");
    expect(result.winner).toBeNull();
    expect(result.over).toBe(false);
    // 착수 후 보드에 dark가 (4,1)로 이동.
    expect(pieceAt(result.board, 4, 1)).toEqual({ color: "dark", king: false });
    expect(pieceAt(result.board, 5, 0)).toBeNull();
  });

  it("점프 후 추가 점프 가능: continues=true, nextToMove=같은 색", () => {
    // dark (5,2)가 light (4,3)을 점프 → (3,4) 착지 후 light (2,3)을 또 점프 가능.
    const board = boardFrom([
      "........",
      "........",
      "...l....",
      "........",
      "...l....",
      "..d.....",
      "........",
      "........",
    ]);
    const moves = legalCheckersMoves(board, "dark");
    expect(moves).toHaveLength(1);
    expect(moves[0]!.captured).toEqual({ row: 4, col: 3 });
    const result = playCheckersMove(board, moves[0]!, "dark");
    expect(result.continues).toBe(true);
    expect(result.nextToMove).toBe("dark");
    expect(result.winner).toBeNull();
    expect(result.over).toBe(false);
  });

  it("점프로 승급 시 continues=false(승급 즉시 턴 종료)", () => {
    // dark man (2,1)이 light (1,2)를 점프 → (0,3) 승급. king이 되면 (1,4) light를 또 점프할 수
    // 있지만 승급 즉시 턴 종료여야 한다.
    const board = boardFrom([
      "........",
      "..l.l...",
      ".d......",
      "........",
      "........",
      "........",
      "........",
      "........",
    ]);
    const moves = legalCheckersMoves(board, "dark");
    expect(moves).toHaveLength(1);
    expect(moves[0]!.to).toEqual({ row: 0, col: 3 });
    const result = playCheckersMove(board, moves[0]!, "dark");
    expect(result.continues).toBe(false);
    expect(result.nextToMove).toBe("light");
    // 승급되어 king이 됨.
    expect(pieceAt(result.board, 0, 3)).toEqual({ color: "dark", king: true });
  });

  it("마지막 상대 기물을 점프하면 winner 세팅·over=true", () => {
    // dark (5,2)가 유일한 light (4,3)을 점프 → light 전멸.
    const board = boardFrom([
      "........",
      "........",
      "........",
      "........",
      "...l....",
      "..d.....",
      "........",
      "........",
    ]);
    const moves = legalCheckersMoves(board, "dark");
    expect(moves).toHaveLength(1);
    const result = playCheckersMove(board, moves[0]!, "dark");
    expect(result.continues).toBe(false);
    expect(result.winner).toBe("dark");
    expect(result.over).toBe(true);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = boardFrom([
      "........",
      "........",
      "..l.....",
      "........",
      "........",
      "d.......",
      "........",
      "........",
    ]);
    const snapshot = JSON.stringify(board);
    const moves = legalCheckersMoves(board, "dark");
    playCheckersMove(board, moves[0]!, "dark");
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
