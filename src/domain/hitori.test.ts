import { describe, it, expect } from "vitest";
import {
  createHitori,
  hitoriMarkAt,
  hitoriViolations,
  inHitoriBounds,
  isHitoriSolved,
  toggleHitoriCell,
  type HitoriPos,
  type HitoriState,
} from "./hitori";

/**
 * 알려진 풀이가 있는 5×5 히토리 퍼즐. 의도된 정답 칠(BLACK_SOLUTION)을 적용하면
 * 세 제약을 모두 만족한다. 각 검은 칸은 같은 행에서 다른 white 칸과 같은 숫자를 만들어
 * "칠해야만 풀린다"(un-shade하면 white 중복이 생긴다).
 */
const PUZZLE_5: number[][] = [
  [1, 2, 4, 4, 5],
  [3, 3, 4, 5, 4],
  [3, 4, 5, 1, 2],
  [5, 5, 1, 2, 2],
  [5, 1, 5, 3, 4],
];

const BLACK_SOLUTION: HitoriPos[] = [
  { row: 0, col: 2 },
  { row: 1, col: 0 },
  { row: 1, col: 4 },
  { row: 3, col: 0 },
  { row: 3, col: 4 },
  { row: 4, col: 2 },
];

/** 주어진 좌표들을 차례로 토글한 상태를 만든다. */
function shade(state: HitoriState, positions: HitoriPos[]): HitoriState {
  return positions.reduce((acc, pos) => toggleHitoriCell(acc, pos), state);
}

describe("createHitori", () => {
  it("모든 칸을 white로 시작하고 숫자판을 깊은 복사한다(불변)", () => {
    const numbers = [
      [1, 2],
      [2, 1],
    ];
    const state = createHitori(numbers);
    expect(state.marks).toEqual([
      ["white", "white"],
      ["white", "white"],
    ]);
    // 원본 변형 시 상태가 영향받지 않아야 한다.
    numbers[0]![0] = 9;
    expect(state.numbers[0]![0]).toBe(1);
  });

  it("비정사각 격자는 throw", () => {
    expect(() =>
      createHitori([
        [1, 2, 3],
        [1, 2],
      ]),
    ).toThrow();
  });

  it("변이 2 미만이면 throw", () => {
    expect(() => createHitori([[1]])).toThrow();
    expect(() => createHitori([])).toThrow();
  });

  it("음수/0/비정수/비숫자 칸은 throw", () => {
    expect(() =>
      createHitori([
        [1, -2],
        [2, 1],
      ]),
    ).toThrow();
    expect(() =>
      createHitori([
        [1, 0],
        [2, 1],
      ]),
    ).toThrow();
    expect(() =>
      createHitori([
        [1, 1.5],
        [2, 1],
      ]),
    ).toThrow();
    expect(() =>
      createHitori([
        [1, Number.NaN],
        [2, 1],
      ]),
    ).toThrow();
  });
});

describe("toggleHitoriCell", () => {
  it("white↔black을 토글한다(왕복하면 원래대로)", () => {
    const state = createHitori(PUZZLE_5);
    const once = toggleHitoriCell(state, { row: 0, col: 0 });
    expect(hitoriMarkAt(once, { row: 0, col: 0 })).toBe("black");
    const twice = toggleHitoriCell(once, { row: 0, col: 0 });
    expect(hitoriMarkAt(twice, { row: 0, col: 0 })).toBe("white");
  });

  it("원본 상태를 변형하지 않는다(불변)", () => {
    const state = createHitori(PUZZLE_5);
    const next = toggleHitoriCell(state, { row: 2, col: 2 });
    expect(hitoriMarkAt(state, { row: 2, col: 2 })).toBe("white");
    expect(hitoriMarkAt(next, { row: 2, col: 2 })).toBe("black");
    expect(next).not.toBe(state);
  });

  it("범위 밖/비정수 좌표는 throw", () => {
    const state = createHitori(PUZZLE_5);
    expect(() => toggleHitoriCell(state, { row: -1, col: 0 })).toThrow();
    expect(() => toggleHitoriCell(state, { row: 0, col: 5 })).toThrow();
    expect(() => toggleHitoriCell(state, { row: 1.5, col: 0 })).toThrow();
  });
});

describe("inHitoriBounds / hitoriMarkAt", () => {
  it("경계 판정과 칠 상태 조회", () => {
    const state = createHitori(PUZZLE_5);
    expect(inHitoriBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inHitoriBounds(state, { row: 5, col: 0 })).toBe(false);
    expect(hitoriMarkAt(state, { row: 0, col: 0 })).toBe("white");
    expect(() => hitoriMarkAt(state, { row: 9, col: 9 })).toThrow();
  });
});

