import { describe, it, expect } from "vitest";
import { createBoard, placeStone, type Board, type Stone } from "./go";

// 테스트 헬퍼: 좌표 목록을 순서대로 두며 보드를 구성한다(포획 무시).
function place(board: Board, moves: Array<[number, number, Stone]>): Board {
  let b = board;
  for (const [x, y, stone] of moves) {
    b = placeStone(b, x, y, stone).board;
  }
  return b;
}

describe("createBoard", () => {
  it("기본 크기 19×19 빈 보드를 만든다", () => {
    const board = createBoard();
    expect(board.length).toBe(19);
    expect(board.every((row) => row.length === 19)).toBe(true);
    expect(board.every((row) => row.every((cell) => cell === null))).toBe(true);
  });

  it("size를 지정할 수 있다", () => {
    expect(createBoard(9).length).toBe(9);
  });

  it("정수가 아니거나 1 미만이면 throw", () => {
    expect(() => createBoard(0)).toThrow();
    expect(() => createBoard(-1)).toThrow();
    expect(() => createBoard(1.5)).toThrow();
  });
});

describe("placeStone - 기본 착수/검증", () => {
  it("빈 칸에 돌을 두면 captured=0, 새 보드를 반환한다", () => {
    const board = createBoard(9);
    const { board: next, captured } = placeStone(board, 4, 4, "black");
    expect(captured).toBe(0);
    expect(next[4]![4]).toBe("black");
  });

  it("원본 보드를 변형하지 않는다(불변)", () => {
    const board = createBoard(9);
    placeStone(board, 4, 4, "black");
    expect(board[4]![4]).toBeNull();
  });

  it("이미 돌이 있는 칸이면 throw", () => {
    const board = placeStone(createBoard(9), 4, 4, "black").board;
    expect(() => placeStone(board, 4, 4, "white")).toThrow();
  });

  it("범위 밖이면 throw", () => {
    const board = createBoard(9);
    expect(() => placeStone(board, -1, 0, "black")).toThrow();
    expect(() => placeStone(board, 9, 0, "black")).toThrow();
    expect(() => placeStone(board, 0, 9, "black")).toThrow();
  });
});

describe("placeStone - 포획", () => {
  it("단일 돌을 4방향으로 둘러싸면 포획(captured=1)", () => {
    // 중앙 (4,4) 백을 흑이 상하좌우로 감싼다.
    let board = createBoard(9);
    board = place(board, [
      [4, 4, "white"],
      [4, 3, "black"],
      [3, 4, "black"],
      [5, 4, "black"],
    ]);
    const { board: next, captured } = placeStone(board, 4, 5, "black");
    expect(captured).toBe(1);
    expect(next[4]![4]).toBeNull();
  });

  it("연결된 다중 돌 그룹을 포획", () => {
    // 백 두 돌 (4,4),(5,4)를 흑이 모두 둘러싼다.
    let board = createBoard(9);
    board = place(board, [
      [4, 4, "white"],
      [5, 4, "white"],
      [4, 3, "black"],
      [5, 3, "black"],
      [3, 4, "black"],
      [6, 4, "black"],
      [4, 5, "black"],
    ]);
    const { board: next, captured } = placeStone(board, 5, 5, "black");
    expect(captured).toBe(2);
    expect(next[4]![4]).toBeNull();
    expect(next[4]![5]).toBeNull();
  });

  it("모서리 돌 포획(경계 활로 처리)", () => {
    // (0,0) 백을 흑 (1,0),(0,1)로 둘러싸면 포획.
    let board = createBoard(9);
    board = place(board, [
      [0, 0, "white"],
      [1, 0, "black"],
    ]);
    const { board: next, captured } = placeStone(board, 0, 1, "black");
    expect(captured).toBe(1);
    expect(next[0]![0]).toBeNull();
  });

  it("가장자리 돌 포획", () => {
    // (4,0) 백을 흑 (3,0),(5,0),(4,1)로 둘러싸면 포획.
    let board = createBoard(9);
    board = place(board, [
      [4, 0, "white"],
      [3, 0, "black"],
      [5, 0, "black"],
    ]);
    const { board: next, captured } = placeStone(board, 4, 1, "black");
    expect(captured).toBe(1);
    expect(next[0]![4]).toBeNull();
  });
});

describe("placeStone - 자살수", () => {
  it("자기 그룹 활로가 0이 되는 착수는 throw", () => {
    // (4,4)를 흑이 둘러싼 자리에 백을 두면 자살수.
    let board = createBoard(9);
    board = place(board, [
      [4, 3, "black"],
      [3, 4, "black"],
      [5, 4, "black"],
      [4, 5, "black"],
    ]);
    expect(() => placeStone(board, 4, 4, "white")).toThrow();
  });

  it("둘러싼 상대를 잡아 활로가 생기면 자살수가 아니다(포획 우선)", () => {
    // 흑이 (0,0) 하나만 활로(1,0)를 가진 채로 있고, 백이 그 활로를 메우는데
    // 동시에 흑을 포획하는 상황을 만든다.
    // 배치: (0,0) 흑. 백 (0,1). 백이 (1,0)에 두면 흑(0,0)의 마지막 활로가 사라져
    // 흑이 포획되고, 백 (1,0)은 빈 (0,0)을 활로로 얻는다.
    let board = createBoard(9);
    board = place(board, [
      [0, 0, "black"],
      [0, 1, "white"],
    ]);
    const { board: next, captured } = placeStone(board, 1, 0, "white");
    expect(captured).toBe(1);
    expect(next[0]![0]).toBeNull();
    expect(next[0]![1]).toBe("white");
  });
});
