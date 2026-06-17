import { describe, expect, it } from "vitest";
import {
  SUDOKU_PUZZLES,
  pickRandomSudokuPuzzle,
  playSudokuPlacement,
  startSudokuGame,
  type SudokuStatus,
} from "./playSudoku";
import {
  createSudoku,
  isSudokuGiven,
  isSudokuSolved,
  SUDOKU_SIZE,
  type SudokuGrid,
  type SudokuState,
} from "../domain/sudoku";
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
 * 백트래킹으로 퍼즐을 푼다. 충돌 없이 모든 칸을 채울 수 있으면 완성 격자를, 불가능하면 null을 반환한다.
 * (테스트가 "완성 가능"을 실제로 증명하기 위한 독립 솔버 — 프로덕션 코드와 무관.)
 */
function solveSudoku(puzzle: SudokuGrid): number[][] | null {
  const grid = puzzle.map((row) => row.map((v) => v ?? 0));
  const canPlace = (r: number, c: number, v: number): boolean => {
    for (let i = 0; i < SUDOKU_SIZE; i += 1) {
      if (grid[r]![i] === v || grid[i]![c] === v) {
        return false;
      }
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr += 1) {
      for (let dc = 0; dc < 3; dc += 1) {
        if (grid[br + dr]![bc + dc] === v) {
          return false;
        }
      }
    }
    return true;
  };
  const backtrack = (pos: number): boolean => {
    if (pos === SUDOKU_SIZE * SUDOKU_SIZE) {
      return true;
    }
    const r = Math.floor(pos / SUDOKU_SIZE);
    const c = pos % SUDOKU_SIZE;
    if (grid[r]![c] !== 0) {
      return backtrack(pos + 1);
    }
    for (let v = 1; v <= SUDOKU_SIZE; v += 1) {
      if (canPlace(r, c, v)) {
        grid[r]![c] = v;
        if (backtrack(pos + 1)) {
          return true;
        }
        grid[r]![c] = 0;
      }
    }
    return false;
  };
  return backtrack(0) ? grid : null;
}

/** 완성 격자를 이용해, 빈 칸을 모두 채워 클리어까지 도달하는 헬퍼(playSudokuPlacement 사용). */
function fillToSolved(
  start: SudokuState,
  solution: number[][],
): { state: SudokuState; status: SudokuStatus } {
  let state = start;
  let status: SudokuStatus = "playing";
  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      if (isSudokuGiven(state, { row, col })) {
        continue;
      }
      const result = playSudokuPlacement(
        state,
        { row, col },
        solution[row]![col]!,
      );
      state = result.state;
      status = result.status;
    }
  }
  return { state, status };
}

describe("SUDOKU_PUZZLES", () => {
  it("최소 3개 이상의 퍼즐을 제공한다", () => {
    expect(SUDOKU_PUZZLES.length).toBeGreaterThanOrEqual(3);
  });

  it("각 퍼즐은 9×9이고 값이 null 또는 정수 1~9이다", () => {
    for (const puzzle of SUDOKU_PUZZLES) {
      expect(puzzle).toHaveLength(SUDOKU_SIZE);
      for (const row of puzzle) {
        expect(row).toHaveLength(SUDOKU_SIZE);
        for (const value of row) {
          if (value !== null) {
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(1);
            expect(value).toBeLessThanOrEqual(SUDOKU_SIZE);
          }
        }
      }
    }
  });

  it("각 퍼즐은 도메인 createSudoku를 통과하고 고정 단서가 given=true로 반영된다", () => {
    for (const puzzle of SUDOKU_PUZZLES) {
      const state = createSudoku(puzzle);
      for (let row = 0; row < SUDOKU_SIZE; row += 1) {
        for (let col = 0; col < SUDOKU_SIZE; col += 1) {
          const expected = puzzle[row]![col] !== null && puzzle[row]![col] !== undefined;
          expect(isSudokuGiven(state, { row, col })).toBe(expected);
        }
      }
    }
  });

  it("각 퍼즐은 충돌 없이 완성 가능하다(백트래킹 솔버로 검증)", () => {
    for (const puzzle of SUDOKU_PUZZLES) {
      const solution = solveSudoku(puzzle);
      expect(solution).not.toBeNull();
    }
  });
});

