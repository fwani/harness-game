import { describe, it, expect } from "vitest";
import {
  evaluateBaseballGuess,
  isBaseballWin,
  isValidBaseballNumber,
} from "./numberBaseball";

describe("isValidBaseballNumber - 유효성 검사", () => {
  it("서로 다른 0–9 숫자 3자리 → true", () => {
    expect(isValidBaseballNumber([1, 2, 3])).toBe(true);
    expect(isValidBaseballNumber([0, 9, 5])).toBe(true);
  });

  it("중복 숫자 → false", () => {
    expect(isValidBaseballNumber([1, 1, 2])).toBe(false);
  });

  it("0–9 범위 밖 → false", () => {
    expect(isValidBaseballNumber([10, 2, 3])).toBe(false);
    expect(isValidBaseballNumber([-1, 2, 3])).toBe(false);
  });

  it("정수가 아님 → false", () => {
    expect(isValidBaseballNumber([1.5, 2, 3])).toBe(false);
  });

  it("길이 불일치 → false", () => {
    expect(isValidBaseballNumber([1, 2])).toBe(false); // 기본 길이 3
    expect(isValidBaseballNumber([1, 2, 3, 4])).toBe(false);
  });

  it("비기본 길이(length 인자)에서도 동작", () => {
    expect(isValidBaseballNumber([7], 1)).toBe(true);
    expect(isValidBaseballNumber([1, 2, 3, 4], 4)).toBe(true);
    expect(isValidBaseballNumber([1, 2, 3], 4)).toBe(false);
  });

  it("잘못된 length 인자 → false", () => {
    expect(isValidBaseballNumber([1, 2, 3], 0)).toBe(false);
    expect(isValidBaseballNumber([1, 2, 3], 2.5)).toBe(false);
  });
});

describe("evaluateBaseballGuess - 스트라이크/볼 판정", () => {
  it("전부 스트라이크(정답)", () => {
    expect(evaluateBaseballGuess([1, 2, 3], [1, 2, 3])).toEqual({
      strikes: 3,
      balls: 0,
    });
  });

  it("부분 스트라이크 + 볼", () => {
    // 1: strike(자리 일치), 2: ball(secret에 있으나 자리 다름), 9: 없음
    expect(evaluateBaseballGuess([1, 2, 3], [1, 3, 9])).toEqual({
      strikes: 1,
      balls: 1,
    });
  });

  it("전부 볼(모든 숫자가 자리만 어긋남)", () => {
    expect(evaluateBaseballGuess([1, 2, 3], [3, 1, 2])).toEqual({
      strikes: 0,
      balls: 3,
    });
  });

  it("아웃(0S 0B)", () => {
    expect(evaluateBaseballGuess([1, 2, 3], [4, 5, 6])).toEqual({
      strikes: 0,
      balls: 0,
    });
  });

  it("비기본 길이(1자리)에서도 동작", () => {
    expect(evaluateBaseballGuess([7], [7])).toEqual({ strikes: 1, balls: 0 });
    expect(evaluateBaseballGuess([7], [3])).toEqual({ strikes: 0, balls: 0 });
  });

  it("비기본 길이(4자리)에서도 동작", () => {
    expect(evaluateBaseballGuess([1, 2, 3, 4], [1, 2, 4, 3])).toEqual({
      strikes: 2,
      balls: 2,
    });
  });

  it("유효하지 않은 secret → throw", () => {
    expect(() => evaluateBaseballGuess([1, 1, 2], [1, 2, 3])).toThrow();
  });

  it("유효하지 않은 guess → throw", () => {
    expect(() => evaluateBaseballGuess([1, 2, 3], [1, 1, 2])).toThrow();
    expect(() => evaluateBaseballGuess([1, 2, 3], [10, 2, 3])).toThrow();
  });

  it("길이 불일치 → throw", () => {
    expect(() => evaluateBaseballGuess([1, 2, 3], [1, 2])).toThrow();
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const secret = [1, 2, 3];
    const guess = [3, 2, 1];
    evaluateBaseballGuess(secret, guess);
    expect(secret).toEqual([1, 2, 3]);
    expect(guess).toEqual([3, 2, 1]);
  });
});

describe("isBaseballWin - 정답 판정", () => {
  it("strikes === length(기본 3)일 때만 true", () => {
    expect(isBaseballWin({ strikes: 3, balls: 0 })).toBe(true);
    expect(isBaseballWin({ strikes: 2, balls: 1 })).toBe(false);
  });

  it("비기본 길이에서 strikes === length면 true", () => {
    expect(isBaseballWin({ strikes: 4, balls: 0 }, 4)).toBe(true);
    expect(isBaseballWin({ strikes: 3, balls: 0 }, 4)).toBe(false);
    expect(isBaseballWin({ strikes: 1, balls: 0 }, 1)).toBe(true);
  });
});
