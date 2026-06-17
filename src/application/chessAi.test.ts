import { describe, it, expect } from "vitest";
import { chooseRandomChessMove } from "./chessAi";
import {
  startChessGame,
  chessLegalMoves,
  type ChessGameState,
} from "./playChess";
import { createChessBoard, type ChessBoard } from "../domain/chess";
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

/** 모든 칸이 빈 8×8 체스판(특정 색의 합법 수가 0개인 상황을 만들기 위한 테스트 보드). */
function emptyBoard(): ChessBoard {
  return createChessBoard().map((row) => row.map(() => null));
}

describe("chooseRandomChessMove", () => {
  it("표준 초기 상태에서 백의 합법 수는 20개다", () => {
    expect(chessLegalMoves(startChessGame())).toHaveLength(20);
  });

  it("선택 결과는 항상 chessLegalMoves 후보 안에 있고 주입 인덱스로 결정적으로 고른다", () => {
    const state = startChessGame();
    const legal = chessLegalMoves(state);
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseRandomChessMove(state, fixedRng(i));
      expect(legal).toContainEqual(move);
      expect(move).toEqual(legal[i]);
    }
  });

  it("합법 수가 하나도 없으면 throw 한다", () => {
    // 백 기물이 하나도 없으면 백의 합법 수는 0개다.
    const state: ChessGameState = {
      board: emptyBoard(),
      next: "white",
      finished: false,
      winner: null,
      endReason: null,
    };
    expect(chessLegalMoves(state)).toHaveLength(0);
    expect(() => chooseRandomChessMove(state, fixedRng(0))).toThrow(
      /no legal moves/,
    );
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const state = startChessGame(); // 백 합법 수 20개
    expect(() => chooseRandomChessMove(state, fixedRng(20))).toThrow(
      /out-of-range/,
    );
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = startChessGame();
    const before = JSON.stringify(state);
    chooseRandomChessMove(state, fixedRng(0));
    expect(JSON.stringify(state)).toBe(before);
  });
});
