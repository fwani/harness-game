import { describe, expect, it } from "vitest";
import {
  pickRandomBinairoPuzzle,
  playBinairoPlacement,
  startBinairoGame,
  type BinairoStatus,
} from "./playBinairo";
import {
  BINAIRO_PUZZLES,
  createBinairo,
  isBinairoGiven,
  isBinairoSolved,
  type BinairoGrid,
  type BinairoState,
} from "../domain/binairo";
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
 * 백트래킹으로 비나이로 퍼즐을 푼다. 모든 제약(3연속 금지·행/열 동수·중복 행/열 금지)을 만족하게
 * 모든 빈 칸을 채울 수 있으면 완성 격자(0/1)를, 불가능하면 null을 반환한다.
 * (테스트가 "완성 가능"을 실제로 증명하기 위한 독립 솔버 — 프로덕션 코드와 무관.)
 */
function solveBinairo(puzzle: BinairoGrid): number[][] | null {
  const size = puzzle.length;
  const half = size / 2;
  const grid: (number | null)[][] = puzzle.map((row) =>
    row.map((v) => (v === null ? null : v)),
  );

  // 부분 배치 시 즉시 깨지는 제약(3연속·동수 초과)을 검사한다.
  const partialOk = (r: number, c: number): boolean => {
    const v = grid[r]![c]!;
    // 가로 3연속
    if (c >= 2 && grid[r]![c - 1] === v && grid[r]![c - 2] === v) return false;
    // 세로 3연속
    if (r >= 2 && grid[r - 1]![c] === v && grid[r - 2]![c] === v) return false;
    // 행 동수 초과
    let rowCount = 0;
    for (let j = 0; j < size; j += 1) if (grid[r]![j] === v) rowCount += 1;
    if (rowCount > half) return false;
    // 열 동수 초과
    let colCount = 0;
    for (let i = 0; i < size; i += 1) if (grid[i]![c] === v) colCount += 1;
    if (colCount > half) return false;
    return true;
  };

  const uniqueLines = (): boolean => {
    const rows = grid.map((row) => row.join(""));
    const cols: string[] = [];
    for (let c = 0; c < size; c += 1) {
      let col = "";
      for (let r = 0; r < size; r += 1) col += String(grid[r]![c]);
      cols.push(col);
    }
    return new Set(rows).size === size && new Set(cols).size === size;
  };

  const cells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (grid[r]![c] === null) cells.push({ r, c });
    }
  }

  const backtrack = (idx: number): boolean => {
    if (idx === cells.length) {
      return uniqueLines();
    }
    const { r, c } = cells[idx]!;
    for (const v of [0, 1]) {
      grid[r]![c] = v;
      if (partialOk(r, c) && backtrack(idx + 1)) {
        return true;
      }
      grid[r]![c] = null;
    }
    return false;
  };

  return backtrack(0) ? (grid as number[][]) : null;
}

/** 완성 격자를 이용해, 빈 칸을 모두 채워 클리어까지 도달하는 헬퍼(playBinairoPlacement 사용). */
function fillToSolved(
  start: BinairoState,
  solution: number[][],
): { state: BinairoState; status: BinairoStatus } {
  let state = start;
  let status: BinairoStatus = "playing";
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isBinairoGiven(state, { row, col })) {
        continue;
      }
      const value = solution[row]![col] as 0 | 1;
      const result = playBinairoPlacement(state, { row, col }, value);
      state = result.state;
      status = result.status;
    }
  }
  return { state, status };
}

describe("BINAIRO_PUZZLES (도메인 뱅크 소비)", () => {
  it("각 퍼즐은 충돌 없이 완성 가능하다(백트래킹 솔버로 검증)", () => {
    for (const puzzle of BINAIRO_PUZZLES) {
      const solution = solveBinairo(puzzle);
      expect(solution).not.toBeNull();
    }
  });
});

describe("pickRandomBinairoPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomBinairoPuzzle(new FixedRandom([0]))).toBe(
      BINAIRO_PUZZLES[0],
    );
    expect(pickRandomBinairoPuzzle(new FixedRandom([1]))).toBe(
      BINAIRO_PUZZLES[1],
    );
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomBinairoPuzzle(new FixedRandom([1]));
    const b = pickRandomBinairoPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomBinairoPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomBinairoPuzzle(new FixedRandom([-1]))).toThrow();
  });
});

describe("startBinairoGame", () => {
  it("고른 퍼즐의 고정 단서(non-null)가 given=true로 반영된 BinairoState를 반환한다", () => {
    const state = startBinairoGame(new ZeroRandom());
    const puzzle = BINAIRO_PUZZLES[0]!;
    const size = puzzle.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const expected = puzzle[row]![col] !== null;
        expect(isBinairoGiven(state, { row, col })).toBe(expected);
        expect(state.grid[row]![col]).toBe(puzzle[row]![col] ?? null);
      }
    }
    expect(isBinairoSolved(state)).toBe(false);
  });

  it("입력 퍼즐(도메인 뱅크 배열)을 변형하지 않는다(불변)", () => {
    const puzzle = BINAIRO_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    startBinairoGame(new ZeroRandom());
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });
});

describe("playBinairoPlacement", () => {
  it("빈 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startBinairoGame(new ZeroRandom());
    // 첫 퍼즐의 (0,1)은 빈 칸.
    expect(isBinairoGiven(state, { row: 0, col: 1 })).toBe(false);
    const before = state.grid[0]![1];
    const result = playBinairoPlacement(state, { row: 0, col: 1 }, 1);
    expect(result.state.grid[0]![1]).toBe(1);
    expect(state.grid[0]![1]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
    expect(result.status).toBe("playing");
  });

  it("null로 채운 칸을 지운다", () => {
    const state = startBinairoGame(new ZeroRandom());
    const filled = playBinairoPlacement(state, { row: 0, col: 1 }, 0).state;
    const cleared = playBinairoPlacement(filled, { row: 0, col: 1 }, null);
    expect(cleared.state.grid[0]![1]).toBeNull();
    expect(cleared.status).toBe("playing");
  });

  it("위반(3연속 등)하는 입력의 좌표를 violations로 반영한다", () => {
    // 검증 가능한 작은 퍼즐: (0,0),(0,1)이 1로 고정. (0,2)에 1을 넣으면 가로 3연속.
    const state = createBinairo([
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const result = playBinairoPlacement(state, { row: 0, col: 2 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("0,1");
    expect(keys).toContain("0,2");
    expect(result.status).toBe("playing");
  });

  it("올바르게 마지막 칸까지 채우면 status=solved 가 된다", () => {
    for (let index = 0; index < BINAIRO_PUZZLES.length; index += 1) {
      const start = startBinairoGame(new FixedRandom([index]));
      const solution = solveBinairo(BINAIRO_PUZZLES[index]!);
      expect(solution).not.toBeNull();
      const { state, status } = fillToSolved(start, solution!);
      expect(status).toBe("solved");
      expect(isBinairoSolved(state)).toBe(true);
    }
  });

  it("고정 단서 칸 편집은 도메인 throw를 그대로 전파한다", () => {
    const state = startBinairoGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)=0은 고정 단서.
    expect(isBinairoGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() => playBinairoPlacement(state, { row: 0, col: 0 }, 1)).toThrow();
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startBinairoGame(new ZeroRandom());
    expect(() => playBinairoPlacement(state, { row: 6, col: 0 }, 1)).toThrow();
    expect(() =>
      playBinairoPlacement(state, { row: 0, col: 1 }, 2 as never),
    ).toThrow();
  });
});
