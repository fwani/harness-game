import { describe, it, expect } from "vitest";
import { legalGoMoves } from "./goMoves";
import { createBoard, type Board, type Stone } from "./go";

// 테스트 헬퍼: 빈 보드에 좌표 목록을 직접 배치한다(포획 없이 국면을 그대로 구성).
function setup(size: number, stones: Array<[number, number, Stone]>): Board {
  const board = createBoard(size);
  for (const [x, y, stone] of stones) {
    board[y]![x] = stone;
  }
  return board;
}

describe("legalGoMoves", () => {
  it("빈 보드: 모든 칸이 합법 수이고 정렬 순서(y→x)가 결정적", () => {
    const size = 3;
    const moves = legalGoMoves(createBoard(size), "black");
    expect(moves).toHaveLength(size * size);
    // y 오름차순, 같은 y 내 x 오름차순으로 평탄화된 순서와 정확히 일치.
    const expected = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        expected.push({ x, y });
      }
    }
    expect(moves).toEqual(expected);
  });

  it("점유 칸은 결과에서 제외된다", () => {
    const board = setup(3, [[0, 0, "black"], [1, 1, "white"]]);
    const moves = legalGoMoves(board, "black");
    expect(moves).not.toContainEqual({ x: 0, y: 0 });
    expect(moves).not.toContainEqual({ x: 1, y: 1 });
    // 빈 칸 7개만 남는다.
    expect(moves).toHaveLength(3 * 3 - 2);
  });

  it("자살수(상대 돌에 둘러싸인 빈 칸)는 제외된다", () => {
    // 중앙 (2,2)를 흑이 상하좌우로 둘러쌌다. 백이 (2,2)에 두면 활로 0 → 자살수.
    const board = setup(5, [
      [2, 1, "black"],
      [1, 2, "black"],
      [3, 2, "black"],
      [2, 3, "black"],
    ]);
    const whiteMoves = legalGoMoves(board, "white");
    expect(whiteMoves).not.toContainEqual({ x: 2, y: 2 });
    // 같은 칸이라도 흑은 둘 수 있다(주변 흑과 연결되어 활로가 생긴다).
    const blackMoves = legalGoMoves(board, "black");
    expect(blackMoves).toContainEqual({ x: 2, y: 2 });
  });

  // 전형적인 패(ko) 모양(goKo.test.ts와 동일 구성).
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
  // 직전 국면: a=(2,2)에 백, b=(3,2)는 빈 칸.
  function previousState(): Board {
    return setup(5, [...BLACK_RING, ...WHITE_RING, [2, 2, "white"]]);
  }
  // 현재 국면: b=(3,2)에 흑, a=(2,2)는 빈 칸. 흑이 백 한 점을 따낸 직후.
  function currentState(): Board {
    return setup(5, [...BLACK_RING, ...WHITE_RING, [3, 2, "black"]]);
  }

  it("패(ko) 위반 점은 previousBoard가 주어지면 제외된다", () => {
    // 백이 (2,2)에 두면 직전 국면을 재현 → 패 위반.
    const withPrev = legalGoMoves(currentState(), "white", previousState());
    expect(withPrev).not.toContainEqual({ x: 2, y: 2 });
    // previousBoard 미지정 시에는 합법 수로 포함된다(자살수도 아님).
    const noPrev = legalGoMoves(currentState(), "white");
    expect(noPrev).toContainEqual({ x: 2, y: 2 });
  });

  it("둘 곳이 없으면 빈 배열을 반환한다(throw 안 함)", () => {
    // 보드를 가득 채우면 후보(빈 칸)가 없다.
    const board = setup(2, [
      [0, 0, "black"],
      [1, 0, "white"],
      [0, 1, "white"],
      [1, 1, "black"],
    ]);
    expect(legalGoMoves(board, "black")).toEqual([]);
  });

  it("입력 board / previousBoard를 변형하지 않는다(불변)", () => {
    const board = currentState();
    const prev = previousState();
    const boardSnapshot = JSON.stringify(board);
    const prevSnapshot = JSON.stringify(prev);
    legalGoMoves(board, "white", prev);
    expect(JSON.stringify(board)).toBe(boardSnapshot);
    expect(JSON.stringify(prev)).toBe(prevSnapshot);
  });
});
