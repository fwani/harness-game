import { describe, it, expect } from "vitest";
import {
  HITORI_PUZZLES,
  createHitori,
  hitoriViolations,
  inHitoriBounds,
  isHitoriSolved,
  toggleHitoriCell,
  type HitoriPos,
  type HitoriState,
} from "./hitori";

/** 좌표 목록의 칸을 black으로 칠한 상태를 만든다(나머지 white). */
function blacken(numbers: number[][], blacks: HitoriPos[]): HitoriState {
  let state = createHitori(numbers);
  for (const pos of blacks) {
    state = toggleHitoriCell(state, pos);
  }
  return state;
}

// HITORI_PUZZLES[0]의 알려진 정답(칠해야 하는 칸). 나머지는 white.
const PUZZLE0_SOLUTION: HitoriPos[] = [
  { row: 0, col: 2 },
  { row: 1, col: 0 },
  { row: 1, col: 4 },
  { row: 2, col: 2 },
  { row: 3, col: 0 },
  { row: 3, col: 4 },
  { row: 4, col: 2 },
];

describe("createHitori", () => {
  it("모든 칸을 white로 시작하고 숫자판을 보존한다", () => {
    const numbers = [
      [1, 2],
      [2, 1],
    ];
    const state = createHitori(numbers);
    expect(state.numbers).toEqual(numbers);
    expect(state.marks).toEqual([
      ["white", "white"],
      ["white", "white"],
    ]);
  });

  it("입력 숫자판을 깊은 복사해 원본과 분리한다(불변)", () => {
    const numbers = [
      [1, 2],
      [2, 1],
    ];
    const state = createHitori(numbers);
    numbers[0]![0] = 9;
    expect(state.numbers[0]![0]).toBe(1);
  });

  it("비정사각/너무 작음/음수·비정수/들쭉날쭉 입력을 거부한다(throw)", () => {
    // 비정사각(행 수 != 열 수)
    expect(() =>
      createHitori([
        [1, 2],
        [2, 1],
        [1, 2],
      ]),
    ).toThrow();
    // 너무 작음(1×1)
    expect(() => createHitori([[1]])).toThrow();
    // 들쭉날쭉(행 길이 불일치)
    expect(() =>
      createHitori([
        [1, 2, 3],
        [1, 2],
        [1, 2, 3],
      ]),
    ).toThrow();
    // 음수
    expect(() =>
      createHitori([
        [1, -2],
        [2, 1],
      ]),
    ).toThrow();
    // 0(양의 정수 아님)
    expect(() =>
      createHitori([
        [1, 0],
        [2, 1],
      ]),
    ).toThrow();
    // 비정수
    expect(() =>
      createHitori([
        [1, 1.5],
        [2, 1],
      ]),
    ).toThrow();
    // 빈 격자
    expect(() => createHitori([])).toThrow();
  });
});

describe("inHitoriBounds / toggleHitoriCell", () => {
  const base = createHitori([
    [1, 2],
    [2, 1],
  ]);

  it("경계 판정", () => {
    expect(inHitoriBounds(base, { row: 0, col: 0 })).toBe(true);
    expect(inHitoriBounds(base, { row: 1, col: 1 })).toBe(true);
    expect(inHitoriBounds(base, { row: -1, col: 0 })).toBe(false);
    expect(inHitoriBounds(base, { row: 0, col: 2 })).toBe(false);
    expect(inHitoriBounds(base, { row: 0.5, col: 0 })).toBe(false);
  });

  it("white↔black 토글, 왕복하면 원래대로", () => {
    const blackened = toggleHitoriCell(base, { row: 0, col: 0 });
    expect(blackened.marks[0]![0]).toBe("black");
    const restored = toggleHitoriCell(blackened, { row: 0, col: 0 });
    expect(restored.marks[0]![0]).toBe("white");
  });

  it("원본 상태를 변형하지 않는다(불변)", () => {
    toggleHitoriCell(base, { row: 0, col: 0 });
    expect(base.marks[0]![0]).toBe("white");
  });

  it("범위 밖 좌표를 거부한다(throw)", () => {
    expect(() => toggleHitoriCell(base, { row: 2, col: 0 })).toThrow();
    expect(() => toggleHitoriCell(base, { row: 0, col: -1 })).toThrow();
    expect(() => toggleHitoriCell(base, { row: 0.5, col: 0 })).toThrow();
  });
});

