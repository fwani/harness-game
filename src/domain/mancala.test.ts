import { describe, it, expect } from "vitest";
import {
  applyMancalaMove,
  createMancalaBoard,
  findMancalaWinner,
  isMancalaGameOver,
  legalMancalaMoves,
  type MancalaBoard,
} from "./mancala";

/** 곳간 합 + 양쪽 구덩이 합(총 씨앗 보존 검증용). */
function totalSeeds(board: MancalaBoard): number {
  const pitSum = (p: 1 | 2): number => board.pits[p].reduce((a, c) => a + c, 0);
  return board.stores[1] + board.stores[2] + pitSum(1) + pitSum(2);
}

/** 테스트용 보드 빌더(구덩이/곳간을 직접 지정). */
function makeBoard(
  pits1: number[],
  pits2: number[],
  store1 = 0,
  store2 = 0,
): MancalaBoard {
  return {
    pitsPerSide: pits1.length,
    pits: { 1: [...pits1], 2: [...pits2] },
    stores: { 1: store1, 2: store2 },
  };
}

describe("createMancalaBoard", () => {
  it("기본 6·4 초기 배치(구덩이 합 48, 곳간 0)", () => {
    const board = createMancalaBoard();
    expect(board.pitsPerSide).toBe(6);
    expect(board.pits[1]).toEqual([4, 4, 4, 4, 4, 4]);
    expect(board.pits[2]).toEqual([4, 4, 4, 4, 4, 4]);
    expect(board.stores).toEqual({ 1: 0, 2: 0 });
    expect(totalSeeds(board)).toBe(48);
  });

  it("인자로 구덩이 수·씨앗 수를 커스터마이즈한다", () => {
    const board = createMancalaBoard(4, 3);
    expect(board.pitsPerSide).toBe(4);
    expect(board.pits[1]).toEqual([3, 3, 3, 3]);
    expect(board.pits[2]).toEqual([3, 3, 3, 3]);
    expect(totalSeeds(board)).toBe(24);
  });

  it("매 호출 독립 인스턴스(배열 공유 금지)", () => {
    const a = createMancalaBoard();
    const b = createMancalaBoard();
    a.pits[1][0] = 99;
    expect(b.pits[1][0]).toBe(4);
    expect(a.pits[1]).not.toBe(a.pits[2]);
  });
});

describe("legalMancalaMoves", () => {
  it("씨앗이 있는 구덩이 인덱스만 반환한다", () => {
    const board = makeBoard([4, 0, 2, 0, 0, 1], [4, 4, 4, 4, 4, 4]);
    expect(legalMancalaMoves(board, 1)).toEqual([0, 2, 5]);
  });

  it("종료 상태(한쪽 전부 빔)면 빈 배열", () => {
    const board = makeBoard([0, 0, 0, 0, 0, 0], [1, 2, 0, 0, 0, 0]);
    expect(isMancalaGameOver(board)).toBe(true);
    expect(legalMancalaMoves(board, 2)).toEqual([]);
  });
});

