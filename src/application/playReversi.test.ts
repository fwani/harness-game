import { describe, it, expect } from "vitest";
import {
  startReversiGame,
  applyReversiTurn,
  reversiResult,
  type ReversiState,
} from "./playReversi";
import { createReversiBoard, type Board, type Stone } from "../domain/reversi";
import { legalReversiMoves, hasLegalReversiMove } from "../domain/reversiMoves";

/** 모든 칸이 black인 8×8 보드를 만든다(테스트용 근종료 보드 구성에 사용). */
function allBlackBoard(): Board {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => "black" as Stone),
  );
}

describe("startReversiGame", () => {
  it("표준 초기 배치(흑 선)로 시작한다", () => {
    const state = startReversiGame();
    expect(state.next).toBe("black");
    expect(state.finished).toBe(false);
    expect(state.lastWasPass).toBe(false);
    // 중앙 4개 디스크가 표준 배치와 동일.
    expect(state.board).toEqual(createReversiBoard());
    expect(state.board[3]![3]).toBe("white");
    expect(state.board[4]![4]).toBe("white");
    expect(state.board[3]![4]).toBe("black");
    expect(state.board[4]![3]).toBe("black");
  });
});

describe("applyReversiTurn — 정상 진행", () => {
  it("초기 흑의 합법 수를 두면 보드가 갱신되고 차례가 백으로 토글된다", () => {
    const state = startReversiGame();
    const moves = legalReversiMoves(state.board, "black");
    expect(moves.length).toBe(4); // 표준 오프닝은 흑 4수.
    const { x, y } = moves[0]!;

    const next = applyReversiTurn(state, x, y);
    expect(next.next).toBe("white");
    expect(next.finished).toBe(false);
    expect(next.lastWasPass).toBe(false);
    // 둔 칸이 흑으로 채워졌다.
    expect(next.board[y]![x]).toBe("black");
    // 입력 state는 변형되지 않는다(불변).
    expect(state.next).toBe("black");
    expect(state.board[y]![x]).toBeNull();
    expect(state.board).toEqual(createReversiBoard());
  });
});

describe("applyReversiTurn — 예외", () => {
  it("비합법 수(뒤집힘 0개)는 throw 한다", () => {
    const state = startReversiGame();
    // (0,0)은 어떤 디스크도 뒤집지 못하는 비합법 수.
    expect(() => applyReversiTurn(state, 0, 0)).toThrow();
  });

  it("종료된 게임에 착수하면 throw 한다", () => {
    const finished: ReversiState = {
      board: allBlackBoard(),
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(() => applyReversiTurn(finished, 0, 0)).toThrow(/finished/);
  });
});

describe("applyReversiTurn — 자동 패스", () => {
  it("상대가 둘 곳이 없으면 차례가 둘 수 있는 쪽으로 유지되고 lastWasPass=true", () => {
    // 두 개의 빈 칸(C1=(0,0), C2=(0,2))만 남기고 나머지는 black.
    // 각 빈 칸의 +x 방향에 white 한 개와 그 너머 black이 있어 흑만 둘 수 있다.
    const board = allBlackBoard();
    board[0]![0] = null; // C1: 이번 턴에 흑이 둔다.
    board[0]![1] = "white";
    board[2]![0] = null; // C2: 남겨진다(흑 합법, 백 비합법).
    board[2]![1] = "white";

    // 전제: 흑은 (0,0)에 둘 수 있고, 백은 어디에도 둘 수 없다.
    expect(hasLegalReversiMove(board, "black")).toBe(true);
    expect(hasLegalReversiMove(board, "white")).toBe(false);

    const state: ReversiState = {
      board,
      next: "black",
      finished: false,
      lastWasPass: false,
    };
    const next = applyReversiTurn(state, 0, 0);

    expect(next.finished).toBe(false);
    expect(next.lastWasPass).toBe(true);
    expect(next.next).toBe("black"); // 백은 패스되어 차례가 흑에게 되돌아온다.
    // 흑이 둔 칸과 뒤집힌 칸이 흑이 됐다.
    expect(next.board[0]![0]).toBe("black");
    expect(next.board[0]![1]).toBe("black");
    // C2는 그대로 비어 있고 흑이 둘 수 있다.
    expect(next.board[2]![0]).toBeNull();
    expect(hasLegalReversiMove(next.board, "black")).toBe(true);
  });
});

describe("applyReversiTurn / reversiResult — 종료·승자 판정", () => {
  it("착수 후 양쪽 모두 둘 곳이 없으면 finished=true, 승자를 디스크 수로 판정한다", () => {
    // (0,0)만 비우고 +x에 white 하나. 흑이 (0,0)에 두면 보드가 가득 차 양쪽 모두 둘 곳이 없다.
    const board = allBlackBoard();
    board[0]![0] = null;
    board[0]![1] = "white";

    const state: ReversiState = {
      board,
      next: "black",
      finished: false,
      lastWasPass: false,
    };
    const next = applyReversiTurn(state, 0, 0);

    expect(next.finished).toBe(true);
    // 보드가 전부 흑(64) → 흑 승.
    expect(reversiResult(next)).toBe("black");
  });

  it("미종료 상태에서는 reversiResult가 null", () => {
    const state = startReversiGame();
    expect(reversiResult(state)).toBeNull();
  });

  it("종료 시 디스크 수가 같으면 draw", () => {
    // 흑 32 / 백 32로 가득 찬 종료 상태(상단 4행 흑, 하단 4행 백).
    const board: Board = Array.from({ length: 8 }, (_unused, y) =>
      Array.from({ length: 8 }, () => (y < 4 ? "black" : "white") as Stone),
    );
    const state: ReversiState = {
      board,
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(reversiResult(state)).toBe("draw");
  });

  it("종료 시 백이 더 많으면 white 승", () => {
    // 상단 5행 백 / 하단 3행 흑(백 40 / 흑 24) → 백 승.
    const board: Board = Array.from({ length: 8 }, (_unused, y) =>
      Array.from({ length: 8 }, () => (y < 5 ? "white" : "black") as Stone),
    );
    const state: ReversiState = {
      board,
      next: "black",
      finished: true,
      lastWasPass: true,
    };
    expect(reversiResult(state)).toBe("white");
  });
});
