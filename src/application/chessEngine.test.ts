import { describe, it, expect } from "vitest";
import { createChessEngine, type ChessMove } from "./chessEngine";
import {
  startChessGame,
  chessLegalMoves,
  type ChessGameState,
} from "./playChess";
import type { ChessBoard, ChessPiece } from "../domain/chess";

const engine = createChessEngine();

/** 빈 8×8 보드(모든 칸 null). */
function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

/** 보드 깊은 스냅샷(불변 검증용). */
function snapshot(board: ChessBoard): ChessBoard {
  return board.map((row) => row.slice());
}

/** 커스텀 기물 배치로 미종료 상태를 만든다(테스트용). */
function stateWith(
  pieces: { row: number; col: number; piece: ChessPiece }[],
  next: ChessGameState["next"],
): ChessGameState {
  const board = emptyBoard();
  for (const { row, col, piece } of pieces) {
    board[row]![col] = piece;
  }
  return { board, next, finished: false, winner: null, endReason: null };
}

describe("createChessEngine — interface & side mapping", () => {
  it("init() 후 turn()은 p1(white 선), 초기 status는 미종료", () => {
    const state = engine.init();
    expect(engine.turn(state)).toBe("p1");
    expect(engine.status(state)).toEqual({
      over: false,
      winner: null,
      draw: false,
    });
  });

  it("black 차례 상태의 turn()은 p2", () => {
    const state: ChessGameState = { ...startChessGame(), next: "black" };
    expect(engine.turn(state)).toBe("p2");
  });
});

describe("createChessEngine — isLegal (throw 금지)", () => {
  it("합법 수 + 올바른 차례 → true", () => {
    const state = engine.init();
    const m = chessLegalMoves(state)[0]!;
    expect(engine.isLegal(state, m, "p1")).toBe(true);
  });

  it("잘못된 차례(by 불일치) → false", () => {
    const state = engine.init();
    const m = chessLegalMoves(state)[0]!;
    expect(engine.isLegal(state, m, "p2")).toBe(false);
  });

  it("보드 밖 / 빈 칸 출발 / 불법 이동 → false (throw 안 함)", () => {
    const state = engine.init();
    const cases: ChessMove[] = [
      // 보드 밖 좌표.
      { from: { row: -1, col: 0 }, to: { row: 0, col: 0 } },
      { from: { row: 0, col: 0 }, to: { row: 99, col: 99 } },
      // 빈 칸 출발(중앙은 비어 있음).
      { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
      // 폰 후퇴(불법): 백 폰 e2(row6,col4)는 뒤로 못 간다.
      { from: { row: 6, col: 4 }, to: { row: 7, col: 4 } },
    ];
    for (const m of cases) {
      expect(engine.isLegal(state, m, "p1")).toBe(false);
    }
  });

  it("종료된 게임 → isLegal false", () => {
    const finished: ChessGameState = {
      board: emptyBoard(),
      next: "white",
      finished: true,
      winner: "white",
      endReason: "checkmate",
    };
    expect(engine.status(finished).over).toBe(true);
    const m: ChessMove = { from: { row: 6, col: 4 }, to: { row: 5, col: 4 } };
    expect(engine.isLegal(finished, m, "p1")).toBe(false);
  });
});

describe("createChessEngine — apply 위임 & 불변", () => {
  it("합법 수 적용 후 차례 토글(p1→p2), 입력 state 불변", () => {
    const before = engine.init();
    const beforeBoard = snapshot(before.board);
    const m = chessLegalMoves(before)[0]!;
    const after = engine.apply(before, m, "p1");
    expect(engine.turn(after)).toBe("p2");
    // 입력 state는 변형되지 않는다.
    expect(before.next).toBe("white");
    expect(before.board).toEqual(beforeBoard);
  });

  it("불법 수 / 잘못된 차례 apply → throw", () => {
    const state = engine.init();
    const legal = chessLegalMoves(state)[0]!;
    // 잘못된 차례.
    expect(() => engine.apply(state, legal, "p2")).toThrow();
    // 불법 이동(폰 후퇴).
    const illegal: ChessMove = {
      from: { row: 6, col: 4 },
      to: { row: 7, col: 4 },
    };
    expect(() => engine.apply(state, illegal, "p1")).toThrow();
  });
});

describe("createChessEngine — 종료 판정", () => {
  it("외통(백 룩 백랭크 메이트)으로 종료 → over, winner=둔 쪽(p1), draw=false", () => {
    // 흑 킹 g8(0,6), 흑 폰 f7/g7/h7(1,5·1,6·1,7)로 도주로 차단, 백 룩 a6(2,0), 백 킹 e1(7,4).
    // 백 룩 a6→a8(0,0)로 백랭크 체크 → 외통.
    const state = stateWith(
      [
        { row: 0, col: 6, piece: { color: "black", type: "king" } },
        { row: 1, col: 5, piece: { color: "black", type: "pawn" } },
        { row: 1, col: 6, piece: { color: "black", type: "pawn" } },
        { row: 1, col: 7, piece: { color: "black", type: "pawn" } },
        { row: 2, col: 0, piece: { color: "white", type: "rook" } },
        { row: 7, col: 4, piece: { color: "white", type: "king" } },
      ],
      "white",
    );
    const m: ChessMove = { from: { row: 2, col: 0 }, to: { row: 0, col: 0 } };
    expect(engine.isLegal(state, m, "p1")).toBe(true);
    const after = engine.apply(state, m, "p1");
    expect(after.endReason).toBe("checkmate");
    expect(engine.status(after)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
    // 종료 후에는 어떤 수도 불법.
    const next = chessLegalMoves({ ...after, finished: false });
    if (next.length > 0) {
      expect(engine.isLegal(after, next[0]!, engine.turn(after))).toBe(false);
    }
  });

  it("스테일메이트로 종료 → over, winner=null, draw=true", () => {
    // 흑 킹 a8(0,0), 백 킹 a6(2,0), 백 퀸 c6(2,2), 백 차례.
    // 백 퀸 c6→b6(2,1) → 흑은 체크가 아니지만 둘 곳이 없다 → 스테일메이트(무승부).
    const state = stateWith(
      [
        { row: 0, col: 0, piece: { color: "black", type: "king" } },
        { row: 2, col: 0, piece: { color: "white", type: "king" } },
        { row: 2, col: 2, piece: { color: "white", type: "queen" } },
      ],
      "white",
    );
    const m: ChessMove = { from: { row: 2, col: 2 }, to: { row: 2, col: 1 } };
    expect(engine.isLegal(state, m, "p1")).toBe(true);
    const after = engine.apply(state, m, "p1");
    expect(after.endReason).toBe("stalemate");
    expect(after.winner).toBeNull();
    expect(engine.status(after)).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
  });
});
