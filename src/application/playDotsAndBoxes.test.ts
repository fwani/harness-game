import { describe, it, expect } from "vitest";
import { chooseRandomDotsEdge, playDotsAndBoxesTurn } from "./playDotsAndBoxes";
import {
  availableEdges,
  createDotsAndBoxesBoard,
  type DotsBoard,
  type DotsEdge,
  type DotsPlayer,
} from "../domain/dotsAndBoxes";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 반환하는 결정적 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/** 주어진 변들을 그어진 상태로 표시한 새 보드를 만든다(박스 소유는 건드리지 않음). */
function withEdges(board: DotsBoard, edges: DotsEdge[]): DotsBoard {
  const next = createDotsAndBoxesBoard(board.rows, board.cols);
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      next.boxes[r]![c] = board.boxes[r]![c]!;
    }
  }
  for (const e of edges) {
    const grid = e.orientation === "h" ? next.edges.h : next.edges.v;
    grid[e.row]![e.col] = true;
  }
  return next;
}

const h = (row: number, col: number): DotsEdge => ({ orientation: "h", row, col });
const v = (row: number, col: number): DotsEdge => ({ orientation: "v", row, col });

describe("chooseRandomDotsEdge", () => {
  it("빈 1×1 보드의 변은 4개이고, 주입 인덱스로 결정적으로 고른다", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    const edges = availableEdges(board);
    expect(edges).toHaveLength(4);
    for (let i = 0; i < edges.length; i += 1) {
      expect(chooseRandomDotsEdge(board, fixedRng(i))).toEqual(edges[i]);
    }
  });

  it("선택 결과는 항상 아직 안 그어진 변에만 속한다", () => {
    // 1×2 보드(변 7개)에서 일부를 그어 둔다.
    const board = withEdges(createDotsAndBoxesBoard(1, 2), [h(0, 0), v(0, 1)]);
    const edges = availableEdges(board);
    expect(edges).toHaveLength(5);
    for (let i = 0; i < edges.length; i += 1) {
      expect(chooseRandomDotsEdge(board, fixedRng(i))).toEqual(edges[i]);
    }
  });

  it("그을 변이 하나도 없으면(모든 변 그어짐) null을 반환한다", () => {
    const board = withEdges(createDotsAndBoxesBoard(1, 1), [
      h(0, 0),
      h(1, 0),
      v(0, 0),
      v(0, 1),
    ]);
    expect(availableEdges(board)).toHaveLength(0);
    expect(chooseRandomDotsEdge(board, fixedRng(0))).toBeNull();
  });

  it("RandomSource가 범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createDotsAndBoxesBoard(1, 1); // 변 4개
    expect(() => chooseRandomDotsEdge(board, fixedRng(4))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createDotsAndBoxesBoard(2, 2);
    const snapshot = JSON.stringify(board);
    chooseRandomDotsEdge(board, fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("playDotsAndBoxesTurn", () => {
  it("박스를 완성하지 못하면 again=false·nextPlayer=상대, 진행 중", () => {
    const board = createDotsAndBoxesBoard(1, 2);
    const result = playDotsAndBoxesTurn(board, h(0, 0), 1);
    expect(result.completed).toEqual([]);
    expect(result.again).toBe(false);
    expect(result.nextPlayer).toBe(2);
    expect(result.over).toBe(false);
    expect(result.winner).toBeUndefined();
    // 착수 반영(입력 불변 — 새 보드).
    expect(result.board.edges.h[0]![0]).toBe(true);
    expect(board.edges.h[0]![0]).toBe(false);
  });

  it("박스를 완성하면 again=true·nextPlayer=같은 player·completed 반영(게임은 진행 중)", () => {
    // 1×2 보드. 왼쪽 박스(0,0)의 네 변 중 v(0,1)만 남긴 상태에서 player1이 v(0,1)을 그어 완성.
    const board = withEdges(createDotsAndBoxesBoard(1, 2), [h(0, 0), h(1, 0), v(0, 0)]);
    const result = playDotsAndBoxesTurn(board, v(0, 1), 1);
    expect(result.completed).toEqual([{ row: 0, col: 0 }]);
    expect(result.again).toBe(true);
    expect(result.nextPlayer).toBe(1);
    expect(result.over).toBe(false); // 오른쪽 박스 변이 남음
    expect(result.winner).toBeUndefined();
    expect(result.board.boxes[0]![0]).toBe(1);
  });

  it("마지막 변으로 박스를 완성하며 종료되면 over=true·winner 세팅·again=false", () => {
    // 1×1 보드. 마지막 변 v(0,1)을 player1이 그어 유일한 박스를 완성하고 종료.
    const board = withEdges(createDotsAndBoxesBoard(1, 1), [h(0, 0), h(1, 0), v(0, 0)]);
    const result = playDotsAndBoxesTurn(board, v(0, 1), 1);
    expect(result.completed).toEqual([{ row: 0, col: 0 }]);
    expect(result.over).toBe(true);
    expect(result.again).toBe(false); // 종료 시 보너스 턴 없음
    expect(result.winner).toBe(1); // p1=1, p2=0
    expect(result.nextPlayer).toBe(1); // 종료 시 현재 player 유지
  });

  it("종료 시 박스 동수면 무승부(winner=null)", () => {
    // 1×2 보드. 박스(0,0)은 player2가 이미 소유, 마지막 변 v(0,2)로 player1이 박스(0,1)을 완성 → 1:1.
    const base = createDotsAndBoxesBoard(1, 2);
    base.boxes[0]![0] = 2 as DotsPlayer;
    const board = withEdges(base, [
      h(0, 0),
      h(1, 0),
      v(0, 0),
      v(0, 1), // 박스(0,0)의 변 + 박스(0,1)의 왼쪽 변(공유)
      h(0, 1),
      h(1, 1), // 박스(0,1)의 위/아래 변 (v(0,2)만 남음)
    ]);
    const result = playDotsAndBoxesTurn(board, v(0, 2), 1);
    expect(result.completed).toEqual([{ row: 0, col: 1 }]);
    expect(result.over).toBe(true);
    expect(result.winner).toBeNull(); // 1:1 무승부
  });

  it("이미 그어진 변에 두면 illegal move로 throw 한다", () => {
    const board = withEdges(createDotsAndBoxesBoard(1, 1), [h(0, 0)]);
    expect(() => playDotsAndBoxesTurn(board, h(0, 0), 1)).toThrow(/illegal move/);
  });

  it("범위 밖 변에 두면 illegal move로 throw 한다", () => {
    const board = createDotsAndBoxesBoard(1, 1);
    expect(() => playDotsAndBoxesTurn(board, h(2, 0), 1)).toThrow(/illegal move/);
    expect(() => playDotsAndBoxesTurn(board, v(0, -1), 1)).toThrow(/illegal move/);
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createDotsAndBoxesBoard(2, 2);
    const snapshot = JSON.stringify(board);
    playDotsAndBoxesTurn(board, h(0, 0), 1);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
