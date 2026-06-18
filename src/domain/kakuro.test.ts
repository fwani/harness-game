import { describe, it, expect } from "vitest";
import {
  createKakuro,
  inKakuroBounds,
  isKakuroComplete,
  isKakuroEntry,
  isKakuroSolved,
  kakuroRuns,
  kakuroViolations,
  setKakuroValue,
  KAKURO_PUZZLES,
  type KakuroPos,
  type KakuroPuzzle,
  type KakuroState,
} from "./kakuro";

// 첫 번째 내장 4×4 프리셋. 정답(입력 칸):
//   (1,1)=1 (1,2)=2
//   (2,1)=3 (2,2)=4 (2,3)=5
//           (3,2)=6 (3,3)=7
const PUZZLE = KAKURO_PUZZLES[0]!;
const SOLUTION: ReadonlyArray<{ pos: KakuroPos; value: number }> = [
  { pos: { row: 1, col: 1 }, value: 1 },
  { pos: { row: 1, col: 2 }, value: 2 },
  { pos: { row: 2, col: 1 }, value: 3 },
  { pos: { row: 2, col: 2 }, value: 4 },
  { pos: { row: 2, col: 3 }, value: 5 },
  { pos: { row: 3, col: 2 }, value: 6 },
  { pos: { row: 3, col: 3 }, value: 7 },
];

/** SOLUTION을 모두 채운 상태(원하면 일부 칸을 override). */
function solvedState(override: ReadonlyArray<{ pos: KakuroPos; value: number | null }> = []): KakuroState {
  let state = createKakuro(PUZZLE);
  for (const { pos, value } of SOLUTION) {
    state = setKakuroValue(state, pos, value);
  }
  for (const { pos, value } of override) {
    state = setKakuroValue(state, pos, value);
  }
  return state;
}

describe("createKakuro", () => {
  it("프리셋으로 빈 격자 상태를 만든다(입력 칸은 모두 null)", () => {
    const state = createKakuro(PUZZLE);
    expect(state.puzzle.size).toBe(4);
    expect(state.grid).toHaveLength(4);
    expect(state.grid.every((row) => row.length === 4)).toBe(true);
    expect(state.grid.flat().every((v) => v === null)).toBe(true);
  });

  it("입력 격자를 변형하지 않고 깊은 복사한다", () => {
    const state = createKakuro(PUZZLE);
    state.grid[1]![1] = 9;
    const fresh = createKakuro(PUZZLE);
    expect(fresh.grid[1]![1]).toBe(null);
  });

  it("정사각이 아니거나 변이 2 미만이면 throw", () => {
    expect(() =>
      createKakuro({ size: 1, layout: [[{ kind: "entry" }]] } as KakuroPuzzle),
    ).toThrow();
    expect(() =>
      createKakuro({
        size: 2,
        layout: [[{ kind: "entry" }, { kind: "entry" }], [{ kind: "entry" }]],
      } as KakuroPuzzle),
    ).toThrow();
  });

  it("size와 배치 변 길이가 다르면 throw", () => {
    expect(() =>
      createKakuro({ size: 3, layout: PUZZLE.layout } as KakuroPuzzle),
    ).toThrow();
  });

  it("잘못된 단서 합계(범위 밖/비정수)는 throw", () => {
    expect(() =>
      createKakuro({
        size: 2,
        layout: [
          [{ kind: "clue", down: 99, right: null }, { kind: "entry" }],
          [{ kind: "entry" }, { kind: "entry" }],
        ],
      } as KakuroPuzzle),
    ).toThrow();
  });
});

describe("inKakuroBounds / isKakuroEntry", () => {
  it("경계 안/밖을 구분한다", () => {
    const state = createKakuro(PUZZLE);
    expect(inKakuroBounds(state, { row: 0, col: 0 })).toBe(true);
    expect(inKakuroBounds(state, { row: 3, col: 3 })).toBe(true);
    expect(inKakuroBounds(state, { row: -1, col: 0 })).toBe(false);
    expect(inKakuroBounds(state, { row: 0, col: 4 })).toBe(false);
    expect(inKakuroBounds(state, { row: 1.5, col: 0 })).toBe(false);
  });

  it("입력 칸과 막힌/단서 칸을 구분한다", () => {
    const state = createKakuro(PUZZLE);
    expect(isKakuroEntry(state, { row: 1, col: 1 })).toBe(true);
    expect(isKakuroEntry(state, { row: 0, col: 0 })).toBe(false); // 빈 막힌 칸
    expect(isKakuroEntry(state, { row: 0, col: 1 })).toBe(false); // 단서 칸
    expect(isKakuroEntry(state, { row: 1, col: 0 })).toBe(false); // 단서 칸
    expect(isKakuroEntry(state, { row: -1, col: 0 })).toBe(false); // 경계 밖
  });
});

