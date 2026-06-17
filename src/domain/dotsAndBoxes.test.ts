import { describe, it, expect } from "vitest";
import {
  availableEdges,
  countDotsBoxes,
  createDotsAndBoxesBoard,
  drawEdge,
  findDotsWinner,
  isDotsGameOver,
  type DotsBoard,
  type DotsEdge,
  type DotsPlayer,
} from "./dotsAndBoxes";

/** edge를 순서대로 그어 보드를 진행한다(테스트 빌더). completed 검증이 필요 없을 때 사용. */
function draws(board: DotsBoard, moves: ReadonlyArray<[DotsEdge, DotsPlayer]>): DotsBoard {
  let b = board;
  for (const [edge, player] of moves) {
    b = drawEdge(b, edge, player).board;
  }
  return b;
}

/** 박스 (boxRow,boxCol)의 네 변을 좌표로 돌려준다(완성 케이스 구성용). */
function boxEdges(boxRow: number, boxCol: number): DotsEdge[] {
  return [
    { orientation: "h", row: boxRow, col: boxCol }, // 위
    { orientation: "h", row: boxRow + 1, col: boxCol }, // 아래
    { orientation: "v", row: boxRow, col: boxCol }, // 왼쪽
    { orientation: "v", row: boxRow, col: boxCol + 1 }, // 오른쪽
  ];
}

describe("dotsAndBoxes createDotsAndBoxesBoard", () => {
  it("creates edge/box grids sized to rows×cols, all empty", () => {
    const board = createDotsAndBoxesBoard(2, 3);
    expect(board.rows).toBe(2);
    expect(board.cols).toBe(3);
    // 수평 변: (rows+1) × cols
    expect(board.edges.h.length).toBe(3);
    expect(board.edges.h.every((r) => r.length === 3)).toBe(true);
    // 수직 변: rows × (cols+1)
    expect(board.edges.v.length).toBe(2);
    expect(board.edges.v.every((r) => r.length === 4)).toBe(true);
    // 박스: rows × cols
    expect(board.boxes.length).toBe(2);
    expect(board.boxes.every((r) => r.length === 3)).toBe(true);
    // 모두 빈 상태
    expect(board.edges.h.flat().every((e) => e === false)).toBe(true);
    expect(board.edges.v.flat().every((e) => e === false)).toBe(true);
    expect(board.boxes.flat().every((o) => o === null)).toBe(true);
  });

  it("returns independent instances on each call (mutating one does not affect the other)", () => {
    const a = createDotsAndBoxesBoard(2, 2);
    const b = createDotsAndBoxesBoard(2, 2);
    a.edges.h[0]![0] = true;
    a.boxes[0]![0] = 1;
    expect(b.edges.h[0]![0]).toBe(false);
    expect(b.boxes[0]![0]).toBe(null);
  });
});

describe("dotsAndBoxes availableEdges", () => {
  it("counts all edges on an empty board: rows*(cols+1) + cols*(rows+1)", () => {
    const board = createDotsAndBoxesBoard(2, 3);
    const expected = 2 * (3 + 1) + 3 * (2 + 1); // 수직 + 수평 = 8 + 9 = 17
    expect(availableEdges(board).length).toBe(expected);
  });

  it("shrinks by one after an edge is drawn", () => {
    const board = createDotsAndBoxesBoard(2, 2);
    const before = availableEdges(board).length;
    const { board: next } = drawEdge(board, { orientation: "h", row: 0, col: 0 }, 1);
    expect(availableEdges(next).length).toBe(before - 1);
  });
});

