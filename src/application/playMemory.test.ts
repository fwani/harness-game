import { describe, expect, it } from "vitest";
import {
  shuffleMemoryBoard,
  startMemoryGame,
  playMemoryAttempt,
  type MemoryGameState,
} from "./playMemory";
import type { MemoryBoard } from "../domain/memoryMatch";
import type { RandomSource } from "./dealCards";

/** 미리 정한 nextInt 시퀀스를 순서대로 돌려주는 결정적 스텁. 시퀀스를 다 쓰면 throw. */
class SequenceRandom implements RandomSource {
  private i = 0;
  constructor(private readonly seq: readonly number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    if (this.i >= this.seq.length) {
      throw new Error("SequenceRandom: sequence exhausted");
    }
    return this.seq[this.i++]!;
  }
}

/**
 * shuffle은 i=len-1..1 에서 j=nextInt(i+1)로 result[i]↔result[j] 교환한다.
 * j=i(=각 단계 최대 인덱스)면 자기 자신과 교환 → 순서가 그대로 유지된다.
 * pairCount=2(길이 4)에서 항등 셔플 시퀀스: [3, 2, 1].
 */
const IDENTITY_SHUFFLE_2 = [3, 2, 1];

/** 각 value별 카드 개수를 센다. */
function valueCounts(board: MemoryBoard): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of board) {
    counts.set(card.value, (counts.get(card.value) ?? 0) + 1);
  }
  return counts;
}

describe("shuffleMemoryBoard", () => {
  it("길이 2*pairCount, 모든 카드 down, 각 value 정확히 2장", () => {
    const board = shuffleMemoryBoard(4, new SequenceRandom([0, 0, 0, 0, 0, 0, 0]));
    expect(board).toHaveLength(8);
    expect(board.every((c) => c.status === "down")).toBe(true);
    const counts = valueCounts(board);
    expect(counts.size).toBe(4);
    for (const [, n] of counts) {
      expect(n).toBe(2);
    }
  });

  it("결정적: 같은 시퀀스면 같은 결과", () => {
    const seq = [4, 1, 2, 0, 1];
    const a = shuffleMemoryBoard(3, new SequenceRandom(seq));
    const b = shuffleMemoryBoard(3, new SequenceRandom(seq));
    expect(a).toEqual(b);
  });

  it("항등 시퀀스에서 createMemoryBoard 순서([0,0,1,1])를 보존한다", () => {
    const board = shuffleMemoryBoard(2, new SequenceRandom(IDENTITY_SHUFFLE_2));
    expect(board.map((c) => c.value)).toEqual([0, 0, 1, 1]);
  });

  it("pairCount가 양의 정수가 아니면 throw(도메인 위임)", () => {
    expect(() => shuffleMemoryBoard(0, new SequenceRandom([]))).toThrow();
    expect(() => shuffleMemoryBoard(-1, new SequenceRandom([]))).toThrow();
    expect(() => shuffleMemoryBoard(2.5, new SequenceRandom([]))).toThrow();
  });
});

describe("startMemoryGame", () => {
  it("attempts=0, matchedPairs=0, over=false, 보드는 섞인 상태", () => {
    const state = startMemoryGame(2, new SequenceRandom(IDENTITY_SHUFFLE_2));
    expect(state.attempts).toBe(0);
    expect(state.matchedPairs).toBe(0);
    expect(state.over).toBe(false);
    expect(state.board).toHaveLength(4);
    expect(state.board.every((c) => c.status === "down")).toBe(true);
  });
});

describe("playMemoryAttempt", () => {
  function freshGame(): MemoryGameState {
    // 항등 셔플로 [0,0,1,1] 보드 확보 — 인덱스별 value를 알 수 있다.
    return startMemoryGame(2, new SequenceRandom(IDENTITY_SHUFFLE_2));
  }

  it("매치 시 두 카드 matched·matchedPairs+1·matched:true·attempts+1", () => {
    const state = freshGame();
    const { state: next, matched } = playMemoryAttempt(state, 0, 1);
    expect(matched).toBe(true);
    expect(next.attempts).toBe(1);
    expect(next.matchedPairs).toBe(1);
    expect(next.board[0]!.status).toBe("matched");
    expect(next.board[1]!.status).toBe("matched");
    expect(next.over).toBe(false);
  });

  it("미스매치 시 두 카드 down 복귀·matchedPairs 불변·matched:false·attempts+1", () => {
    const state = freshGame();
    const { state: next, matched } = playMemoryAttempt(state, 0, 2);
    expect(matched).toBe(false);
    expect(next.attempts).toBe(1);
    expect(next.matchedPairs).toBe(0);
    expect(next.board[0]!.status).toBe("down");
    expect(next.board[2]!.status).toBe("down");
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const state = freshGame();
    const snapshot = JSON.parse(JSON.stringify(state));
    playMemoryAttempt(state, 0, 1);
    expect(state).toEqual(snapshot);
  });

  it("한 판을 끝까지 풀면 over===true & matchedPairs===pairCount", () => {
    let state = freshGame();
    ({ state } = playMemoryAttempt(state, 0, 1));
    expect(state.over).toBe(false);
    ({ state } = playMemoryAttempt(state, 2, 3));
    expect(state.over).toBe(true);
    expect(state.matchedPairs).toBe(2);
    expect(state.attempts).toBe(2);
  });

  it("이미 over=true면 throw", () => {
    let state = freshGame();
    ({ state } = playMemoryAttempt(state, 0, 1));
    ({ state } = playMemoryAttempt(state, 2, 3));
    expect(state.over).toBe(true);
    expect(() => playMemoryAttempt(state, 0, 1)).toThrow();
  });

  it("같은 인덱스 두 번이면 throw(도메인 flipUp 위임)", () => {
    const state = freshGame();
    expect(() => playMemoryAttempt(state, 0, 0)).toThrow();
  });

  it("범위 밖 인덱스면 throw", () => {
    const state = freshGame();
    expect(() => playMemoryAttempt(state, 0, 99)).toThrow();
    expect(() => playMemoryAttempt(state, 99, 0)).toThrow();
  });

  it("이미 matched된 카드를 다시 뒤집으면 throw", () => {
    let state = freshGame();
    ({ state } = playMemoryAttempt(state, 0, 1)); // 0,1 matched
    expect(() => playMemoryAttempt(state, 0, 2)).toThrow();
  });
});
