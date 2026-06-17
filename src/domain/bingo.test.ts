import { describe, it, expect } from "vitest";
import {
  createBingoCard,
  createBingoState,
  markBingoNumber,
  countBingoLines,
  isBingo,
  type BingoCard,
  type BingoState,
} from "./bingo";

/** 1..n 을 행 우선으로 채운 카드를 만든다(테스트 편의). */
function sequentialCard(size: number): BingoCard {
  const numbers = Array.from({ length: size * size }, (_, i) => i + 1);
  return createBingoCard(numbers, size);
}

/** 번호 목록을 차례로 마킹한 상태를 반환한다. */
function markAll(state: BingoState, values: number[]): BingoState {
  return values.reduce((acc, v) => markBingoNumber(acc, v), state);
}

describe("createBingoCard", () => {
  it("기본 size=5 카드를 정상 생성한다", () => {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const card = createBingoCard(numbers);
    expect(card.size).toBe(5);
    expect(card.numbers).toHaveLength(25);
    expect(card.numbers).toEqual(numbers);
  });

  it("size를 명시해 N×N 카드를 만든다", () => {
    const card = sequentialCard(3);
    expect(card.size).toBe(3);
    expect(card.numbers).toHaveLength(9);
  });

  it("입력 numbers 배열을 변형하지 않고 복사본을 보관한다", () => {
    const numbers = [1, 2, 3, 4];
    const card = createBingoCard(numbers, 2);
    expect(card.numbers).not.toBe(numbers);
    card.numbers[0] = 999;
    expect(numbers[0]).toBe(1);
  });

  it("번호 개수가 size*size와 다르면 throw(한국어 사유)", () => {
    expect(() => createBingoCard([1, 2, 3], 2)).toThrow(/빙고/);
    expect(() => createBingoCard([1, 2, 3, 4, 5], 2)).toThrow(/개수/);
  });

  it("중복 번호가 있으면 throw", () => {
    expect(() => createBingoCard([1, 2, 2, 4], 2)).toThrow(/중복/);
  });

  it("비정수·음수·0 번호가 있으면 throw", () => {
    expect(() => createBingoCard([1, 2, 3, 1.5], 2)).toThrow(/정수/);
    expect(() => createBingoCard([1, 2, 3, -4], 2)).toThrow(/정수/);
    expect(() => createBingoCard([0, 1, 2, 3], 2)).toThrow(/정수/);
  });

  it("size가 1 미만이거나 비정수면 throw", () => {
    expect(() => createBingoCard([], 0)).toThrow(/size/);
    expect(() => createBingoCard([1, 2, 3, 4], 2.5)).toThrow(/size/);
  });
});

describe("createBingoState", () => {
  it("모든 칸이 미표시인 초기 상태를 만든다", () => {
    const state = createBingoState(sequentialCard(3));
    expect(state.marked).toHaveLength(9);
    expect(state.marked.every((m) => m === false)).toBe(true);
  });
});

describe("markBingoNumber", () => {
  it("존재하는 번호를 표시한 새 상태를 반환한다(입력 불변)", () => {
    const state = createBingoState(sequentialCard(2)); // [1,2,3,4]
    const next = markBingoNumber(state, 3);
    expect(next).not.toBe(state);
    expect(next.marked).not.toBe(state.marked);
    expect(next.marked).toEqual([false, false, true, false]);
    // 원본 불변
    expect(state.marked).toEqual([false, false, false, false]);
  });

  it("카드에 없는 번호는 no-op(새 상태이나 표시 변화 없음)", () => {
    const state = createBingoState(sequentialCard(2));
    const next = markBingoNumber(state, 99);
    expect(next).not.toBe(state);
    expect(next.marked).toEqual([false, false, false, false]);
  });

  it("같은 번호 재표시는 멱등(안전)", () => {
    const state = createBingoState(sequentialCard(2));
    const once = markBingoNumber(state, 1);
    const twice = markBingoNumber(once, 1);
    expect(twice.marked).toEqual([true, false, false, false]);
  });
});

describe("countBingoLines", () => {
  it("빈 상태는 0줄", () => {
    const state = createBingoState(sequentialCard(5));
    expect(countBingoLines(state)).toBe(0);
  });

  it("한 가로 줄 완성 시 1", () => {
    // 3×3: [1,2,3 / 4,5,6 / 7,8,9], 첫 행 1,2,3
    const state = markAll(createBingoState(sequentialCard(3)), [1, 2, 3]);
    expect(countBingoLines(state)).toBe(1);
  });

  it("한 세로 줄 완성 시 1", () => {
    // 첫 열 1,4,7
    const state = markAll(createBingoState(sequentialCard(3)), [1, 4, 7]);
    expect(countBingoLines(state)).toBe(1);
  });

  it("주대각 완성 시 1", () => {
    // 주대각 1,5,9
    const state = markAll(createBingoState(sequentialCard(3)), [1, 5, 9]);
    expect(countBingoLines(state)).toBe(1);
  });

  it("반대각 완성 시 1", () => {
    // 반대각 3,5,7
    const state = markAll(createBingoState(sequentialCard(3)), [3, 5, 7]);
    expect(countBingoLines(state)).toBe(1);
  });

  it("교차로 여러 줄 동시 완성", () => {
    // 첫 행(1,2,3) + 첫 열(1,4,7): 가로 1 + 세로 1 = 2
    const state = markAll(createBingoState(sequentialCard(3)), [1, 2, 3, 4, 7]);
    expect(countBingoLines(state)).toBe(2);
  });

  it("가득 찬 카드는 총 줄 수 = 2*size+2", () => {
    for (const size of [3, 5]) {
      const card = sequentialCard(size);
      const state = markAll(createBingoState(card), card.numbers);
      expect(countBingoLines(state)).toBe(2 * size + 2);
    }
  });
});

describe("isBingo", () => {
  it("기본 target=1 경계: 0줄이면 false, 1줄이면 true", () => {
    const empty = createBingoState(sequentialCard(3));
    expect(isBingo(empty)).toBe(false);
    const oneLine = markAll(empty, [1, 2, 3]);
    expect(isBingo(oneLine)).toBe(true);
  });

  it("target>1 경계: 1줄은 false, 2줄이면 true", () => {
    const state = markAll(createBingoState(sequentialCard(3)), [1, 2, 3]);
    expect(isBingo(state, 2)).toBe(false);
    const twoLines = markAll(state, [1, 4, 7]); // 가로+세로
    expect(countBingoLines(twoLines)).toBe(2);
    expect(isBingo(twoLines, 2)).toBe(true);
  });
});
