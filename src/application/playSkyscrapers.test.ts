import { describe, expect, it } from "vitest";
import {
  pickRandomSkyscraperPuzzle,
  playSkyscraperPlacement,
  startSkyscrapersGame,
  type SkyscraperStatus,
} from "./playSkyscrapers";
import {
  SKYSCRAPER_PUZZLES,
  createSkyscrapers,
  isSkyscraperGiven,
  isSkyscraperSolved,
  skyscraperViolations,
  type SkyscraperPuzzle,
  type SkyscraperState,
} from "../domain/skyscrapers";
import type { RandomSource } from "./dealCards";

/** 미리 정한 인덱스를 순서대로 반환하는 결정적 rng(원시값 그대로, 범위 매핑 없음). */
class FixedRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const v = this.values[this.i % this.values.length]!;
    this.i += 1;
    return v;
  }
}

/** 항상 0(첫 퍼즐)을 반환하는 스텁. */
class ZeroRandom implements RandomSource {
  nextInt(): number {
    return 0;
  }
}

/** 항상 maxExclusive(경계 밖)를 반환하는 비정상 스텁(방어적 throw 검증용). */
class OutOfRangeRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    return maxExclusive;
  }
}

/** 한 방향으로 줄(높이 배열)을 훑을 때 보이는 빌딩 수(단조 최댓값 갱신 시 +1). */
function countVisible(line: number[]): number {
  let max = 0;
  let visible = 0;
  for (const height of line) {
    if (height > max) {
      max = height;
      visible += 1;
    }
  }
  return visible;
}

/**
 * 백트래킹으로 마천루 퍼즐을 푼다. 행/열 라틴(1..N 한 번씩) + 네 변 가시성 단서를 모두 만족하게
 * 빈 칸을 채울 수 있으면 완성 격자(1..N)를, 불가능하면 null을 반환한다.
 * (테스트가 "완성 가능"을 실제로 증명하기 위한 독립 솔버 — 프로덕션 코드와 무관.)
 */
function solveSkyscrapers(puzzle: SkyscraperPuzzle): number[][] | null {
  const { size, clues } = puzzle;
  const givens = puzzle.givens;
  const grid: (number | null)[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => givens?.[r]?.[c] ?? null),
  );

  const canPlace = (r: number, c: number, v: number): boolean => {
    for (let j = 0; j < size; j += 1) {
      if (grid[r]![j] === v) return false;
    }
    for (let i = 0; i < size; i += 1) {
      if (grid[i]![c] === v) return false;
    }
    return true;
  };

  const cluesSatisfied = (): boolean => {
    for (let i = 0; i < size; i += 1) {
      const rowVals = grid[i]!.map((v) => v!);
      const colVals = Array.from({ length: size }, (_, r) => grid[r]![i]!);
      const left = clues.left[i] ?? null;
      const right = clues.right[i] ?? null;
      const top = clues.top[i] ?? null;
      const bottom = clues.bottom[i] ?? null;
      if (left !== null && countVisible(rowVals) !== left) return false;
      if (right !== null && countVisible([...rowVals].reverse()) !== right)
        return false;
      if (top !== null && countVisible(colVals) !== top) return false;
      if (bottom !== null && countVisible([...colVals].reverse()) !== bottom)
        return false;
    }
    return true;
  };

  const cells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (grid[r]![c] === null) cells.push({ r, c });
    }
  }

  const backtrack = (idx: number): boolean => {
    if (idx === cells.length) {
      return cluesSatisfied();
    }
    const { r, c } = cells[idx]!;
    for (let v = 1; v <= size; v += 1) {
      if (!canPlace(r, c, v)) continue;
      grid[r]![c] = v;
      if (backtrack(idx + 1)) {
        return true;
      }
      grid[r]![c] = null;
    }
    return false;
  };

  return backtrack(0) ? (grid as number[][]) : null;
}

/** 완성 격자를 이용해, 빈 칸을 모두 채워 클리어까지 도달하는 헬퍼(playSkyscraperPlacement 사용). */
function fillToSolved(
  start: SkyscraperState,
  solution: number[][],
): { state: SkyscraperState; status: SkyscraperStatus } {
  let state = start;
  let status: SkyscraperStatus = "playing";
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isSkyscraperGiven(state, { row, col })) {
        continue;
      }
      const value = solution[row]![col]!;
      const result = playSkyscraperPlacement(state, { row, col }, value);
      state = result.state;
      status = result.status;
    }
  }
  return { state, status };
}

describe("SKYSCRAPER_PUZZLES (도메인 뱅크 소비)", () => {
  it("각 퍼즐은 행/열 라틴 + 네 변 가시성 단서를 만족하게 완성 가능하다(백트래킹 솔버)", () => {
    for (const puzzle of SKYSCRAPER_PUZZLES) {
      const solution = solveSkyscrapers(puzzle);
      expect(solution).not.toBeNull();
    }
  });
});

