import { describe, it, expect } from "vitest";
import { boardsEqual, violatesKo } from "./goKo";
import { createBoard, type Board, type Stone } from "./go";

// 테스트 헬퍼: 빈 보드에 좌표 목록을 직접 배치한다(포획 없이 국면을 그대로 구성).
function setup(size: number, stones: Array<[number, number, Stone]>): Board {
  const board = createBoard(size);
  for (const [x, y, stone] of stones) {
    board[y]![x] = stone;
  }
  return board;
}

describe("boardsEqual", () => {
  it("동일한 보드면 true", () => {
    const a = setup(5, [[2, 2, "black"], [1, 1, "white"]]);
    const b = setup(5, [[2, 2, "black"], [1, 1, "white"]]);
    expect(boardsEqual(a, b)).toBe(true);
  });

  it("한 칸만 달라도 false", () => {
    const a = setup(5, [[2, 2, "black"]]);
    const b = setup(5, [[2, 2, "white"]]);
    expect(boardsEqual(a, b)).toBe(false);
  });

  it("크기가 다르면 false", () => {
    expect(boardsEqual(createBoard(5), createBoard(9))).toBe(false);
  });
});

// 전형적인 패(ko) 모양을 5×5 보드로 구성한다.
// 두 다툼점 a=(2,2), b=(3,2). 흑은 a를 바깥에서, 백은 b를 바깥에서 둘러싼다.
const BLACK_RING: Array<[number, number, Stone]> = [
  [2, 1, "black"],
  [2, 3, "black"],
  [1, 2, "black"],
];
const WHITE_RING: Array<[number, number, Stone]> = [
  [3, 1, "white"],
  [3, 3, "white"],
  [4, 2, "white"],
];

// 직전 국면(State 1): a=(2,2)에 백, b=(3,2)는 빈 칸.
function previousState(): Board {
  return setup(5, [...BLACK_RING, ...WHITE_RING, [2, 2, "white"]]);
}

// 현재 국면(State 2): b=(3,2)에 흑, a=(2,2)는 빈 칸. 흑이 백 한 점을 따낸 직후.
function currentState(): Board {
  return setup(5, [...BLACK_RING, ...WHITE_RING, [3, 2, "black"]]);
}

describe("violatesKo", () => {
  it("직전 국면을 그대로 재현하는 되따냄 수는 패 위반(true)", () => {
    // State 2에서 백이 a=(2,2)에 두면 b의 흑을 따내 State 1을 그대로 재현한다.
    expect(violatesKo(currentState(), 2, 2, "white", previousState())).toBe(true);
  });

  it("포획이 일어나도 결과가 직전 국면과 다르면 패 아님(false)", () => {
    // 백 한 점(0,0)이 활로 1개. 흑이 (1,0)에 두면 백을 따낸다.
    const board = setup(5, [[0, 0, "white"], [0, 1, "black"]]);
    const result = violatesKo(board, 1, 0, "black", createBoard(5));
    expect(result).toBe(false);
  });

  it("이미 돌이 있는 칸이면 false(throw 안 함)", () => {
    const board = setup(5, [[2, 2, "black"]]);
    expect(violatesKo(board, 2, 2, "white", previousState())).toBe(false);
  });

  it("범위 밖 좌표면 false(throw 안 함)", () => {
    expect(violatesKo(createBoard(5), 5, 5, "black", createBoard(5))).toBe(false);
  });

  it("입력 보드들을 변형하지 않는다(불변)", () => {
    const board = currentState();
    const prev = previousState();
    const boardSnapshot = JSON.stringify(board);
    const prevSnapshot = JSON.stringify(prev);
    violatesKo(board, 2, 2, "white", prev);
    expect(JSON.stringify(board)).toBe(boardSnapshot);
    expect(JSON.stringify(prev)).toBe(prevSnapshot);
  });
});