describe("hitoriViolations: 같은 행/열 white 중복", () => {
  it("같은 행에서 white로 남은 중복 숫자를 검출하고, 한쪽을 칠하면 해소된다", () => {
    const numbers = [
      [1, 1, 2],
      [2, 3, 1],
      [3, 2, 3],
    ];
    const all = createHitori(numbers);
    const dup = hitoriViolations(all).filter((v) => v.type === "duplicate");
    // 행0의 1,1 중복을 포함한다.
    expect(
      dup.some(
        (v) =>
          v.cells.some((c) => c.row === 0 && c.col === 0) &&
          v.cells.some((c) => c.row === 0 && c.col === 1),
      ),
    ).toBe(true);

    // (0,1)을 칠하면 그 행 중복은 사라진다.
    const fixed = toggleHitoriCell(all, { row: 0, col: 1 });
    const dupFixed = hitoriViolations(fixed).filter(
      (v) =>
        v.type === "duplicate" &&
        v.cells.some((c) => c.row === 0 && c.col === 0),
    );
    expect(dupFixed).toHaveLength(0);
  });

  it("같은 열에서 white로 남은 중복 숫자를 검출한다", () => {
    const numbers = [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
    ];
    const all = createHitori(numbers);
    const dup = hitoriViolations(all).filter((v) => v.type === "duplicate");
    // 열0의 (0,0),(1,0) 둘 다 1.
    expect(
      dup.some(
        (v) =>
          v.cells.some((c) => c.row === 0 && c.col === 0) &&
          v.cells.some((c) => c.row === 1 && c.col === 0),
      ),
    ).toBe(true);
  });

  it("칠한(black) 칸은 중복 판정에서 제외한다", () => {
    const numbers = [
      [1, 1, 2],
      [2, 3, 1],
      [3, 2, 3],
    ];
    // (0,1)을 칠하면 행0의 1 중복이 사라진다.
    const state = blacken(numbers, [{ row: 0, col: 1 }]);
    const dup = hitoriViolations(state).filter(
      (v) =>
        v.type === "duplicate" &&
        v.cells.some((c) => c.row === 0 && c.col === 1),
    );
    expect(dup).toHaveLength(0);
  });
});

