import { describe, expect, it } from "vitest";
import {
  KENKEN_PUZZLES,
  pickRandomKenKenPuzzle,
  playKenKenPlacement,
  startKenKenGame,
} from "./playKenKen";
import {
  createKenKen,
  isKenKenSolved,
  type KenKenPuzzle,
  type KenKenState,
} from "../domain/kenken";
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

/**
 * 백트래킹으로 켄켄 퍼즐을 푼다. 행/열 라틴(1..N 한 번씩)으로 채운 뒤 모든 케이지가 op·target을
 * 만족하는 완성 격자(1..N)를 찾으면 반환, 불가능하면 null.
 * (테스트가 "완성 가능"을 실제로 증명하기 위한 독립 솔버 — 프로덕션 코드와 무관.)
 */
function solveKenKen(puzzle: KenKenPuzzle): number[][] | null {
  const { size, cages } = puzzle;
  const grid: (number | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null as number | null),
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

  const cagesSatisfied = (): boolean => {
    for (const cage of cages) {
      const values = cage.cells.map((p) => grid[p.row]![p.col]!);
      if (values.length === 1) {
        if (values[0] !== cage.target) return false;
        continue;
      }
      switch (cage.op) {
        case "add":
          if (values.reduce((s, v) => s + v, 0) !== cage.target) return false;
          break;
        case "mul":
          if (values.reduce((s, v) => s * v, 1) !== cage.target) return false;
          break;
        case "sub": {
          const [a, b] = values as [number, number];
          if (Math.abs(a - b) !== cage.target) return false;
          break;
        }
        case "div": {
          const [a, b] = values as [number, number];
          const hi = Math.max(a, b);
          const lo = Math.min(a, b);
          if (lo === 0 || hi % lo !== 0 || hi / lo !== cage.target) return false;
          break;
        }
      }
    }
    return true;
  };

  const backtrack = (idx: number): boolean => {
    if (idx === size * size) {
      return cagesSatisfied();
    }
    const r = Math.floor(idx / size);
    const c = idx % size;
    for (let v = 1; v <= size; v += 1) {
      if (!canPlace(r, c, v)) continue;
      grid[r]![c] = v;
      if (backtrack(idx + 1)) return true;
      grid[r]![c] = null;
    }
    return false;
  };

  return backtrack(0) ? (grid as number[][]) : null;
}

/** 완성 격자를 이용해, 모든 칸을 채워 클리어까지 도달하는 헬퍼(playKenKenPlacement 사용). */
function fillToSolved(
  start: KenKenState,
  solution: number[][],
): { state: KenKenState; solved: boolean } {
  let state = start;
  let solved = false;
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const result = playKenKenPlacement(state, { row, col }, solution[row]![col]!);
      state = result.state;
      solved = result.solved;
    }
  }
  return { state, solved };
}

describe("KENKEN_PUZZLES (도메인 뱅크)", () => {
  it("2개 이상 제공한다", () => {
    expect(KENKEN_PUZZLES.length).toBeGreaterThanOrEqual(2);
  });

  it("모든 퍼즐이 createKenKen으로 예외 없이 생성된다(케이지가 격자 전체를 정확히 덮음)", () => {
    for (const puzzle of KENKEN_PUZZLES) {
      expect(() => createKenKen(puzzle)).not.toThrow();
    }
  });

  it("각 퍼즐은 라틴방진 + 모든 케이지 제약을 만족하게 완성 가능하다(백트래킹 솔버)", () => {
    for (const puzzle of KENKEN_PUZZLES) {
      const solution = solveKenKen(puzzle);
      expect(solution).not.toBeNull();
    }
  });
});

describe("pickRandomKenKenPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomKenKenPuzzle(new FixedRandom([0]))).toBe(KENKEN_PUZZLES[0]);
    expect(pickRandomKenKenPuzzle(new FixedRandom([1]))).toBe(KENKEN_PUZZLES[1]);
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomKenKenPuzzle(new FixedRandom([1]));
    const b = pickRandomKenKenPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖/비정수 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomKenKenPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomKenKenPuzzle(new FixedRandom([-1]))).toThrow();
    expect(() => pickRandomKenKenPuzzle(new FixedRandom([1.5]))).toThrow();
  });
});