describe("dotsAndBoxes drawEdge", () => {
  it("draws an edge on a new board without mutating the input", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    const edge: DotsEdge = { orientation: "h", row: 0, col: 0 };
    const { board: next, completed } = drawEdge(board, edge, 1);
    expect(next.edges.h[0]![0]).toBe(true);
    expect(completed).toEqual([]);
    // 입력 불변
    expect(board.edges.h[0]![0]).toBe(false);
    expect(next).not.toBe(board);
  });

  it("returns no completed boxes when the box is not yet finished", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    const { completed } = drawEdge(board, { orientation: "h", row: 0, col: 0 }, 1);
    expect(completed.length).toBe(0);
  });

  it("completes a single box with the 4th edge and assigns the owner", () => {
    let board = createDotsAndBoxesBoard(1, 1);
    const edges = boxEdges(0, 0);
    // 처음 세 변: 미완성
    board = draws(board, [
      [edges[0]!, 1],
      [edges[1]!, 2],
      [edges[2]!, 1],
    ]);
    expect(board.boxes[0]![0]).toBe(null);
    // 네 번째 변으로 완성
    const { board: next, completed } = drawEdge(board, edges[3]!, 2);
    expect(completed).toEqual([{ row: 0, col: 0 }]);
    expect(next.boxes[0]![0]).toBe(2);
  });

  it("completes two boxes at once with a single shared edge", () => {
    // 1×2 보드: 가운데 수직 변(v at row0,col1)이 양쪽 박스의 마지막 변이 되도록 구성.
    let board = createDotsAndBoxesBoard(1, 2);
    // 왼쪽 박스(0,0)의 위/아래/왼쪽, 오른쪽 박스(0,1)의 위/아래/오른쪽을 모두 긋는다.
    board = draws(board, [
      [{ orientation: "h", row: 0, col: 0 }, 1], // 왼쪽 위
      [{ orientation: "h", row: 1, col: 0 }, 1], // 왼쪽 아래
      [{ orientation: "v", row: 0, col: 0 }, 1], // 왼쪽 왼쪽
      [{ orientation: "h", row: 0, col: 1 }, 1], // 오른쪽 위
      [{ orientation: "h", row: 1, col: 1 }, 1], // 오른쪽 아래
      [{ orientation: "v", row: 0, col: 2 }, 1], // 오른쪽 오른쪽
    ]);
    expect(board.boxes[0]![0]).toBe(null);
    expect(board.boxes[0]![1]).toBe(null);
    // 가운데 공유 변 하나로 두 박스 동시 완성
    const { board: next, completed } = drawEdge(board, { orientation: "v", row: 0, col: 1 }, 2);
    expect(completed).toHaveLength(2);
    expect(next.boxes[0]![0]).toBe(2);
    expect(next.boxes[0]![1]).toBe(2);
  });

  it("rejects an already-drawn edge without mutating (returns same board, empty completed)", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    const edge: DotsEdge = { orientation: "h", row: 0, col: 0 };
    const { board: drawn } = drawEdge(board, edge, 1);
    const result = drawEdge(drawn, edge, 2);
    expect(result.board).toBe(drawn); // 원본 그대로 반환
    expect(result.completed).toEqual([]);
  });

  it("rejects an out-of-range edge without throwing", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    // h 변의 col은 0..cols-1(=0)이어야 하므로 col=1은 범위 밖
    const result = drawEdge(board, { orientation: "h", row: 0, col: 1 }, 1);
    expect(result.board).toBe(board);
    expect(result.completed).toEqual([]);
  });

  it("rejects an invalid player value", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    const result = drawEdge(board, { orientation: "h", row: 0, col: 0 }, 3 as DotsPlayer);
    expect(result.board).toBe(board);
    expect(result.completed).toEqual([]);
  });
});

describe("dotsAndBoxes isDotsGameOver / countDotsBoxes / findDotsWinner", () => {
  it("reports undefined winner and not-over while edges remain", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    expect(isDotsGameOver(board)).toBe(false);
    expect(findDotsWinner(board)).toBeUndefined();
  });

  it("declares the box-majority player the winner when all edges are drawn", () => {
    // 1×2 보드를 끝까지 채워 두 박스를 모두 player 1이 갖게 만든다.
    let board = createDotsAndBoxesBoard(1, 2);
    // 모든 변을 player 1이 긋는다(소유는 완성한 사람에게 귀속).
    for (const edge of availableEdges(board)) {
      board = drawEdge(board, edge, 1).board;
    }
    expect(isDotsGameOver(board)).toBe(true);
    expect(countDotsBoxes(board, 1) + countDotsBoxes(board, 2)).toBe(2); // 박스 합 = 전체
    expect(countDotsBoxes(board, 1)).toBe(2);
    expect(findDotsWinner(board)).toBe(1);
  });

  it("returns null (draw) when both players own the same number of boxes", () => {
    // 1×2 보드에서 각자 박스 1개씩 갖도록 구성한다.
    let board = createDotsAndBoxesBoard(1, 2);
    // 왼쪽 박스(0,0): player 1이 마지막 변(v 0,0)으로 완성
    board = draws(board, [
      [{ orientation: "h", row: 0, col: 0 }, 2],
      [{ orientation: "h", row: 1, col: 0 }, 2],
      [{ orientation: "v", row: 0, col: 1 }, 2],
    ]);
    let res = drawEdge(board, { orientation: "v", row: 0, col: 0 }, 1);
    expect(res.completed).toEqual([{ row: 0, col: 0 }]);
    board = res.board;
    // 오른쪽 박스(0,1): player 2가 마지막 변(v 0,2)으로 완성
    board = draws(board, [
      [{ orientation: "h", row: 0, col: 1 }, 1],
      [{ orientation: "h", row: 1, col: 1 }, 1],
    ]);
    res = drawEdge(board, { orientation: "v", row: 0, col: 2 }, 2);
    expect(res.completed).toEqual([{ row: 0, col: 1 }]);
    board = res.board;

    expect(isDotsGameOver(board)).toBe(true);
    expect(countDotsBoxes(board, 1)).toBe(1);
    expect(countDotsBoxes(board, 2)).toBe(1);
    expect(findDotsWinner(board)).toBeNull();
  });
});