describe("applyMancalaMove — 씨 뿌리기", () => {
  it("자기 곳간을 지나며 떨구고 상대 곳간은 건너뛴다(한 바퀴 초과 분배)", () => {
    // player 1, pit 0에서 14개 → 한 바퀴(13슬롯)를 넘겨 pit0·pit1 래핑까지 분배.
    const board = makeBoard([14, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
    const { board: next, again, captured } = applyMancalaMove(board, 1, 0);
    // 자기 구덩이: pit0 래핑 1, pit1은 첫 바퀴+래핑 2, pit2..5 각 1.
    expect(next.pits[1]).toEqual([1, 2, 1, 1, 1, 1]);
    // 자기 곳간 1개.
    expect(next.stores[1]).toBe(1);
    // 상대 구덩이 0..5 1개씩, 상대 곳간은 건너뛰어 0.
    expect(next.pits[2]).toEqual([1, 1, 1, 1, 1, 1]);
    expect(next.stores[2]).toBe(0);
    expect(again).toBe(false);
    expect(captured).toBe(0); // 마지막 착지 pit1은 비어있지 않아 미포획
    expect(totalSeeds(next)).toBe(14);
  });

  it("일반 분배: 마지막이 상대 구덩이면 포획·한 번 더 없음", () => {
    // player 1, pit 5(3개) → 자기 곳간 + 상대 pit0, pit1. (pit0 잔여로 종료 아님)
    const board = makeBoard([1, 0, 0, 0, 0, 3], [4, 4, 4, 4, 4, 4]);
    const { board: next, again, captured } = applyMancalaMove(board, 1, 5);
    expect(next.pits[1]).toEqual([1, 0, 0, 0, 0, 0]);
    expect(next.stores[1]).toBe(1);
    expect(next.pits[2]).toEqual([5, 5, 4, 4, 4, 4]);
    expect(again).toBe(false);
    expect(captured).toBe(0);
  });
});

describe("applyMancalaMove — 한 번 더(again)", () => {
  it("마지막 씨앗이 자기 곳간에 정확히 떨어지면 again=true", () => {
    // player 1, pit 5(1개) → 자기 곳간.
    const board = makeBoard([0, 0, 0, 0, 0, 1], [4, 4, 4, 4, 4, 4]);
    const { again, captured, board: next } = applyMancalaMove(board, 1, 5);
    expect(again).toBe(true);
    expect(captured).toBe(0);
    expect(next.stores[1]).toBe(1);
  });

  it("곳간을 지나치면 again=false", () => {
    // player 1, pit 5(2개) → 곳간 + 상대 pit0.
    const board = makeBoard([0, 0, 0, 0, 0, 2], [0, 0, 0, 0, 0, 0]);
    const { again } = applyMancalaMove(board, 1, 5);
    expect(again).toBe(false);
  });
});

describe("applyMancalaMove — 포획(capture)", () => {
  it("자기 빈 구덩이 착지 + 맞은편 씨앗 존재 → 포획", () => {
    // player 1, pit 2(1개) → pit3(빈 칸)에 착지. 맞은편 = 상대 (n-1-3)=2번, 5개.
    const board = makeBoard([0, 0, 1, 0, 0, 0], [0, 0, 5, 0, 0, 0]);
    const { board: next, captured, again } = applyMancalaMove(board, 1, 2);
    expect(again).toBe(false);
    expect(captured).toBe(6); // 맞은편 5 + 마지막 1
    expect(next.stores[1]).toBe(6);
    expect(next.pits[1][3]).toBe(0); // 착지 구덩이 비움
    expect(next.pits[2][2]).toBe(0); // 맞은편 비움
    expect(totalSeeds(next)).toBe(6);
  });

  it("맞은편이 0이면 미포획(자기 빈 구덩이 착지여도)", () => {
    const board = makeBoard([0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
    const { captured, board: next } = applyMancalaMove(board, 1, 2);
    expect(captured).toBe(0);
    // 종료 정산 전 기준으로는 pit3에 1개가 남지만, 이 보드는 상대가 전부 비어 종료 → 쓸어담김.
    expect(next.pits[1][3]).toBe(0);
  });

  it("자기 쪽이 아니라 상대 빈 구덩이에 착지하면 미포획", () => {
    // player 1, pit 5(2개) → 곳간(1) + 상대 pit0(빈 칸). 상대 칸 착지는 포획 없음.
    // pit0에 잔여를 둬 종료(쓸어담기)로 보드가 바뀌지 않게 한다.
    const board = makeBoard([1, 0, 0, 0, 0, 2], [0, 1, 1, 1, 1, 1]);
    const { captured, board: next } = applyMancalaMove(board, 1, 5);
    expect(captured).toBe(0);
    expect(next.pits[2][0]).toBe(1);
  });

  it("자기 구덩이에 착지했지만 이미 씨앗이 있던(비어있지 않던) 칸이면 미포획", () => {
    // player 1, pit 2(1개) → pit3에 착지, 단 pit3에 원래 1개 있었음 → 비어있지 않았으므로 미포획.
    const board = makeBoard([0, 0, 1, 1, 0, 0], [0, 0, 5, 0, 0, 0]);
    const { captured, board: next } = applyMancalaMove(board, 1, 2);
    expect(captured).toBe(0);
    expect(next.pits[1][3]).toBe(2);
    expect(next.pits[2][2]).toBe(5);
  });
});

describe("applyMancalaMove — 종료/쓸어담기", () => {
  it("한쪽이 비면 종료 + 상대 잔여를 상대 곳간으로 쓸어담는다", () => {
    // player 1, pit 5(1개) → 자기 곳간. 그러면 player 1 구덩이 전부 빔 → 종료.
    // player 2 잔여(2+3=5)는 player 2 곳간으로.
    const board = makeBoard([0, 0, 0, 0, 0, 1], [2, 0, 0, 3, 0, 0], 0, 1);
    const { board: next } = applyMancalaMove(board, 1, 5);
    expect(isMancalaGameOver(next)).toBe(true);
    expect(next.pits[1]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(next.pits[2]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(next.stores[1]).toBe(1); // 자기 곳간으로 1개
    expect(next.stores[2]).toBe(6); // 기존 1 + 잔여 5
    expect(totalSeeds(next)).toBe(7);
  });

  it("findMancalaWinner: 곳간이 많은 쪽 승, 동점은 무승부(null)", () => {
    expect(findMancalaWinner(makeBoard([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], 25, 23))).toBe(1);
    expect(findMancalaWinner(makeBoard([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], 20, 28))).toBe(2);
    expect(findMancalaWinner(makeBoard([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], 24, 24))).toBeNull();
  });
});

describe("applyMancalaMove — 불법 수 / 불변", () => {
  it("범위 밖 인덱스는 throw", () => {
    const board = createMancalaBoard();
    expect(() => applyMancalaMove(board, 1, -1)).toThrow();
    expect(() => applyMancalaMove(board, 1, 6)).toThrow();
    expect(() => applyMancalaMove(board, 1, 1.5)).toThrow();
  });

  it("빈 구덩이는 throw", () => {
    const board = makeBoard([0, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4]);
    expect(() => applyMancalaMove(board, 1, 0)).toThrow();
  });

  it("입력 board를 변형하지 않는다(불변)", () => {
    const board = createMancalaBoard();
    const snapshot = JSON.stringify(board);
    applyMancalaMove(board, 1, 2);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