describe("hitoriViolations: 인접한 black 쌍", () => {
  it("가로/세로로 인접한 black 쌍을 검출하고, 떼어놓으면 해소된다", () => {
    const numbers = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    // (0,0),(0,1) 인접 black.
    const horiz = blacken(numbers, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    const adjH = hitoriViolations(horiz).filter((v) => v.type === "adjacent");
    expect(adjH).toHaveLength(1);
    expect(adjH[0]!.cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    // 세로 인접.
    const vert = blacken(numbers, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
    const adjV = hitoriViolations(vert).filter((v) => v.type === "adjacent");
    expect(adjV).toHaveLength(1);
    expect(adjV[0]!.cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    // 대각선만 떨어진 black 쌍은 인접 위반이 아니다.
    const diag = blacken(numbers, [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(
      hitoriViolations(diag).filter((v) => v.type === "adjacent"),
    ).toHaveLength(0);
  });
});

describe("hitoriViolations: white 미연결", () => {
  it("칠한 칸이 white 영역을 둘로 가르면 disconnected 위반을 낸다", () => {
    const numbers = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    // 가운데 십자(상하좌우 가장자리 중앙)를 칠해 네 모서리를 고립시킨다.
    // (0,1),(1,0),(1,2),(2,1) → 인접하지 않은 black, 그러나 white 모서리들이 분리된다.
    const state = blacken(numbers, [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ]);
    // 인접 위반은 없어야 한다(검증: 분리 위반만 격리).
    expect(
      hitoriViolations(state).filter((v) => v.type === "adjacent"),
    ).toHaveLength(0);
    const disc = hitoriViolations(state).filter(
      (v) => v.type === "disconnected",
    );
    expect(disc).toHaveLength(1);
    // 좌상단 (0,0) 영역과 끊긴 나머지 모서리 white 칸들이 포함된다.
    const cells = disc[0]!.cells;
    expect(cells).toContainEqual({ row: 0, col: 2 });
    expect(cells).toContainEqual({ row: 2, col: 0 });
    expect(cells).toContainEqual({ row: 2, col: 2 });
    expect(cells).not.toContainEqual({ row: 0, col: 0 });
  });

  it("연결된 white 영역이면 disconnected 위반이 없다", () => {
    const numbers = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];
    // 모서리 하나만 칠해도 나머지 white는 여전히 연결.
    const state = blacken(numbers, [{ row: 0, col: 0 }]);
    expect(
      hitoriViolations(state).filter((v) => v.type === "disconnected"),
    ).toHaveLength(0);
  });
});

describe("isHitoriSolved ≡ 위반 없음", () => {
  it("위반이 비면 solved=true, 하나라도 있으면 false(동치)", () => {
    const numbers = HITORI_PUZZLES[0]!;
    const solved = blacken(numbers, PUZZLE0_SOLUTION);
    expect(hitoriViolations(solved)).toEqual([]);
    expect(isHitoriSolved(solved)).toBe(true);

    const all = createHitori(numbers);
    expect(hitoriViolations(all).length).toBeGreaterThan(0);
    expect(isHitoriSolved(all)).toBe(false);
  });
});

describe("HITORI_PUZZLES (알려진 풀이가 있는 작은 퍼즐)", () => {
  it("5×5 퍼즐을 1개 이상 제공하고 양의 정수만 담는다", () => {
    expect(HITORI_PUZZLES.length).toBeGreaterThanOrEqual(1);
    for (const puzzle of HITORI_PUZZLES) {
      expect(puzzle.length).toBe(5);
      for (const row of puzzle) {
        expect(row.length).toBe(5);
        for (const v of row) {
          expect(Number.isInteger(v) && v > 0).toBe(true);
        }
      }
      expect(() => createHitori(puzzle)).not.toThrow();
    }
  });

  it("정답 칠로 클리어(true), 한 칸 오답이면 미클리어(false)", () => {
    const numbers = HITORI_PUZZLES[0]!;
    const solved = blacken(numbers, PUZZLE0_SOLUTION);
    expect(isHitoriSolved(solved)).toBe(true);

    // 정답에서 한 칸을 더 칠하면(과잉) 인접 또는 분리 위반이 생겨 미클리어.
    const overBlack = toggleHitoriCell(solved, { row: 0, col: 0 });
    expect(isHitoriSolved(overBlack)).toBe(false);

    // 정답에서 한 칸을 덜 칠하면(white 복원) 중복이 되살아나 미클리어.
    const underBlack = toggleHitoriCell(solved, { row: 0, col: 2 });
    expect(isHitoriSolved(underBlack)).toBe(false);
  });

  it("정답 상태에서 각 위반 종류가 모두 0이다", () => {
    const solved = blacken(HITORI_PUZZLES[0]!, PUZZLE0_SOLUTION);
    const v = hitoriViolations(solved);
    expect(v.filter((x) => x.type === "duplicate")).toHaveLength(0);
    expect(v.filter((x) => x.type === "adjacent")).toHaveLength(0);
    expect(v.filter((x) => x.type === "disconnected")).toHaveLength(0);
  });
});