describe("hitoriViolations — 세 종류", () => {
  it("① 같은 행/열의 white 중복 숫자를 잡는다", () => {
    // 모두 white인 시작 상태: PUZZLE_5는 곳곳에 중복이 있어 duplicate-white가 나온다.
    const state = createHitori([
      [1, 1],
      [2, 3],
    ]);
    const dups = hitoriViolations(state).filter(
      (v) => v.type === "duplicate-white",
    );
    expect(dups.length).toBeGreaterThanOrEqual(1);
    const rowDup = dups.find((v) => v.type === "duplicate-white");
    expect(rowDup).toBeDefined();
    if (rowDup && rowDup.type === "duplicate-white") {
      expect(rowDup.value).toBe(1);
      expect(rowDup.cells).toHaveLength(2);
    }
  });

  it("같은 행 중복을 한 칸 칠하면 해소된다", () => {
    const state = createHitori([
      [1, 1],
      [2, 3],
    ]);
    const fixed = toggleHitoriCell(state, { row: 0, col: 1 });
    const dups = hitoriViolations(fixed).filter(
      (v) => v.type === "duplicate-white",
    );
    expect(dups).toHaveLength(0);
  });

  it("② 상하좌우로 인접한 black 쌍을 잡는다", () => {
    let state = createHitori([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    state = shade(state, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    const adj = hitoriViolations(state).filter(
      (v) => v.type === "adjacent-black",
    );
    expect(adj).toHaveLength(1);
    if (adj[0] && adj[0].type === "adjacent-black") {
      expect(adj[0].cells).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]);
    }
  });

  it("인접 black을 떨어뜨리면 adjacent-black이 해소된다", () => {
    let state = createHitori([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    // 대각선은 인접이 아니다.
    state = shade(state, [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    const adj = hitoriViolations(state).filter(
      (v) => v.type === "adjacent-black",
    );
    expect(adj).toHaveLength(0);
  });

  it("③ white가 끊기면 disconnected-white를 잡고, 고립 칸을 보고한다", () => {
    // 3×3에서 (0,1)과 (1,0)을 칠하면 (0,0)이 나머지 white에서 고립된다.
    let state = createHitori([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    state = shade(state, [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ]);
    const disc = hitoriViolations(state).filter(
      (v) => v.type === "disconnected-white",
    );
    expect(disc).toHaveLength(1);
    if (disc[0] && disc[0].type === "disconnected-white") {
      expect(disc[0].cells).toEqual([{ row: 0, col: 0 }]);
    }
  });

  it("white가 연결되어 있으면 disconnected-white가 없다", () => {
    // (0,0)만 칠해도 나머지 white는 한 덩어리로 연결.
    let state = createHitori([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    state = shade(state, [{ row: 0, col: 0 }]);
    const disc = hitoriViolations(state).filter(
      (v) => v.type === "disconnected-white",
    );
    expect(disc).toHaveLength(0);
  });
});

describe("isHitoriSolved ⟺ hitoriViolations 빈 배열", () => {
  it("위반이 비면 solved, 비지 않으면 not solved", () => {
    const start = createHitori(PUZZLE_5);
    // 시작(전부 white)에는 중복이 있어 풀리지 않는다.
    expect(hitoriViolations(start).length).toBeGreaterThan(0);
    expect(isHitoriSolved(start)).toBe(false);

    const solved = shade(start, BLACK_SOLUTION);
    expect(hitoriViolations(solved)).toHaveLength(0);
    expect(isHitoriSolved(solved)).toBe(true);
  });

  it("정답에서 검은 칸 하나를 풀면(오답) white 중복이 생겨 not solved", () => {
    const solved = shade(createHitori(PUZZLE_5), BLACK_SOLUTION);
    const wrong = toggleHitoriCell(solved, { row: 0, col: 2 }); // 다시 white
    expect(isHitoriSolved(wrong)).toBe(false);
    const dups = hitoriViolations(wrong).filter(
      (v) => v.type === "duplicate-white",
    );
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it("정답에서 white 칸 하나를 더 칠하면(오답) 인접 black이 생겨 not solved", () => {
    const solved = shade(createHitori(PUZZLE_5), BLACK_SOLUTION);
    // (0,0)을 칠하면 인접한 black (1,0)과 맞닿는다.
    const wrong = toggleHitoriCell(solved, { row: 0, col: 0 });
    expect(isHitoriSolved(wrong)).toBe(false);
    const adj = hitoriViolations(wrong).filter(
      (v) => v.type === "adjacent-black",
    );
    expect(adj.length).toBeGreaterThanOrEqual(1);
  });
});
