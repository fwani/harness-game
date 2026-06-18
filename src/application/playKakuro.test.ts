import { describe, expect, it } from "vitest";
import {
  pickRandomKakuroPuzzle,
  playKakuroPlacement,
  startKakuroGame,
  type KakuroStatus,
} from "./playKakuro";
import {
  KAKURO_PUZZLES,
  createKakuro,
  isKakuroEntry,
  isKakuroSolved,
  type KakuroState,
} from "../domain/kakuro";
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
 * 각 내장 퍼즐의 정답 격자(입력 칸 값; 막힌/단서 칸은 null). 도메인 KAKURO_PUZZLES의
 * 주석에 명시된 풀이를 옮긴 것 — "정답을 채우면 solved"를 실제로 증명하기 위한 테스트 데이터.
 */
const SOLUTIONS: number[][][] = [
  // 4×4
  [
    [0, 0, 0, 0],
    [0, 1, 2, 0],
    [0, 3, 4, 5],
    [0, 0, 6, 7],
  ],
  // 3×3
  [
    [0, 0, 0],
    [0, 1, 2],
    [0, 3, 4],
  ],
];

/** 정답 격자를 이용해 모든 입력 칸을 채워 클리어까지 도달한다(playKakuroPlacement 사용). */
function fillToSolved(
  start: KakuroState,
  solution: number[][],
): { state: KakuroState; status: KakuroStatus } {
  let state = start;
  let status: KakuroStatus = "playing";
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!isKakuroEntry(state, { row, col })) {
        continue;
      }
      const value = solution[row]![col]!;
      const result = playKakuroPlacement(state, { row, col }, value);
      state = result.state;
      status = result.status;
    }
  }
  return { state, status };
}

describe("pickRandomKakuroPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomKakuroPuzzle(new FixedRandom([0]))).toBe(
      KAKURO_PUZZLES[0],
    );
    expect(pickRandomKakuroPuzzle(new FixedRandom([1]))).toBe(
      KAKURO_PUZZLES[1],
    );
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다(결정적)", () => {
    const a = pickRandomKakuroPuzzle(new FixedRandom([1]));
    const b = pickRandomKakuroPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖/비정수 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomKakuroPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomKakuroPuzzle(new FixedRandom([-1]))).toThrow();
    expect(() => pickRandomKakuroPuzzle(new FixedRandom([0.5]))).toThrow();
  });
});

describe("startKakuroGame", () => {
  it("고른 퍼즐을 createKakuro로 만든 상태와 동일하게 시작한다(도메인 위임 확인)", () => {
    const viaApp = startKakuroGame(new ZeroRandom());
    const viaDomain = createKakuro(KAKURO_PUZZLES[0]!);
    expect(viaApp).toEqual(viaDomain);
  });

  it("시작 상태의 입력 칸은 전부 비어 있고 아직 클리어가 아니다", () => {
    const state = startKakuroGame(new ZeroRandom());
    const size = state.puzzle.size;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        expect(state.grid[row]![col]).toBeNull();
      }
    }
    expect(isKakuroSolved(state)).toBe(false);
  });

  it("입력 퍼즐(도메인 뱅크 객체)을 변형하지 않는다(불변)", () => {
    const puzzle = KAKURO_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    startKakuroGame(new ZeroRandom());
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });
});

describe("playKakuroPlacement", () => {
  it("빈 입력 칸을 채우고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startKakuroGame(new ZeroRandom());
    // 첫 퍼즐의 (1,1)은 입력 칸.
    expect(isKakuroEntry(state, { row: 1, col: 1 })).toBe(true);
    const before = state.grid[1]![1];
    const result = playKakuroPlacement(state, { row: 1, col: 1 }, 1);
    expect(result.state.grid[1]![1]).toBe(1);
    expect(state.grid[1]![1]).toBe(before); // 원본 불변
    expect(result.state).not.toBe(state);
    expect(result.status).toBe("playing");
  });

  it("null로 채운 칸을 지운다", () => {
    const state = startKakuroGame(new ZeroRandom());
    const filled = playKakuroPlacement(state, { row: 1, col: 1 }, 5).state;
    const cleared = playKakuroPlacement(filled, { row: 1, col: 1 }, null);
    expect(cleared.state.grid[1]![1]).toBeNull();
    expect(cleared.status).toBe("playing");
  });

  it("같은 런 안의 숫자 중복 좌표를 violations로 반영한다", () => {
    // 첫 퍼즐: (1,1)·(1,2)는 같은 가로 런(합계 3). 둘 다 2면 런 내 중복.
    const state = startKakuroGame(new ZeroRandom());
    const a = playKakuroPlacement(state, { row: 1, col: 1 }, 2).state;
    const result = playKakuroPlacement(a, { row: 1, col: 2 }, 2);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("1,1");
    expect(keys).toContain("1,2");
    expect(result.status).toBe("playing");
  });

  it("채워진 런의 합계 불일치를 violations로 반영한다", () => {
    // 첫 퍼즐: (1,1)·(1,2)는 합계 3 런. 1+9=10 ≠ 3 → 두 칸 위반.
    const state = startKakuroGame(new ZeroRandom());
    const a = playKakuroPlacement(state, { row: 1, col: 1 }, 1).state;
    const result = playKakuroPlacement(a, { row: 1, col: 2 }, 9);
    const keys = result.violations.map((p) => `${p.row},${p.col}`);
    expect(keys).toContain("1,1");
    expect(keys).toContain("1,2");
    expect(result.status).toBe("playing");
  });

  it("정답을 마지막 칸까지 채우면 violations=[]·status=solved 가 된다", () => {
    for (let index = 0; index < KAKURO_PUZZLES.length; index += 1) {
      const start = startKakuroGame(new FixedRandom([index]));
      const { state, status } = fillToSolved(start, SOLUTIONS[index]!);
      expect(status).toBe("solved");
      expect(isKakuroSolved(state)).toBe(true);
    }
  });

  it("막힌/단서 칸 편집은 도메인 throw를 그대로 전파한다", () => {
    const state = startKakuroGame(new ZeroRandom());
    // 첫 퍼즐 (0,0)은 막힌 칸(입력 칸 아님).
    expect(isKakuroEntry(state, { row: 0, col: 0 })).toBe(false);
    expect(() =>
      playKakuroPlacement(state, { row: 0, col: 0 }, 1),
    ).toThrow();
  });

  it("범위 밖 좌표·잘못된 값은 도메인 throw를 그대로 전파한다", () => {
    const state = startKakuroGame(new ZeroRandom());
    expect(() =>
      playKakuroPlacement(state, { row: 9, col: 0 }, 1),
    ).toThrow();
    expect(() =>
      playKakuroPlacement(state, { row: 1, col: 1 }, 99 as never),
    ).toThrow();
    expect(() =>
      playKakuroPlacement(state, { row: 1, col: 1 }, 0 as never),
    ).toThrow();
  });
});
