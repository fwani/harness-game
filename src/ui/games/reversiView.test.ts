import { describe, it, expect } from "vitest";
import { moveKey, legalMoveKeySet, reversiWinSide } from "./reversiView";
import { startReversiGame, applyReversiTurn } from "../../application/playReversi";
import { legalReversiMoves } from "../../domain/reversiMoves";

describe("reversiView helpers", () => {
  it("moveKey는 좌표를 'x,y'로 직렬화한다", () => {
    expect(moveKey(2, 3)).toBe("2,3");
    expect(moveKey(0, 0)).toBe("0,0");
  });

  it("legalMoveKeySet은 시작 보드(흑 선)에서 표준 합법 수 4곳을 담는다", () => {
    const state = startReversiGame();
    const set = legalMoveKeySet(state.board, state.next);
    // 표준 오델로 시작 합법 수: (2,3) (3,2) (4,5) (5,4)
    expect(set.size).toBe(4);
    expect(set.has("2,3")).toBe(true);
    expect(set.has("3,2")).toBe(true);
    expect(set.has("4,5")).toBe(true);
    expect(set.has("5,4")).toBe(true);
    expect(set.has("0,0")).toBe(false);
  });

  it("legalMoveKeySet은 domain legalReversiMoves와 동일한 좌표를 반영한다", () => {
    const state = applyReversiTurn(startReversiGame(), 2, 3);
    const moves = legalReversiMoves(state.board, state.next);
    const set = legalMoveKeySet(state.board, state.next);
    expect(set.size).toBe(moves.length);
    for (const m of moves) {
      expect(set.has(moveKey(m.x, m.y))).toBe(true);
    }
  });

  it("reversiWinSide는 흑→a, 백→b, 무승부→draw로 매핑한다", () => {
    expect(reversiWinSide("black")).toBe("a");
    expect(reversiWinSide("white")).toBe("b");
    expect(reversiWinSide("draw")).toBe("draw");
  });
});