describe("pickRandomSudokuPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomSudokuPuzzle(new FixedRandom([0]))).toBe(SUDOKU_PUZZLES[0]);
    expect(pickRandomSudokuPuzzle(new FixedRandom([2]))).toBe(SUDOKU_PUZZLES[2]);
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomSudokuPuzzle(new FixedRandom([1]));
    const b = pickRandomSudokuPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomSudokuPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomSudokuPuzzle(new FixedRandom([-1]))).toThrow();
  });
});

describe("startSudokuGame", () => {
  it("고른 퍼즐의 고정 단서가 given=true로 반영된 SudokuState를 반환한다", () => {
    const state = startSudokuGame(new ZeroRandom());
    const puzzle = SUDOKU_PUZZLES[0]!;
    for (let row = 0; row < SUDOKU_SIZE; row += 1) {
      for (let col = 0; col < SUDOKU_SIZE; col += 1) {
        const expected = puzzle[row]![col] !== null && puzzle[row]![col] !== undefined;
        expect(isSudokuGiven(state, { row, col })).toBe(expected);
        expect(state.cells[row]![col]).toBe(puzzle[row]![col] ?? null);
      }
    }
    expect(isSudokuSolved(state)).toBe(false);
  });
});

describe("playSudokuPlacement", () => {
  it("빈 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startSudokuGame(new ZeroRandom());
    // 첫 퍼즐의 (0,2)는 빈 칸.
    expect(isSudokuGiven(state, { row: 0, col: 2 })).toBe(false);
    const before = state.cells[0]![2];
    const result = playSudokuPlacement(state, { row: 0, col: 2 }, 4);
    expect(result.state.cells[0]![2]).toBe(4);
    expect(state.cells[0]![2]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
  });

  it("null로 채운 칸을 지운다", () => {
    const state = startSudokuGame(new ZeroRandom());
    const filled = playSudokuPlacement(state, { row: 0, col: 2 }, 4).state;
    const cleared = playSudokuPlacement(filled, { row: 0, col: 2 }, null);
    expect(cleared.state.cells[0]![2]).toBeNull();
    expect(cleared.status).toBe("playing");
  });

  it("충돌하는 입력의 좌표를 conflicts로 반영한다", () => {
    const state = startSudokuGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)=5(given). (0,2)에 5를 넣으면 같은 행에서 충돌.
    const result = playSudokuPlacement(state, { row: 0, col: 2 }, 5);
    const keys = result.conflicts.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("0,2");
    expect(result.status).toBe("playing");
  });

  it("올바르게 마지막 칸까지 채우면 status=solved 가 된다", () => {
    for (let index = 0; index < SUDOKU_PUZZLES.length; index += 1) {
      const start = startSudokuGame(new FixedRandom([index]));
      const solution = solveSudoku(SUDOKU_PUZZLES[index]!);
      expect(solution).not.toBeNull();
      const { state, status } = fillToSolved(start, solution!);
      expect(status).toBe("solved");
      expect(isSudokuSolved(state)).toBe(true);
    }
  });

  it("고정 단서 칸 편집은 도메인 throw를 그대로 전파한다", () => {
    const state = startSudokuGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)=5는 고정 단서.
    expect(isSudokuGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() => playSudokuPlacement(state, { row: 0, col: 0 }, 1)).toThrow();
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startSudokuGame(new ZeroRandom());
    expect(() => playSudokuPlacement(state, { row: 9, col: 0 }, 1)).toThrow();
    expect(() =>
      playSudokuPlacement(state, { row: 0, col: 2 }, 10 as never),
    ).toThrow();
  });
});
