import { describe, it, expect } from "vitest";
import { chooseCpuChessMove } from "./chessCpuView";
import {
  startChessGame,
  chessLegalMoves,
  type ChessGameState,
} from "../../application/playChess";
import type { RandomSource } from "../../application/dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

describe("chooseCpuChessMove", () => {
  it("종료된 상태면 null을 반환한다(throw 하지 않음)", () => {
    const finished: ChessGameState = {
      ...startChessGame(),
      finished: true,
      winner: "white",
      endReason: "checkmate",
    };
    expect(chooseCpuChessMove(finished, fixedRng(0))).toBeNull();
  });

  it("미종료면 chooseRandomChessMove로 합법 수를 반환한다", () => {
    const state = startChessGame();
    const legal = chessLegalMoves(state);
    const move = chooseCpuChessMove(state, fixedRng(3));
    expect(move).toEqual(legal[3]);
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = startChessGame();
    const before = JSON.stringify(state);
    chooseCpuChessMove(state, fixedRng(0));
    expect(JSON.stringify(state)).toBe(before);
  });
});
