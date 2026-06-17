import { describe, expect, it } from "vitest";
import {
  applySlidePuzzleMove,
  createSlidePuzzle,
  isSlidePuzzleSolvable,
  isSlidePuzzleSolved,
  legalSlidePuzzleMoves,
  type SlidePuzzleState,
} from "./slidePuzzle";

describe("createSlidePuzzle", () => {
  it("기본 size=4로 완성(정렬) 상태를 만든다", () => {
    const state = createSlidePuzzle();
    expect(state.size).toBe(4);
    expect(state.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
    expect(isSlidePuzzleSolved(state)).toBe(true);
  });

  it("size=3 완성 상태", () => {
    const state = createSlidePuzzle(3);
    expect(state.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSlidePuzzleSolved(state)).toBe(true);
  });

  it("호출마다 독립 배열을 반환한다", () => {
    const a = createSlidePuzzle();
    const b = createSlidePuzzle();
    expect(a.tiles).not.toBe(b.tiles);
  });

  it("size가 2 미만이거나 비정수면 throw", () => {
    expect(() => createSlidePuzzle(1)).toThrow();
    expect(() => createSlidePuzzle(0)).toThrow();
    expect(() => createSlidePuzzle(-3)).toThrow();
    expect(() => createSlidePuzzle(2.5)).toThrow();
    expect(() => createSlidePuzzle(Number.NaN)).toThrow();
  });

  it("size=2도 허용", () => {
    expect(createSlidePuzzle(2).tiles).toEqual([1, 2, 3, 0]);
  });
});

describe("legalSlidePuzzleMoves", () => {
  it("빈 칸이 우하단 모서리면 인접 타일 2개(위→왼쪽)", () => {
    // [1,2,3, 4,5,6, 7,8,0] — 빈 칸 위=6, 왼쪽=8
    const state = createSlidePuzzle(3);
    expect(legalSlidePuzzleMoves(state)).toEqual([{ tile: 6 }, { tile: 8 }]);
  });

  it("빈 칸이 좌상단 모서리면 인접 타일 2개(아래→오른쪽)", () => {
    const state: SlidePuzzleState = { size: 3, tiles: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
    // 빈 칸 아래=3, 오른쪽=1
    expect(legalSlidePuzzleMoves(state)).toEqual([{ tile: 3 }, { tile: 1 }]);
  });

  it("빈 칸이 중앙이면 인접 타일 4개(위→아래→왼쪽→오른쪽)", () => {
    const state: SlidePuzzleState = { size: 3, tiles: [1, 2, 3, 4, 0, 5, 6, 7, 8] };
    // 위=2, 아래=7, 왼쪽=4, 오른쪽=5
    expect(legalSlidePuzzleMoves(state)).toEqual([
      { tile: 2 },
      { tile: 7 },
      { tile: 4 },
      { tile: 5 },
    ]);
  });

  it("빈 칸이 가장자리(상단 중앙)면 인접 타일 3개", () => {
    const state: SlidePuzzleState = { size: 3, tiles: [1, 0, 2, 3, 4, 5, 6, 7, 8] };
    // 아래=4, 왼쪽=1, 오른쪽=2
    expect(legalSlidePuzzleMoves(state)).toEqual([{ tile: 4 }, { tile: 1 }, { tile: 2 }]);
  });
});

describe("applySlidePuzzleMove", () => {
  it("인접 타일을 빈 칸과 교환한다", () => {
    const state = createSlidePuzzle(3); // 빈 칸 우하단, 위=6, 왼쪽=8
    const next = applySlidePuzzleMove(state, { tile: 8 });
    expect(next.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });

  it("입력 상태를 변형하지 않고 새 상태를 반환한다", () => {
    const state = createSlidePuzzle(3);
    const next = applySlidePuzzleMove(state, { tile: 6 });
    expect(state.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(next.tiles).not.toBe(state.tiles);
    expect(next.tiles).toEqual([1, 2, 3, 4, 5, 0, 7, 8, 6]);
  });

  it("빈 칸(0) 지정은 throw", () => {
    expect(() => applySlidePuzzleMove(createSlidePuzzle(3), { tile: 0 })).toThrow();
  });

  it("존재하지 않는 타일은 throw", () => {
    expect(() => applySlidePuzzleMove(createSlidePuzzle(3), { tile: 99 })).toThrow();
  });

  it("빈 칸과 인접하지 않은 타일은 throw", () => {
    // 빈 칸 우하단, 타일 1(좌상단)은 인접하지 않음
    expect(() => applySlidePuzzleMove(createSlidePuzzle(3), { tile: 1 })).toThrow();
  });
});

describe("isSlidePuzzleSolved", () => {
  it("완성 상태는 true", () => {
    expect(isSlidePuzzleSolved(createSlidePuzzle())).toBe(true);
    expect(isSlidePuzzleSolved(createSlidePuzzle(3))).toBe(true);
  });

  it("미완성 상태는 false", () => {
    const state: SlidePuzzleState = { size: 3, tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8] };
    expect(isSlidePuzzleSolved(state)).toBe(false);
  });

  it("0이 마지막이 아니면 false", () => {
    const state: SlidePuzzleState = { size: 3, tiles: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
    expect(isSlidePuzzleSolved(state)).toBe(false);
  });
});

describe("isSlidePuzzleSolvable", () => {
  it("완성 상태(짝수 폭)는 풀이 가능", () => {
    expect(isSlidePuzzleSolvable(createSlidePuzzle(4))).toBe(true);
  });

  it("완성 상태(홀수 폭)는 풀이 가능", () => {
    expect(isSlidePuzzleSolvable(createSlidePuzzle(3))).toBe(true);
  });

  it("인접 두 타일을 강제로 뒤바꾼 배치는 풀이 불가능", () => {
    // 4×4 완성에서 1과 2를 swap → 역위 1개
    const swapped: SlidePuzzleState = {
      size: 4,
      tiles: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0],
    };
    expect(isSlidePuzzleSolvable(swapped)).toBe(false);
  });

  it("홀수 폭에서 인접 두 타일 swap은 풀이 불가능", () => {
    const swapped: SlidePuzzleState = { size: 3, tiles: [2, 1, 3, 4, 5, 6, 7, 8, 0] };
    expect(isSlidePuzzleSolvable(swapped)).toBe(false);
  });

  it("합법 수를 적용해도 풀이 가능성은 보존된다", () => {
    let state: SlidePuzzleState = createSlidePuzzle(4);
    for (const move of [{ tile: 12 }, { tile: 11 }, { tile: 15 }]) {
      state = applySlidePuzzleMove(state, move);
      expect(isSlidePuzzleSolvable(state)).toBe(true);
    }
  });
});

describe("이동 시퀀스 가역성", () => {
  it("합법 수 시퀀스를 역순으로 되돌리면 완성으로 복귀한다", () => {
    let state = createSlidePuzzle(4);
    const applied: number[] = [];
    // 빈 칸을 따라가며 임의(결정적)의 합법 수 시퀀스를 적용한다.
    for (let step = 0; step < 30; step += 1) {
      const moves = legalSlidePuzzleMoves(state);
      const move = moves[step % moves.length]!;
      applied.push(move.tile);
      state = applySlidePuzzleMove(state, move);
    }
    // 적용한 수를 역순으로 되돌린다. 각 단계에서 방금 움직인 타일은 다시 빈 칸과 인접하다.
    for (let i = applied.length - 1; i >= 0; i -= 1) {
      state = applySlidePuzzleMove(state, { tile: applied[i]! });
    }
    expect(isSlidePuzzleSolved(state)).toBe(true);
  });
});
