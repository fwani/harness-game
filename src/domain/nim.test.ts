import { describe, expect, it } from "vitest";
import {
  applyNimMove,
  createNimPiles,
  findNimWinner,
  isLegalNimMove,
  isNimGameOver,
  legalNimMoves,
  type NimPiles,
} from "./nim";

describe("createNimPiles", () => {
  it("인자가 없으면 고전 [3, 5, 7]을 만든다", () => {
    expect(createNimPiles()).toEqual([3, 5, 7]);
  });

  it("사용자 지정 배치를 그대로 만든다", () => {
    expect(createNimPiles([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it("호출마다 독립 배열을 반환한다(공유/변형 없음)", () => {
    const a = createNimPiles();
    const b = createNimPiles();
    expect(a).not.toBe(b);
    a[0] = 99;
    expect(createNimPiles()).toEqual([3, 5, 7]);
  });

  it("입력 sizes 배열을 변형하지 않고 복사한다", () => {
    const sizes = [2, 4];
    const piles = createNimPiles(sizes);
    expect(piles).not.toBe(sizes);
    piles[0] = 0;
    expect(sizes).toEqual([2, 4]);
  });

  it("빈 배열을 거부한다", () => {
    expect(() => createNimPiles([])).toThrow();
  });

  it("음수를 거부한다", () => {
    expect(() => createNimPiles([3, -1, 5])).toThrow();
  });

  it("비정수를 거부한다", () => {
    expect(() => createNimPiles([3, 2.5])).toThrow();
    expect(() => createNimPiles([Number.NaN])).toThrow();
  });

  it("0 크기 더미는 허용한다(0 이상 정수)", () => {
    expect(createNimPiles([0, 3])).toEqual([0, 3]);
  });
});

describe("isNimGameOver", () => {
  it("모든 더미가 0이면 종료", () => {
    expect(isNimGameOver([0, 0, 0])).toBe(true);
    expect(isNimGameOver([0])).toBe(true);
  });

  it("돌이 하나라도 남으면 진행 중", () => {
    expect(isNimGameOver([0, 1, 0])).toBe(false);
    expect(isNimGameOver([3, 5, 7])).toBe(false);
  });
});

describe("legalNimMoves", () => {
  it("각 더미에서 1..n개 수를 모두 열거한다", () => {
    expect(legalNimMoves([2, 1])).toEqual([
      { pile: 0, count: 1 },
      { pile: 0, count: 2 },
      { pile: 1, count: 1 },
    ]);
  });

  it("빈 더미는 제외한다", () => {
    expect(legalNimMoves([0, 2, 0])).toEqual([
      { pile: 1, count: 1 },
      { pile: 1, count: 2 },
    ]);
  });

  it("종료 상태면 빈 배열", () => {
    expect(legalNimMoves([0, 0])).toEqual([]);
  });

  it("기본 배치 [3,5,7]은 3+5+7=15개 수를 만든다", () => {
    expect(legalNimMoves([3, 5, 7])).toHaveLength(15);
  });
});

describe("isLegalNimMove", () => {
  const piles: NimPiles = [3, 5, 7];

  it("범위 안 더미에서 1..n개는 합법", () => {
    expect(isLegalNimMove(piles, { pile: 0, count: 1 })).toBe(true);
    expect(isLegalNimMove(piles, { pile: 0, count: 3 })).toBe(true);
    expect(isLegalNimMove(piles, { pile: 2, count: 7 })).toBe(true);
  });

  it("count가 그 더미 돌 수를 초과하면 불법", () => {
    expect(isLegalNimMove(piles, { pile: 0, count: 4 })).toBe(false);
  });

  it("count<1은 불법", () => {
    expect(isLegalNimMove(piles, { pile: 0, count: 0 })).toBe(false);
    expect(isLegalNimMove(piles, { pile: 0, count: -2 })).toBe(false);
  });

  it("범위 밖 pile은 불법", () => {
    expect(isLegalNimMove(piles, { pile: -1, count: 1 })).toBe(false);
    expect(isLegalNimMove(piles, { pile: 3, count: 1 })).toBe(false);
  });

  it("비정수 pile/count는 불법", () => {
    expect(isLegalNimMove(piles, { pile: 1.5, count: 1 })).toBe(false);
    expect(isLegalNimMove(piles, { pile: 0, count: 1.5 })).toBe(false);
  });

  it("빈 더미에 두는 수는 불법", () => {
    expect(isLegalNimMove([0, 5], { pile: 0, count: 1 })).toBe(false);
  });

  it("종료 상태면 어떤 수도 불법", () => {
    expect(isLegalNimMove([0, 0], { pile: 0, count: 1 })).toBe(false);
  });
});

describe("applyNimMove", () => {
  it("한 더미만 줄고 나머지는 불변", () => {
    expect(applyNimMove([3, 5, 7], { pile: 1, count: 2 })).toEqual([3, 3, 7]);
  });

  it("더미를 정확히 0으로 비울 수 있다", () => {
    expect(applyNimMove([3, 5, 7], { pile: 0, count: 3 })).toEqual([0, 5, 7]);
  });

  it("입력 배열을 변형하지 않고 새 배열을 반환한다", () => {
    const piles: NimPiles = [3, 5, 7];
    const next = applyNimMove(piles, { pile: 2, count: 4 });
    expect(piles).toEqual([3, 5, 7]);
    expect(next).not.toBe(piles);
    expect(next).toEqual([3, 5, 3]);
  });

  it("불법 수면 throw", () => {
    expect(() => applyNimMove([3, 5, 7], { pile: 0, count: 4 })).toThrow();
    expect(() => applyNimMove([3, 5, 7], { pile: 9, count: 1 })).toThrow();
    expect(() => applyNimMove([3, 5, 7], { pile: 0, count: 0 })).toThrow();
  });
});

describe("findNimWinner", () => {
  it("종료 상태면 마지막에 둔 플레이어가 승자", () => {
    expect(findNimWinner([0, 0, 0], 1)).toBe(1);
    expect(findNimWinner([0, 0, 0], 2)).toBe(2);
  });

  it("진행 중이면 null", () => {
    expect(findNimWinner([0, 1, 0], 1)).toBeNull();
    expect(findNimWinner([3, 5, 7], 2)).toBeNull();
  });

  it("마지막 돌을 가져가는 수를 적용한 뒤 그 수를 둔 플레이어가 승자", () => {
    const piles = applyNimMove([0, 0, 1], { pile: 2, count: 1 });
    expect(isNimGameOver(piles)).toBe(true);
    expect(findNimWinner(piles, 1)).toBe(1);
  });
});
