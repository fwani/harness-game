import { describe, it, expect } from "vitest";
import { chooseRandomJanggiMove } from "./janggiAi";
import {
  createEmptyBoard,
  legalMovesFrom,
  applyMove,
  isInCheck,
  isLegalMove,
  type Board,
  type Side,
  type Pos,
} from "../domain/janggi";
import type { JanggiMove } from "./janggiEngine";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/** 구현과 동일한 스캔 순서(y, x) + legalMovesFrom 순서로 side의 모든 합법 수를 열거한다. */
function enumerateMoves(board: Board, side: Side): JanggiMove[] {
  const moves: JanggiMove[] = [];
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === side) {
        const from: Pos = { x, y };
        for (const to of legalMovesFrom(board, side, from)) {
          moves.push({ from, to });
        }
      }
    }
  }
  return moves;
}

/**
 * cho 장이 장군(check) 상태인 보드:
 * - cho 장 (4,8, 궁성 중앙), han 차 (4,0)이 열 x=4를 따라 장군.
 * - han 장 (3,0)은 열 4 밖이라 차의 길을 막지 않는다.
 * cho 장의 기하적 이동 후보: (3,8)(5,8)(4,7)(4,9) 직선 + (3,7)(5,7)(3,9)(5,9) 궁성대각.
 * 이 중 (4,7)(4,9)는 열 4에 남아 여전히 장군(self-check) → 제외되어야 한다.
 */
function makeChoInCheckBoard(): Board {
  const board = createEmptyBoard();
  board[8]![4] = { side: "cho", type: "general" };
  board[0]![4] = { side: "han", type: "chariot" };
  board[0]![3] = { side: "han", type: "general" };
  return board;
}

describe("chooseRandomJanggiMove", () => {
  it("주입 인덱스로 결정적으로 고르고, 결과는 항상 합법 수 열거 안에 있다", () => {
    const board = makeChoInCheckBoard();
    const expected = enumerateMoves(board, "cho");
    expect(expected.length).toBeGreaterThan(0);
    for (let i = 0; i < expected.length; i += 1) {
      const move = chooseRandomJanggiMove(board, "cho", fixedRng(i));
      expect(move).toEqual(expected[i]);
    }
  });

  it("자기장군(self-check)이 되는 수는 결과에서 제외된다(장군 탈출 수만 반환)", () => {
    const board = makeChoInCheckBoard();
    expect(isInCheck(board, "cho")).toBe(true);

    const moves = enumerateMoves(board, "cho");
    // 후보로 뽑힌 모든 수는 둔 뒤 장군이 아니어야 한다.
    for (const m of moves) {
      const next = applyMove(board, "cho", m.from, m.to);
      expect(isInCheck(next, "cho")).toBe(false);
    }

    // (4,7)·(4,9)는 기하적으로는 합법이지만(장의 1칸 직선 이동),
    // 열 4에 남아 self-check이므로 chooseRandomJanggiMove 후보에서 빠진다.
    const from: Pos = { x: 4, y: 8 };
    expect(isLegalMove(board, "cho", from, { x: 4, y: 7 })).toBe(true);
    expect(isLegalMove(board, "cho", from, { x: 4, y: 9 })).toBe(true);
    const selfCheck: Pos[] = [
      { x: 4, y: 7 },
      { x: 4, y: 9 },
    ];
    for (const to of selfCheck) {
      expect(
        moves.some((m) => m.to.x === to.x && m.to.y === to.y),
      ).toBe(false);
    }

    // 여러 번 뽑아도 self-check 수는 절대 나오지 않는다.
    for (let i = 0; i < moves.length; i += 1) {
      const move = chooseRandomJanggiMove(board, "cho", fixedRng(i));
      const next = applyMove(board, "cho", move.from, move.to);
      expect(isInCheck(next, "cho")).toBe(false);
    }
  });

  it("합법 수가 하나도 없으면 throw 한다", () => {
    // han 기물만 있는 보드 — cho는 둘 수 있는 기물이 없다(후보 0개).
    const board = createEmptyBoard();
    board[0]![4] = { side: "han", type: "general" };
    expect(enumerateMoves(board, "cho")).toHaveLength(0);
    expect(() => chooseRandomJanggiMove(board, "cho", fixedRng(0))).toThrow(
      /no legal moves/,
    );
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = makeChoInCheckBoard();
    const n = enumerateMoves(board, "cho").length;
    expect(() => chooseRandomJanggiMove(board, "cho", fixedRng(n))).toThrow(
      /out-of-range/,
    );
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = makeChoInCheckBoard();
    const snapshot = JSON.stringify(board);
    chooseRandomJanggiMove(board, "cho", fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
