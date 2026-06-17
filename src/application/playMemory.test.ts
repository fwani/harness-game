import { describe, it, expect } from "vitest";
import {
  shuffleMemoryBoard,
  startMemoryGame,
  playMemoryAttempt,
  type MemoryGameState,
} from "./playMemory";
import type { RandomSource } from "./dealCards";
import type { MemoryBoard } from "../domain/memoryMatch";

/** 미리 정한 인덱스 시퀀스를 차례로 반환하는 결정적 스텁(dealCards.test.ts와 동일 패턴). */
function stubRng(sequence: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      if (i >= sequence.length) throw new Error("stub sequence exhausted");
      return sequence[i++]!;
    },
  };
}

/**
 * 항상 i(=maxExclusive-1)를 반환해 Fisher–Yates가 매 단계 자기 자신과 교환하게 만든다.
 * → 셔플이 항등(identity)이 되어 보드 value 순서가 [0,0,1,1,...]로 유지된다(결정적 테스트용).
 */
function identityRng(): RandomSource {
  return { nextInt: (maxExclusive: number) => maxExclusive - 1 };
}

function valuesOf(board: MemoryBoard): number[] {
  return board.map((card) => card.value);
}

function countByValue(board: MemoryBoard): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of board) {
    counts.set(card.value, (counts.get(card.value) ?? 0) + 1);
  }
  return counts;
}

describe("shuffleMemoryBoard", () => {
  it("길이 2*pairCount, 모든 카드 down, 각 value 정확히 2장이다", () => {
    // pairCount=4 → length 8 → 7번 swap. 각 단계 nextInt(i+1)의 범위(i..1)를 지킨다.
    const board = shuffleMemoryBoard(4, stubRng([5, 3, 4, 2, 1, 2, 1]));
    expect(board).toHaveLength(8);
    expect(board.every((card) => card.status === "down")).toBe(true);
    const counts = countByValue(board);
    for (let value = 0; value < 4; value++) {
      expect(counts.get(value)).toBe(2);
    }
  });

  it("항등 셔플이면 value 순서가 [0,0,1,1,2,2]로 유지된다", () => {
    const board = shuffleMemoryBoard(3, identityRng());
    expect(valuesOf(board)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("같은 random 시퀀스면 동일한 결과를 낸다(결정적)", () => {
    const seq = [0, 1, 2, 1, 0];
    const a = shuffleMemoryBoard(3, stubRng(seq));
    const b = shuffleMemoryBoard(3, stubRng(seq));
    expect(a).toEqual(b);
  });

  it("pairCount가 양의 정수가 아니면 throw 한다(도메인 검증 위임)", () => {
    expect(() => shuffleMemoryBoard(0, identityRng())).toThrow();
    expect(() => shuffleMemoryBoard(1.5, identityRng())).toThrow();
  });
});

describe("startMemoryGame", () => {
  it("attempts=0, matchedPairs=0, over=false, 보드는 섞인 상태다", () => {
    const state = startMemoryGame(3, identityRng());
    expect(state.attempts).toBe(0);
    expect(state.matchedPairs).toBe(0);
    expect(state.over).toBe(false);
    expect(state.board).toHaveLength(6);
    expect(state.board.every((card) => card.status === "down")).toBe(true);
  });
});

describe("playMemoryAttempt", () => {
  it("매치 시 두 카드 matched·matchedPairs+1·matched:true·attempts+1", () => {
    const state = startMemoryGame(2, identityRng()); // value 순서 [0,0,1,1]
    const { state: next, matched } = playMemoryAttempt(state, 0, 1);
    expect(matched).toBe(true);
    expect(next.attempts).toBe(1);
    expect(next.matchedPairs).toBe(1);
    expect(next.over).toBe(false);
    expect(next.board[0]!.status).toBe("matched");
    expect(next.board[1]!.status).toBe("matched");
  });

  it("미스매치 시 두 카드 down 복귀·matchedPairs 불변·matched:false·attempts+1", () => {
    const state = startMemoryGame(2, identityRng()); // value 순서 [0,0,1,1]
    const { state: next, matched } = playMemoryAttempt(state, 0, 2); // value 0 vs 1
    expect(matched).toBe(false);
    expect(next.attempts).toBe(1);
    expect(next.matchedPairs).toBe(0);
    expect(next.board[0]!.status).toBe("down");
    expect(next.board[2]!.status).toBe("down");
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = startMemoryGame(2, identityRng());
    const snapshot: MemoryGameState = {
      board: state.board.map((card) => ({ ...card })),
      attempts: state.attempts,
      matchedPairs: state.matchedPairs,
      over: state.over,
    };
    playMemoryAttempt(state, 0, 1);
    expect(state).toEqual(snapshot);
  });

  it("한 판을 끝까지 풀면 over=true & matchedPairs===pairCount", () => {
    let state = startMemoryGame(3, identityRng()); // value 순서 [0,0,1,1,2,2]
    ({ state } = playMemoryAttempt(state, 0, 1));
    ({ state } = playMemoryAttempt(state, 2, 3));
    expect(state.over).toBe(false);
    ({ state } = playMemoryAttempt(state, 4, 5));
    expect(state.over).toBe(true);
    expect(state.matchedPairs).toBe(3);
    expect(state.attempts).toBe(3);
  });

  it("같은 인덱스 두 번이면 throw", () => {
    const state = startMemoryGame(2, identityRng());
    expect(() => playMemoryAttempt(state, 1, 1)).toThrow();
  });

  it("범위 밖 인덱스면 throw(도메인 flipUp 위임)", () => {
    const state = startMemoryGame(2, identityRng());
    expect(() => playMemoryAttempt(state, 0, 99)).toThrow();
    expect(() => playMemoryAttempt(state, -1, 1)).toThrow();
  });

  it("이미 matched된 카드를 다시 뒤집으려 하면 throw", () => {
    let state = startMemoryGame(2, identityRng());
    ({ state } = playMemoryAttempt(state, 0, 1)); // 0,1 matched
    expect(() => playMemoryAttempt(state, 0, 2)).toThrow();
  });

  it("이미 over=true면 throw", () => {
    let state = startMemoryGame(1, identityRng()); // value [0,0]
    ({ state } = playMemoryAttempt(state, 0, 1));
    expect(state.over).toBe(true);
    expect(() => playMemoryAttempt(state, 0, 1)).toThrow();
  });
});