describe("setKakuroValue", () => {
  it("입력 칸에 1~9를 채우고 null로 지운다(입력 불변)", () => {
    const state = createKakuro(PUZZLE);
    const next = setKakuroValue(state, { row: 1, col: 1 }, 5);
    expect(next.grid[1]![1]).toBe(5);
    expect(state.grid[1]![1]).toBe(null); // 원본 불변
    const cleared = setKakuroValue(next, { row: 1, col: 1 }, null);
    expect(cleared.grid[1]![1]).toBe(null);
  });

  it("막힌/단서 칸 쓰기는 throw", () => {
    const state = createKakuro(PUZZLE);
    expect(() => setKakuroValue(state, { row: 0, col: 0 }, 1)).toThrow();
    expect(() => setKakuroValue(state, { row: 0, col: 1 }, 1)).toThrow();
    expect(() => setKakuroValue(state, { row: 1, col: 0 }, 1)).toThrow();
  });

  it("경계 밖 좌표는 throw", () => {
    const state = createKakuro(PUZZLE);
    expect(() => setKakuroValue(state, { row: -1, col: 0 }, 1)).toThrow();
    expect(() => setKakuroValue(state, { row: 0, col: 4 }, 1)).toThrow();
  });

  it("1~9·null 외 값(0, 10, 소수)은 throw", () => {
    const state = createKakuro(PUZZLE);
    expect(() => setKakuroValue(state, { row: 1, col: 1 }, 0)).toThrow();
    expect(() => setKakuroValue(state, { row: 1, col: 1 }, 10)).toThrow();
    expect(() => setKakuroValue(state, { row: 1, col: 1 }, 2.5)).toThrow();
  });
});

describe("kakuroRuns", () => {
  it("모든 가로/세로 런과 합계 단서를 열거한다", () => {
    const runs = kakuroRuns(PUZZLE);
    // 가로 3 + 세로 3 = 6개 런.
    expect(runs).toHaveLength(6);
    const byClueAndLen = runs
      .map((r) => `${r.clue}:${r.cells.length}`)
      .sort();
    // 가로: 3(2칸) 12(3칸) 13(2칸) / 세로: 4(2칸) 12(3칸) 12(2칸)
    expect(byClueAndLen).toEqual(
      ["12:2", "12:3", "12:3", "13:2", "3:2", "4:2"].sort(),
    );
  });
});

describe("kakuroViolations", () => {
  it("빈/부분 입력 상태는 위반이 없다(합계 미달은 위반 아님)", () => {
    const empty = createKakuro(PUZZLE);
    expect(kakuroViolations(empty)).toEqual([]);
    // 가로 런(1,1)(1,2)에 한 칸만 채움 → 합계 미달이지만 위반 아님.
    const partial = setKakuroValue(empty, { row: 1, col: 1 }, 1);
    expect(kakuroViolations(partial)).toEqual([]);
  });

  it("같은 런 내 숫자 중복을 위반으로 탐지한다", () => {
    const empty = createKakuro(PUZZLE);
    // 세로 런 col1: (1,1)=2, (2,1)=2 → 중복.
    let state = setKakuroValue(empty, { row: 1, col: 1 }, 2);
    state = setKakuroValue(state, { row: 2, col: 1 }, 2);
    const v = kakuroViolations(state);
    expect(v).toContainEqual({ row: 1, col: 1 });
    expect(v).toContainEqual({ row: 2, col: 1 });
  });

  it("모두 채워진 런의 합계 불일치를 위반으로 탐지한다", () => {
    // 가로 런(1,1)(1,2) 단서 3을, 합 9(=4+5)로 채워 불일치 + 다른 칸은 정답.
    const state = solvedState([
      { pos: { row: 1, col: 1 }, value: 4 },
      { pos: { row: 1, col: 2 }, value: 5 },
    ]);
    const v = kakuroViolations(state);
    expect(v).toContainEqual({ row: 1, col: 1 });
    expect(v).toContainEqual({ row: 1, col: 2 });
  });

  it("정답 상태는 위반이 없다", () => {
    expect(kakuroViolations(solvedState())).toEqual([]);
  });
});

describe("isKakuroComplete / isKakuroSolved", () => {
  it("입력 칸이 다 차야 complete", () => {
    const state = createKakuro(PUZZLE);
    expect(isKakuroComplete(state)).toBe(false);
    expect(isKakuroComplete(solvedState())).toBe(true);
  });

  it("내장 프리셋 정답을 채우면 isKakuroSolved=true", () => {
    expect(isKakuroSolved(solvedState())).toBe(true);
  });

  it("위반이 있으면(합계 불일치) isKakuroSolved=false", () => {
    const wrong = solvedState([
      { pos: { row: 1, col: 1 }, value: 4 },
      { pos: { row: 1, col: 2 }, value: 5 },
    ]);
    expect(isKakuroComplete(wrong)).toBe(true);
    expect(isKakuroSolved(wrong)).toBe(false);
  });

  it("미완성이면 isKakuroSolved=false", () => {
    const partial = solvedState([{ pos: { row: 3, col: 3 }, value: null }]);
    expect(isKakuroComplete(partial)).toBe(false);
    expect(isKakuroSolved(partial)).toBe(false);
  });
});

describe("KAKURO_PUZZLES 내장 프리셋", () => {
  it("최소 1개 이상이며 모두 createKakuro로 생성 가능", () => {
    expect(KAKURO_PUZZLES.length).toBeGreaterThanOrEqual(1);
    for (const puzzle of KAKURO_PUZZLES) {
      expect(() => createKakuro(puzzle)).not.toThrow();
    }
  });

  it("두 번째 3×3 프리셋도 정답을 채우면 solved", () => {
    let state = createKakuro(KAKURO_PUZZLES[1]!);
    state = setKakuroValue(state, { row: 1, col: 1 }, 1);
    state = setKakuroValue(state, { row: 1, col: 2 }, 2);
    state = setKakuroValue(state, { row: 2, col: 1 }, 3);
    state = setKakuroValue(state, { row: 2, col: 2 }, 4);
    expect(isKakuroSolved(state)).toBe(true);
  });
});
