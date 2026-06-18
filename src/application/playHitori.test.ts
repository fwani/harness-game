import { describe, expect, it } from "vitest";
import {
  HITORI_PUZZLES,
  pickRandomHitoriPuzzle,
  playHitoriToggle,
  startHitoriGame,
} from "./playHitori";
import {
  createHitori,
  hitoriMarkAt,
  isHitoriSolved,
  type HitoriPos,
  type HitoriState,
} from "../domain/hitori";
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
 * 각 퍼즐의 알려진 해답 칠 상태(black 좌표). 인덱스는 HITORI_PUZZLES 순서와 일치한다.
 * 테스트는 all-white 시작에서 이 좌표들을 toggle해 세 제약을 모두 만족(isHitoriSolved)함을 검증한다.
 */
const HITORI_SOLUTIONS: ReadonlyArray<ReadonlyArray<HitoriPos>> = [
  [
    { row: 1, col: 1 },
    { row: 3, col: 3 },
  ],
  [
    { row: 0, col: 3 },
    { row: 2, col: 2 },
    { row: 4, col: 1 },
  ],
];

/** 주어진 black 좌표들을 all-white 시작 상태에서 toggle해 해답 상태를 만든다. */
function applySolution(
  start: HitoriState,
  blackCells: ReadonlyArray<HitoriPos>,
): HitoriState {
  let state = start;
  for (const pos of blackCells) {
    state = playHitoriToggle(state, pos).state;
  }
  return state;
}

describe("HITORI_PUZZLES (풀이 가능 보장)", () => {
  it("퍼즐이 2개 이상이다", () => {
    expect(HITORI_PUZZLES.length).toBeGreaterThanOrEqual(2);
    expect(HITORI_SOLUTIONS.length).toBe(HITORI_PUZZLES.length);
  });

  it("각 퍼즐은 해답 칠 상태를 toggle로 재현하면 isHitoriSolved=true 가 된다", () => {
    for (let index = 0; index < HITORI_PUZZLES.length; index += 1) {
      const start = createHitori(HITORI_PUZZLES[index]!);
      const solved = applySolution(start, HITORI_SOLUTIONS[index]!);
      expect(isHitoriSolved(solved)).toBe(true);
      // 해답 좌표는 black, 그 외는 white 여야 한다.
      const blackKeys = new Set(
        HITORI_SOLUTIONS[index]!.map((p) => `${p.row},${p.col}`),
      );
      const size = HITORI_PUZZLES[index]!.length;
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const expected = blackKeys.has(`${row},${col}`) ? "black" : "white";
          expect(hitoriMarkAt(solved, { row, col })).toBe(expected);
        }
      }
    }
  });
});

describe("pickRandomHitoriPuzzle", () => {
  it("주입한 RandomSource의 인덱스로 결정적으로 선택한다", () => {
    expect(pickRandomHitoriPuzzle(new FixedRandom([0]))).toBe(HITORI_PUZZLES[0]);
    expect(pickRandomHitoriPuzzle(new FixedRandom([1]))).toBe(HITORI_PUZZLES[1]);
  });

  it("같은 시퀀스면 같은 퍼즐을 반환한다", () => {
    const a = pickRandomHitoriPuzzle(new FixedRandom([1]));
    const b = pickRandomHitoriPuzzle(new FixedRandom([1]));
    expect(a).toBe(b);
  });

  it("범위 밖/비정수 인덱스를 반환하면 throw 한다", () => {
    expect(() => pickRandomHitoriPuzzle(new OutOfRangeRandom())).toThrow();
    expect(() => pickRandomHitoriPuzzle(new FixedRandom([-1]))).toThrow();
    expect(() => pickRandomHitoriPuzzle(new FixedRandom([0.5]))).toThrow();
  });
});

describe("startHitoriGame", () => {
  it("고른 퍼즐의 숫자판으로 모든 칸이 white인 시작 상태를 만든다", () => {
    const state = startHitoriGame(new ZeroRandom());
    const puzzle = HITORI_PUZZLES[0]!;
    const size = puzzle.length;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        expect(state.numbers[row]![col]).toBe(puzzle[row]![col]);
        expect(hitoriMarkAt(state, { row, col })).toBe("white");
      }
    }
    // 시작(all-white)에는 (1,1)/(1,0)이 둘 다 white·같은 값(2)이라 아직 풀리지 않은 상태.
    expect(isHitoriSolved(state)).toBe(false);
  });

  it("입력 퍼즐(도메인 뱅크 배열)을 변형하지 않는다(불변)", () => {
    const puzzle = HITORI_PUZZLES[0]!;
    const snapshot = JSON.stringify(puzzle);
    const state = startHitoriGame(new ZeroRandom());
    // 시작 상태를 토글해도 원본 뱅크 배열은 그대로여야 한다.
    playHitoriToggle(state, { row: 0, col: 0 });
    expect(JSON.stringify(puzzle)).toBe(snapshot);
  });
});

describe("playHitoriToggle", () => {
  it("칸을 white→black으로 토글하고, 입력 state는 변형하지 않는다(불변)", () => {
    const state = startHitoriGame(new ZeroRandom());
    const before = hitoriMarkAt(state, { row: 1, col: 1 });
    expect(before).toBe("white");
    const result = playHitoriToggle(state, { row: 1, col: 1 });
    expect(hitoriMarkAt(result.state, { row: 1, col: 1 })).toBe("black");
    // 원본 불변
    expect(hitoriMarkAt(state, { row: 1, col: 1 })).toBe("white");
    expect(result.state).not.toBe(state);
  });

  it("같은 칸을 두 번 토글하면 다시 white로 되돌아온다", () => {
    const state = startHitoriGame(new ZeroRandom());
    const once = playHitoriToggle(state, { row: 1, col: 1 }).state;
    const twice = playHitoriToggle(once, { row: 1, col: 1 }).state;
    expect(hitoriMarkAt(twice, { row: 1, col: 1 })).toBe("white");
  });

  it("위반(white 행 중복)을 violations에 도메인 결과대로 반영한다", () => {
    // 첫 퍼즐 row1: [2,2,4,5,1] → (1,0)·(1,1)이 둘 다 white·값 2로 중복.
    // 무관한 칸(0,4)을 토글해도 row1의 white 중복 위반이 그대로 보고된다.
    const state = startHitoriGame(new ZeroRandom());
    const result = playHitoriToggle(state, { row: 0, col: 4 });
    const dup = result.violations.find((v) => v.type === "duplicate-white");
    expect(dup).toBeDefined();
    expect(result.status).toBe("playing");
  });

  it("해답 칠 상태에 도달하면 status=solved 가 된다", () => {
    for (let index = 0; index < HITORI_PUZZLES.length; index += 1) {
      const start = startHitoriGame(new FixedRandom([index]));
      const cells = HITORI_SOLUTIONS[index]!;
      let state = start;
      let status: "playing" | "solved" = "playing";
      for (const pos of cells) {
        const result = playHitoriToggle(state, pos);
        state = result.state;
        status = result.status;
      }
      expect(status).toBe("solved");
      expect(isHitoriSolved(state)).toBe(true);
    }
  });

  it("경계 밖/비정수 좌표는 도메인 throw를 그대로 전파한다", () => {
    const state = startHitoriGame(new ZeroRandom());
    expect(() => playHitoriToggle(state, { row: 5, col: 0 })).toThrow();
    expect(() => playHitoriToggle(state, { row: -1, col: 0 })).toThrow();
    expect(() => playHitoriToggle(state, { row: 0.5, col: 0 })).toThrow();
  });
});