describe("pickRandomSkyscraperPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomSkyscraperPuzzle(new FixedRandom([0]))).toBe(
      SKYSCRAPER_PUZZLES[0],
    );
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomSkyscraperPuzzle(new FixedRandom([0]));
    const b = pickRandomSkyscraperPuzzle(new FixedRandom([0]));
    expect(a).toBe(b);
  });

  it("범위 밖 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomSkyscraperPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomSkyscraperPuzzle(new FixedRandom([-1]))).toThrow();
    expect(() => pickRandomSkyscraperPuzzle(new FixedRandom([1.5]))).toThrow();
    // 뱅크 길이만큼(혹은 그 이상) 인덱스도 범위 밖.
    expect(() =>
      pickRandomSkyscraperPuzzle(new FixedRandom([SKYSCRAPER_PUZZLES.length])),
    ).toThrow();
  });
});

describe("startSkyscrapersGame", () => {
  it("고른 퍼즐의 고정 단서(givens non-null)가 given=true로, 빈 칸은 false로 반영된다", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    const puzzle = SKYSCRAPER_PUZZLES[0]!;
    const size = puzzle.size;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const expected = (puzzle.givens?.[row]?.[col] ?? null) !== null;
        expect(isSkyscraperGiven(state, { row, col })).toBe(expected);
        expect(state.grid[row]![col]).toBe(
          puzzle.givens?.[row]?.[col] ?? null,
        );
      }
    }
    expect(isSkyscraperSolved(state)).toBe(false);
  });

  it("퍼즐의 네 변 단서가 정규화되어 보존된다", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    const viaDomain = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(state.clues).toEqual(viaDomain.clues);
  });

  it("입력 퍼즐(도메인 뱅크 객체)을 변형하지 않는다(불변)", () => {
    const puzzle = SKYSCRAPER_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    startSkyscrapersGame(new ZeroRandom());
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });

  it("같은 퍼즐을 createSkyscrapers로 만든 상태와 동일하다(도메인 위임 확인)", () => {
    const viaApp = startSkyscrapersGame(new ZeroRandom());
    const viaDomain = createSkyscrapers(SKYSCRAPER_PUZZLES[0]!);
    expect(viaApp).toEqual(viaDomain);
  });
});

describe("playSkyscraperPlacement", () => {
  it("빈 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    // 첫 퍼즐의 (0,1)은 빈 칸.
    expect(isSkyscraperGiven(state, { row: 0, col: 1 })).toBe(false);
    const before = state.grid[0]![1];
    const result = playSkyscraperPlacement(state, { row: 0, col: 1 }, 2);
    expect(result.state.grid[0]![1]).toBe(2);
    expect(state.grid[0]![1]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
    expect(result.status).toBe("playing");
  });

  it("null로 채운 칸을 지운다", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    const filled = playSkyscraperPlacement(state, { row: 0, col: 1 }, 3).state;
    const cleared = playSkyscraperPlacement(filled, { row: 0, col: 1 }, null);
    expect(cleared.state.grid[0]![1]).toBeNull();
    expect(cleared.status).toBe("playing");
  });

  it("행/열 중복 입력의 좌표를 violations로 반영한다", () => {
    // (0,0)=1 고정. (1,0)에 1을 넣으면 같은 열(col 0)에 1이 중복.
    const state = startSkyscrapersGame(new ZeroRandom());
    expect(isSkyscraperGiven(state, { row: 0, col: 0 })).toBe(true);
    const result = playSkyscraperPlacement(state, { row: 1, col: 0 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("1,0");
    expect(result.status).toBe("playing");
  });

  it("올바르게 마지막 칸까지 채우면 violations=[]·status=solved 가 된다", () => {
    for (let index = 0; index < SKYSCRAPER_PUZZLES.length; index += 1) {
      const start = startSkyscrapersGame(new FixedRandom([index]));
      const solution = solveSkyscrapers(SKYSCRAPER_PUZZLES[index]!);
      expect(solution).not.toBeNull();
      const { state, status } = fillToSolved(start, solution!);
      expect(status).toBe("solved");
      expect(isSkyscraperSolved(state)).toBe(true);
      expect(skyscraperViolations(state)).toEqual([]);
    }
  });

  it("고정 단서 칸 편집은 도메인 throw를 그대로 전파한다", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)=1은 고정 단서.
    expect(isSkyscraperGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() =>
      playSkyscraperPlacement(state, { row: 0, col: 0 }, 2),
    ).toThrow();
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startSkyscrapersGame(new ZeroRandom());
    expect(() =>
      playSkyscraperPlacement(state, { row: 9, col: 0 }, 1),
    ).toThrow();
    expect(() =>
      playSkyscraperPlacement(state, { row: 0, col: 1 }, 99 as never),
    ).toThrow();
  });
});