describe("startKenKenGame", () => {
  it("고른 퍼즐로 빈 격자를 시작한다(모든 칸 null, 미클리어)", () => {
    const state = startKenKenGame(new ZeroRandom());
    const puzzle = KENKEN_PUZZLES[0]!;
    expect(state.size).toBe(puzzle.size);
    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        expect(state.grid[row]![col]).toBeNull();
      }
    }
    expect(isKenKenSolved(state)).toBe(false);
  });

  it("createKenKen으로 만든 상태와 동일하다(도메인 위임 확인)", () => {
    const viaApp = startKenKenGame(new ZeroRandom());
    const viaDomain = createKenKen(KENKEN_PUZZLES[0]!);
    expect(viaApp).toEqual(viaDomain);
  });

  it("입력 퍼즐(도메인 뱅크 객체)을 변형하지 않는다(불변)", () => {
    const puzzle = KENKEN_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    startKenKenGame(new ZeroRandom());
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });
});

describe("playKenKenPlacement", () => {
  it("빈 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startKenKenGame(new ZeroRandom());
    const before = state.grid[0]![0];
    const result = playKenKenPlacement(state, { row: 0, col: 0 }, 1);
    expect(result.state.grid[0]![0]).toBe(1);
    expect(state.grid[0]![0]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
    expect(result.solved).toBe(false);
  });

  it("채운 칸을 null로 지운다", () => {
    const state = startKenKenGame(new ZeroRandom());
    const filled = playKenKenPlacement(state, { row: 0, col: 0 }, 1).state;
    const cleared = playKenKenPlacement(filled, { row: 0, col: 0 }, null);
    expect(cleared.state.grid[0]![0]).toBeNull();
    expect(cleared.solved).toBe(false);
  });

  it("행 중복 입력의 좌표를 violations로 반영한다", () => {
    // 3×3 첫 퍼즐: (0,0)=1, (0,2)=1 이면 같은 행(row 0)에 1 중복.
    const state = startKenKenGame(new ZeroRandom());
    const a = playKenKenPlacement(state, { row: 0, col: 0 }, 1).state;
    const result = playKenKenPlacement(a, { row: 0, col: 2 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("0,2");
    expect(result.solved).toBe(false);
  });

  it("케이지 산술 위반 입력의 좌표를 violations로 반영한다", () => {
    // 3×3 첫 케이지 (0,0)+(0,1)=3. 1+1=2 ≠ 3 → 케이지 위반(+ 행 중복).
    const state = startKenKenGame(new ZeroRandom());
    const a = playKenKenPlacement(state, { row: 0, col: 0 }, 1).state;
    const result = playKenKenPlacement(a, { row: 0, col: 1 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("0,1");
    expect(result.solved).toBe(false);
  });

  it("올바른 해로 모든 칸을 채우면 solved=true 가 된다(각 퍼즐)", () => {
    for (let index = 0; index < KENKEN_PUZZLES.length; index += 1) {
      const start = startKenKenGame(new FixedRandom([index]));
      const solution = solveKenKen(KENKEN_PUZZLES[index]!);
      expect(solution).not.toBeNull();
      const { state, solved } = fillToSolved(start, solution!);
      expect(solved).toBe(true);
      expect(isKenKenSolved(state)).toBe(true);
    }
  });

  it("마지막 한 칸이 비어 있으면 solved=false 다", () => {
    const start = startKenKenGame(new ZeroRandom());
    const solution = solveKenKen(KENKEN_PUZZLES[0]!)!;
    let state = start;
    const size = solution.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (row === size - 1 && col === size - 1) continue; // 마지막 칸은 비워둠
        state = playKenKenPlacement(state, { row, col }, solution[row]![col]!).state;
      }
    }
    expect(isKenKenSolved(state)).toBe(false);
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startKenKenGame(new ZeroRandom());
    expect(() => playKenKenPlacement(state, { row: 9, col: 0 }, 1)).toThrow();
    expect(() =>
      playKenKenPlacement(state, { row: 0, col: 0 }, 99 as never),
    ).toThrow();
  });
});
