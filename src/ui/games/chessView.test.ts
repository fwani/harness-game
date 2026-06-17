import { describe, it, expect } from "vitest";
import {
  legalTargetsFrom,
  chessSquareView,
  chessStatusLabel,
  chessMoveErrorReason,
  chessWinSide,
} from "./chessView";
import {
  startChessGame,
  applyChessMove,
  chessLegalMoves,
  type ChessGameState,
} from "../../application/playChess";
import type { ChessBoard, ChessCell } from "../../domain/chess";

/** 모두 빈 8×8 보드(인공 종국/체크 상태 구성용). */
function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as ChessCell));
}

/** Fool's mate(최단 외통)로 흑이 백을 외통하는 종료 상태를 만든다. */
function foolsMateState(): ChessGameState {
  let s = startChessGame();
  s = applyChessMove(s, { row: 6, col: 5 }, { row: 5, col: 5 }); // 1. f3
  s = applyChessMove(s, { row: 1, col: 4 }, { row: 3, col: 4 }); // 1... e5
  s = applyChessMove(s, { row: 6, col: 6 }, { row: 4, col: 6 }); // 2. g4
  s = applyChessMove(s, { row: 0, col: 3 }, { row: 4, col: 7 }); // 2... Qh4#
  return s;
}

describe("legalTargetsFrom", () => {
  it("선택한 기물의 합법 도착 칸이 chessLegalMoves(state)의 같은 from 부분집합과 일치한다", () => {
    const state = startChessGame();
    const from = { row: 7, col: 1 }; // 백 나이트 b1
    const got = legalTargetsFrom(state, from).map((t) => `${t.row},${t.col}`).sort();
    const expected = chessLegalMoves(state)
      .filter((m) => m.from.row === from.row && m.from.col === from.col)
      .map((m) => `${m.to.row},${m.to.col}`)
      .sort();
    expect(got).toEqual(expected);
    expect(got.length).toBeGreaterThan(0);
  });

  it("현재 차례가 아닌 기물(흑)·빈 칸은 빈 배열을 반환한다", () => {
    const state = startChessGame(); // 백 차례
    expect(legalTargetsFrom(state, { row: 0, col: 1 })).toEqual([]); // 흑 나이트
    expect(legalTargetsFrom(state, { row: 4, col: 4 })).toEqual([]); // 빈 칸
  });

  it("게임이 끝났으면 어떤 칸도 도착 칸이 없다(입력 차단)", () => {
    const state = foolsMateState();
    expect(state.finished).toBe(true);
    // 종료 상태에서는 어느 칸을 골라도 합법 도착 칸이 없다.
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        expect(legalTargetsFrom(state, { row, col })).toEqual([]);
      }
    }
  });
});

describe("chessSquareView", () => {
  it("현재 차례 기물(합법 수 있음)은 selectable, 상대 기물은 아니다", () => {
    const state = startChessGame();
    const whiteKnight = chessSquareView(state, null, { row: 7, col: 1 });
    expect(whiteKnight.selectable).toBe(true);
    expect(whiteKnight.color).toBe("white");
    expect(whiteKnight.glyph).toBe("♘");
    expect(whiteKnight.pieceLabel).toBe("백 나이트");

    const blackKnight = chessSquareView(state, null, { row: 0, col: 1 });
    expect(blackKnight.selectable).toBe(false);
    expect(blackKnight.color).toBe("black");
    expect(blackKnight.glyph).toBe("♞");
  });

  it("선택 칸은 selected, 그 기물의 합법 도착 칸은 target으로 표시된다", () => {
    const state = startChessGame();
    const from = { row: 7, col: 1 }; // 백 나이트 b1
    const targets = legalTargetsFrom(state, from);
    const dest = targets[0]!;
    expect(chessSquareView(state, from, from).selected).toBe(true);
    const destView = chessSquareView(state, from, dest);
    expect(destView.target).toBe(true);
    expect(destView.ariaLabel).toContain("둘 수 있는 칸");
  });

  it("빈 칸은 빈 칸 라벨과 빈 글리프를 가진다", () => {
    const state = startChessGame();
    const v = chessSquareView(state, null, { row: 4, col: 4 });
    expect(v.glyph).toBe("");
    expect(v.color).toBeNull();
    expect(v.pieceLabel).toBe("빈 칸");
  });

  it("aria-label은 좌표(a1~h8)와 기물 설명을 포함한다", () => {
    const state = startChessGame();
    // row7,col0 = a1 백 룩.
    const v = chessSquareView(state, null, { row: 7, col: 0 });
    expect(v.ariaLabel).toContain("a1");
    expect(v.ariaLabel).toContain("백 룩");
  });

  it("종료 후에는 어떤 칸도 selectable하지 않다", () => {
    const state = foolsMateState();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        expect(chessSquareView(state, null, { row, col }).selectable).toBe(false);
      }
    }
  });
});

