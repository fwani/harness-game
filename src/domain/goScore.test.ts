import { describe, it, expect } from "vitest";
import { createBoard, type Board, type Stone } from "./go";
import { scoreArea } from "./goScore";

// 테스트 헬퍼: 좌표 목록을 보드에 직접 배치한다(포획·합법성 검사 없이 임의 배치).
function setup(size: number, stones: Array<[number, number, Stone]>): Board {
  const board = createBoard(size);
  for (const [x, y, stone] of stones) {
    board[y]![x] = stone;
  }
  return board;
}

describe("scoreArea - 빈 보드", () => {
  it("빈 보드는 black=white=0, 모든 빈 칸 neutral, winner=null", () => {
    const board = createBoard(5);
    const score = scoreArea(board);
    expect(score.black).toBe(0);
    expect(score.white).toBe(0);
    expect(score.territory.neutral).toBe(25);
    expect(score.territory.black).toBe(0);
    expect(score.territory.white).toBe(0);
    expect(score.winner).toBeNull();
  });
});

describe("scoreArea - 집(territory) 분류", () => {
  it("한 색이 빈 칸을 완전히 둘러싸면 그 빈 칸은 해당 색 집", () => {
    // 3×3 보드, 중앙(1,1)을 흑이 상하좌우로 둘러싼다.
    const board = setup(3, [
      [1, 0, "black"],
      [0, 1, "black"],
      [2, 1, "black"],
      [1, 2, "black"],
    ]);
    const score = scoreArea(board);
    // 모서리 4칸 + 중앙 1칸 = 빈 칸 5개. 중앙은 흑에만 닿음.
    // 모서리는 흑 돌에만 닿으므로(대각선 무시) 역시 흑 집.
    expect(score.territory.black).toBe(5);
    expect(score.territory.white).toBe(0);
    expect(score.territory.neutral).toBe(0);
    expect(score.black).toBe(4 + 5); // 돌 4 + 집 5
    expect(score.white).toBe(0);
    expect(score.winner).toBe("black");
  });

  it("두 색에 모두 닿는 빈 영역(공배)은 neutral", () => {
    // 1×3 가로줄: 흑 _ 백 → 가운데 빈 칸은 양쪽에 닿아 공배.
    const board = setup(3, [
      [0, 1, "black"],
      [2, 1, "white"],
    ]);
    const score = scoreArea(board);
    // 모든 빈 칸이 하나의 영역으로 연결되어 흑·백 모두에 닿음 → 전부 neutral.
    expect(score.territory.black).toBe(0);
    expect(score.territory.white).toBe(0);
    expect(score.territory.neutral).toBe(7); // 9칸 - 돌 2개
    expect(score.black).toBe(1);
    expect(score.white).toBe(1);
    expect(score.winner).toBeNull();
  });

  it("흑·백이 각자 모서리를 둘러싸면 각 색 집으로 분류된다", () => {
    // 5×5: 흑이 좌상단 모서리(0,0)를, 백이 우하단 모서리(4,4)를 각각 고립시킨다.
    const board = setup(5, [
      [1, 0, "black"],
      [0, 1, "black"],
      [3, 4, "white"],
      [4, 3, "white"],
    ]);
    const score = scoreArea(board);
    // (0,0) 1칸은 흑에만, (4,4) 1칸은 백에만 닿는 고립 영역. 나머지 가운데는 공배.
    expect(score.territory.black).toBe(1);
    expect(score.territory.white).toBe(1);
    expect(score.territory.neutral).toBe(25 - 4 - 1 - 1);
    expect(score.black).toBe(2 + 1);
    expect(score.white).toBe(2 + 1);
    expect(score.winner).toBeNull();
  });

  it("돌 수 + 집 합산이 각 색 점수와 일치한다", () => {
    const board = setup(3, [
      [1, 0, "black"],
      [0, 1, "black"],
      [2, 1, "black"],
      [1, 2, "black"],
    ]);
    const score = scoreArea(board);
    const blackStones = 4;
    expect(score.black).toBe(blackStones + score.territory.black);
  });
});

describe("scoreArea - 덤(komi)", () => {
  it("komi는 백 점수에 더해진다", () => {
    const board = setup(3, [
      [0, 0, "black"],
      [2, 2, "white"],
    ]);
    const base = scoreArea(board);
    const withKomi = scoreArea(board, 6.5);
    expect(withKomi.white).toBe(base.white + 6.5);
    expect(withKomi.black).toBe(base.black);
  });

  it("komi로 인해 winner가 바뀐다", () => {
    // 흑 1돌, 백 1돌, 나머지 공배 → 덤 없으면 동점(winner=null).
    const board = setup(3, [
      [0, 1, "black"],
      [2, 1, "white"],
    ]);
    expect(scoreArea(board).winner).toBeNull();
    // komi 0.5를 주면 백이 앞선다.
    expect(scoreArea(board, 0.5).winner).toBe("white");
  });

  it("동점이면 winner=null", () => {
    const board = setup(3, [
      [0, 0, "black"],
      [2, 2, "white"],
    ]);
    const score = scoreArea(board);
    expect(score.black).toBe(score.white);
    expect(score.winner).toBeNull();
  });
});

describe("scoreArea - 불변성", () => {
  it("입력 board를 변형하지 않는다", () => {
    const board = setup(3, [
      [1, 0, "black"],
      [0, 1, "black"],
      [2, 1, "black"],
      [1, 2, "black"],
    ]);
    const snapshot = board.map((row) => row.slice());
    scoreArea(board, 6.5);
    expect(board).toEqual(snapshot);
  });
});
