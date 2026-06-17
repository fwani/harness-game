import { describe, expect, it } from "vitest";
import {
  startBingoGame,
  drawBingoNumber,
  isBingoGameWon,
  type BingoGame,
} from "./playBingo";
import { isBingo } from "../domain/bingo";
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

/** 항상 인덱스 0을 돌려주는 스텁(풀의 맨 앞을 차례로 뽑음 → 결과 예측 용이). */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

describe("startBingoGame", () => {
  it("기본(size=5): 카드 25개·중복 없음·marked 전부 false·remaining 1..25·lastDrawn null", () => {
    const game = startBingoGame(new ZeroRandom());
    expect(game.state.card.size).toBe(5);
    expect(game.state.card.numbers).toHaveLength(25);
    expect(new Set(game.state.card.numbers).size).toBe(25);
    expect(game.state.marked).toHaveLength(25);
    expect(game.state.marked.every((m) => m === false)).toBe(true);
    expect(game.remaining).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(game.lastDrawn).toBeNull();
  });

  it("ZeroRandom은 풀 맨 앞부터 뽑으므로 size=3 카드가 1..9 순서가 된다", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3 });
    expect(game.state.card.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(game.remaining).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("max > size*size: remaining은 1..max 전부지만 카드는 size*size개", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3, max: 20 });
    expect(game.state.card.numbers).toHaveLength(9);
    expect(game.remaining).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("max < size*size 이면 throw", () => {
    expect(() => startBingoGame(new ZeroRandom(), { size: 3, max: 8 })).toThrow();
  });

  it("잘못된 size(비정수/0 미만)면 throw", () => {
    expect(() => startBingoGame(new ZeroRandom(), { size: 0 })).toThrow();
    expect(() => startBingoGame(new ZeroRandom(), { size: 2.5 })).toThrow();
  });

  it("max가 비정수면 throw", () => {
    expect(() => startBingoGame(new ZeroRandom(), { size: 3, max: 9.5 })).toThrow();
  });

  it("rng가 범위 밖 인덱스를 주면 throw", () => {
    // size=2 → 첫 추출에서 pool.length=4, 인덱스 9는 범위 밖.
    expect(() => startBingoGame(new SequenceRandom([9]), { size: 2 })).toThrow(
      /out-of-range/,
    );
  });
});

describe("drawBingoNumber", () => {
  it("뽑힌 번호가 remaining에서 제거되고 lastDrawn에 반영된다", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3 }); // remaining 1..9, 카드 1..9
    // 인덱스 4 → remaining[4] === 5
    const next = drawBingoNumber(game, new SequenceRandom([4]));
    expect(next.lastDrawn).toBe(5);
    expect(next.remaining).not.toContain(5);
    expect(next.remaining).toHaveLength(8);
  });

  it("카드에 있는 번호면 해당 칸이 마킹된다", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3 }); // 카드 [1..9]
    const next = drawBingoNumber(game, new SequenceRandom([4])); // 번호 5 = 카드 인덱스 4
    expect(next.state.marked[4]).toBe(true);
    // 그 외 칸은 미마킹
    expect(next.state.marked.filter((m) => m).length).toBe(1);
  });

  it("카드에 없는 번호면 마킹 변화가 없다", () => {
    // max>cells라 카드에 없는 번호(예: 10)가 remaining에 존재.
    const game = startBingoGame(new ZeroRandom(), { size: 3, max: 12 }); // 카드 1..9, remaining 1..12
    // remaining[9] === 10 (카드에 없음)
    const next = drawBingoNumber(game, new SequenceRandom([9]));
    expect(next.lastDrawn).toBe(10);
    expect(next.state.marked.every((m) => m === false)).toBe(true);
  });

  it("입력 game을 변형하지 않는다(remaining/marked 불변)", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3 });
    const remainingBefore = [...game.remaining];
    const markedBefore = [...game.state.marked];
    drawBingoNumber(game, new SequenceRandom([2]));
    expect(game.remaining).toEqual(remainingBefore);
    expect(game.state.marked).toEqual(markedBefore);
    expect(game.lastDrawn).toBeNull();
  });

  it("remaining이 비면 throw", () => {
    // size=1, max=1 → 카드 [1], remaining [1]. 한 번 뽑으면 비고, 다시 뽑으면 throw.
    let game = startBingoGame(new ZeroRandom(), { size: 1 });
    game = drawBingoNumber(game, new ZeroRandom());
    expect(game.remaining).toHaveLength(0);
    expect(() => drawBingoNumber(game, new ZeroRandom())).toThrow();
  });

  it("rng가 범위 밖 인덱스를 주면 throw", () => {
    const game = startBingoGame(new ZeroRandom(), { size: 3 }); // remaining 길이 9
    expect(() => drawBingoNumber(game, new SequenceRandom([99]))).toThrow(
      /out-of-range/,
    );
  });
});

describe("빙고 판정(도메인 연동)", () => {
  it("가로 한 줄을 채우는 번호들을 순서대로 뽑으면 isBingo가 true가 된다", () => {
    // ZeroRandom으로 시작 → 카드 [1..9] (size=3). 첫 행 = [1,2,3].
    let game: BingoGame = startBingoGame(new ZeroRandom(), { size: 3 });
    expect(isBingo(game.state)).toBe(false);
    // remaining 1..9에서 번호 1,2,3을 뽑는다.
    // 매 추첨 remaining에서 해당 값의 현재 인덱스를 계산해 SequenceRandom에 준다.
    for (const value of [1, 2, 3]) {
      const idx = game.remaining.indexOf(value);
      game = drawBingoNumber(game, new SequenceRandom([idx]));
    }
    expect(isBingo(game.state)).toBe(true);
    expect(isBingoGameWon(game)).toBe(true);
  });

  it("대각선 한 줄(1,5,9)을 채우면 isBingo가 true", () => {
    let game: BingoGame = startBingoGame(new ZeroRandom(), { size: 3 }); // 카드 [1..9], 주대각 = 1,5,9
    for (const value of [1, 5, 9]) {
      const idx = game.remaining.indexOf(value);
      game = drawBingoNumber(game, new SequenceRandom([idx]));
    }
    expect(isBingoGameWon(game)).toBe(true);
  });

  it("target=2: 한 줄만으로는 빙고가 아니다", () => {
    let game: BingoGame = startBingoGame(new ZeroRandom(), { size: 3 });
    for (const value of [1, 2, 3]) {
      const idx = game.remaining.indexOf(value);
      game = drawBingoNumber(game, new SequenceRandom([idx]));
    }
    expect(isBingoGameWon(game, 2)).toBe(false);
  });
});