describe("chessStatusLabel", () => {
  it("시작 상태는 백 차례 안내", () => {
    expect(chessStatusLabel(startChessGame())).toContain("백 차례");
  });

  it("장군(체크)이지만 종료가 아니면 장군 경고를 표시한다", () => {
    const board = emptyBoard();
    board[0]![7] = { color: "black", type: "king" }; // h8
    board[7]![7] = { color: "white", type: "rook" }; // h1 — h파일 장군
    board[7]![0] = { color: "white", type: "king" }; // a1
    const state: ChessGameState = {
      board,
      next: "black",
      finished: false,
      winner: null,
      endReason: null,
    };
    const label = chessStatusLabel(state);
    expect(label).toContain("흑 차례");
    expect(label).toContain("장군");
  });

  it("외통(체크메이트)은 둔 쪽 승리를 표시한다", () => {
    const state = foolsMateState();
    expect(state.endReason).toBe("checkmate");
    expect(state.winner).toBe("black");
    const label = chessStatusLabel(state);
    expect(label).toContain("외통수");
    expect(label).toContain("흑 승리");
  });

  it("스테일메이트는 무승부로 표시한다", () => {
    const board = emptyBoard();
    board[0]![7] = { color: "black", type: "king" }; // h8
    board[1]![5] = { color: "white", type: "king" }; // f7
    board[2]![6] = { color: "white", type: "queen" }; // g6
    const state: ChessGameState = {
      board,
      next: "black",
      finished: true,
      winner: null,
      endReason: "stalemate",
    };
    const label = chessStatusLabel(state);
    expect(label).toContain("스테일메이트");
    expect(label).toContain("무승부");
  });
});

describe("chessMoveErrorReason", () => {
  it("종료된 게임 착수 에러를 한국어로 매핑한다", () => {
    const state = foolsMateState();
    let thrown: unknown;
    try {
      applyChessMove(state, { row: 6, col: 0 }, { row: 5, col: 0 });
    } catch (e) {
      thrown = e;
    }
    expect(chessMoveErrorReason(thrown)).toBe("이미 종료된 게임입니다.");
  });

  it("빈 칸 착수 에러를 매핑한다", () => {
    const state = startChessGame();
    let thrown: unknown;
    try {
      applyChessMove(state, { row: 4, col: 4 }, { row: 3, col: 4 });
    } catch (e) {
      thrown = e;
    }
    expect(chessMoveErrorReason(thrown)).toBe("빈 칸에서는 둘 수 없습니다.");
  });

  it("상대 차례 기물 착수 에러를 매핑한다", () => {
    const state = startChessGame(); // 백 차례
    let thrown: unknown;
    try {
      applyChessMove(state, { row: 1, col: 4 }, { row: 2, col: 4 }); // 흑 폰
    } catch (e) {
      thrown = e;
    }
    expect(chessMoveErrorReason(thrown)).toBe("현재 차례의 기물이 아닙니다.");
  });

  it("합법 수가 아닌 착수 에러를 매핑한다", () => {
    const state = startChessGame();
    let thrown: unknown;
    try {
      // 백 룩 a1 → a4 (앞 폰에 막혀 불법).
      applyChessMove(state, { row: 7, col: 0 }, { row: 4, col: 0 });
    } catch (e) {
      thrown = e;
    }
    expect(chessMoveErrorReason(thrown)).toBe("둘 수 없는 칸입니다 (합법 수가 아닙니다).");
  });

  it("알 수 없는 에러·비 Error 값은 일반 사유로 폴백한다", () => {
    expect(chessMoveErrorReason(new Error("무관한 메시지"))).toBe("둘 수 없는 수입니다.");
    expect(chessMoveErrorReason("문자열 에러")).toBe("둘 수 없는 수입니다.");
  });
});

describe("chessWinSide", () => {
  it("백 승=a, 흑 승=b, 무승부=draw", () => {
    const white: ChessGameState = {
      board: emptyBoard(),
      next: "white",
      finished: true,
      winner: "white",
      endReason: "checkmate",
    };
    const black: ChessGameState = { ...white, winner: "black" };
    const draw: ChessGameState = { ...white, winner: null, endReason: "stalemate" };
    expect(chessWinSide(white)).toBe("a");
    expect(chessWinSide(black)).toBe("b");
    expect(chessWinSide(draw)).toBe("draw");
  });
});
