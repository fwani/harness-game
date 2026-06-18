import { describe, expect, it } from "vitest";
import {
  pickRandomFutoshikiPuzzle,
  playFutoshikiPlacement,
  startFutoshikiGame,
  type FutoshikiStatus,
} from "./playFutoshiki";
import {
  FUTOSHIKI_PUZZLES,
  createFutoshiki,
  isFutoshikiGiven,
  isFutoshikiSolved,
  type FutoshikiPuzzle,
  type FutoshikiState,
} from "../domain/futoshiki";
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
 * 백트래킹으로 후토시키 퍼즐을 푼다. 행/열 라틴(1..N 한 번씩) + 부등호 제약을 모두 만족하게
 * 빈 칸을 채울 수 있으면 완성 격자(1..N)를, 불가능하면 null을 반환한다.
 * (테스트가 "완성 가능"을 실제로 증명하기 위한 독립 솔버 — 프로덕션 코드와 무관.)
 */
function solveFutoshiki(puzzle: FutoshikiPuzzle): number[][] | null {
  const size = puzzle.givens.length;
  const grid: (number | null)[][] = puzzle.givens.map((row) =>
    row.map((v) => (v === null ? null : v)),
  );

  const fitsConstraints = (): boolean => {
    for (const { lt, gt } of puzzle.constraints) {
      const a = grid[lt.row]![lt.col] ?? null;
      const b = grid[gt.row]![gt.col] ?? null;
      if (a !== null && b !== null && a >= b) {
        return false;
      }
    }
    return true;
  };

  const canPlace = (r: number, c: number, v: number): boolean => {
    for (let j = 0; j < size; j += 1) {
      if (grid[r]![j] === v) return false;
    }
    for (let i = 0; i < size; i += 1) {
      if (grid[i]![c] === v) return false;
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
      return fitsConstraints();
    }
    const { r, c } = cells[idx]!;
    for (let v = 1; v <= size; v += 1) {
      if (!canPlace(r, c, v)) continue;
      grid[r]![c] = v;
      if (fitsConstraints() && backtrack(idx + 1)) {
        return true;
      }
      grid[r]![c] = null;
    }
    return false;
  };

  return backtrack(0) ? (grid as number[][]) : null;
}

/** 완성 격자를 이용해, 빈 칸을 모두 채워 클리어까지 도달하는 헬퍼(playFutoshikiPlacement 사용). */
function fillToSolved(
  start: FutoshikiState,
  solution: number[][],
): { state: FutoshikiState; status: FutoshikiStatus } {
  let state = start;
  let status: FutoshikiStatus = "playing";
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isFutoshikiGiven(state, { row, col })) {
        continue;
      }
      const value = solution[row]![col]!;
      const result = playFutoshikiPlacement(state, { row, col }, value);
      state = result.state;
      status = result.status;
    }
  }
  return { state, status };
}

describe("FUTOSHIKI_PUZZLES (도메인 뱅크 소비)", () => {
  it("각 퍼즐은 행/열 라틴 + 부등호 제약을 만족하게 완성 가능하다(백트래킹 솔버)", () => {
    for (const puzzle of FUTOSHIKI_PUZZLES) {
      const solution = solveFutoshiki(puzzle);
      expect(solution).not.toBeNull();
    }
  });
});

describe("pickRandomFutoshikiPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomFutoshikiPuzzle(new FixedRandom([0]))).toBe(
      FUTOSHIKI_PUZZLES[0],
    );
    expect(pickRandomFutoshikiPuzzle(new FixedRandom([1]))).toBe(
      FUTOSHIKI_PUZZLES[1],
    );
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomFutoshikiPuzzle(new FixedRandom([1]));
    const b = pickRandomFutoshikiPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomFutoshikiPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomFutoshikiPuzzle(new FixedRandom([-1]))).toThrow();
    expect(() => pickRandomFutoshikiPuzzle(new FixedRandom([1.5]))).toThrow();
  });
});

describe("startFutoshikiGame", () => {
  it("고른 퍼즐의 고정 단서(givens non-null)가 given=true로, 빈 칸은 false로 반영된다", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    const puzzle = FUTOSHIKI_PUZZLES[0]!;
    const size = puzzle.givens.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const expected = puzzle.givens[row]![col] !== null;
        expect(isFutoshikiGiven(state, { row, col })).toBe(expected);
        expect(state.grid[row]![col]).toBe(puzzle.givens[row]![col] ?? null);
      }
    }
    expect(isFutoshikiSolved(state)).toBe(false);
  });

  it("퍼즐의 부등호 제약이 보존된다", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    const puzzle = FUTOSHIKI_PUZZLES[0]!;
    expect(state.constraints).toEqual(puzzle.constraints);
  });

  it("입력 퍼즐(도메인 뱅크 객체)을 변형하지 않는다(불변)", () => {
    const puzzle = FUTOSHIKI_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    startFutoshikiGame(new ZeroRandom());
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });
});

describe("playFutoshikiPlacement", () => {
  it("빈 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    // 첫 퍼즐의 (0,1)은 빈 칸.
    expect(isFutoshikiGiven(state, { row: 0, col: 1 })).toBe(false);
    const before = state.grid[0]![1];
    const result = playFutoshikiPlacement(state, { row: 0, col: 1 }, 2);
    expect(result.state.grid[0]![1]).toBe(2);
    expect(state.grid[0]![1]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
    expect(result.status).toBe("playing");
  });

  it("null로 채운 칸을 지운다", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    const filled = playFutoshikiPlacement(state, { row: 0, col: 1 }, 3).state;
    const cleared = playFutoshikiPlacement(filled, { row: 0, col: 1 }, null);
    expect(cleared.state.grid[0]![1]).toBeNull();
    expect(cleared.status).toBe("playing");
  });

  it("행/열 중복 입력의 좌표를 violations로 반영한다", () => {
    // (0,0)=1 고정. (1,0)에 1을 넣으면 같은 열(col 0)에 1이 중복.
    const state = startFutoshikiGame(new ZeroRandom());
    expect(isFutoshikiGiven(state, { row: 0, col: 0 })).toBe(true);
    const result = playFutoshikiPlacement(state, { row: 1, col: 0 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("1,0");
    expect(result.status).toBe("playing");
  });

  it("부등호 제약 위반 입력의 좌표를 violations로 반영한다", () => {
    // 첫 퍼즐 제약 { lt:(0,0), gt:(0,1) } → grid[0][0] < grid[0][1] 이어야 함.
    // (0,0)=1 고정. (0,1)에 1을 넣으면 1 >= 1 로 부등호 위반(+ 같은 행 중복).
    const state = startFutoshikiGame(new ZeroRandom());
    const result = playFutoshikiPlacement(state, { row: 0, col: 1 }, 1);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("0,0");
    expect(keys).toContain("0,1");
    expect(result.status).toBe("playing");
  });

  it("올바르게 마지막 칸까지 채우면 status=solved 가 된다", () => {
    for (let index = 0; index < FUTOSHIKI_PUZZLES.length; index += 1) {
      const start = startFutoshikiGame(new FixedRandom([index]));
      const solution = solveFutoshiki(FUTOSHIKI_PUZZLES[index]!);
      expect(solution).not.toBeNull();
      const { state, status } = fillToSolved(start, solution!);
      expect(status).toBe("solved");
      expect(isFutoshikiSolved(state)).toBe(true);
    }
  });

  it("고정 단서 칸 편집은 도메인 throw를 그대로 전파한다", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)=1은 고정 단서.
    expect(isFutoshikiGiven(state, { row: 0, col: 0 })).toBe(true);
    expect(() => playFutoshikiPlacement(state, { row: 0, col: 0 }, 2)).toThrow();
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startFutoshikiGame(new ZeroRandom());
    expect(() => playFutoshikiPlacement(state, { row: 9, col: 0 }, 1)).toThrow();
    expect(() =>
      playFutoshikiPlacement(state, { row: 0, col: 1 }, 99 as never),
    ).toThrow();
  });

  it("같은 퍼즐을 createFutoshiki로 만든 상태와 동일하게 진행한다(도메인 위임 확인)", () => {
    const viaApp = startFutoshikiGame(new ZeroRandom());
    const viaDomain = createFutoshiki(FUTOSHIKI_PUZZLES[0]!);
    expect(viaApp).toEqual(viaDomain);
  });
});
