import { describe, expect, it } from "vitest";

import {
  applyFloodMove,
  createFloodIt,
  currentRegion,
  isFloodItSolved,
  isLegalFloodMove,
  legalFloodMoves,
  topLeftColor,
  type Color,
  type FloodItState,
} from "./floodIt";

// 영역 좌표를 "row,col" 문자열 집합으로(순서 무관 비교용).
function regionSet(state: FloodItState): Set<string> {
  return new Set(currentRegion(state).map((p) => `${p.row},${p.col}`));
}

describe("createFloodIt", () => {
  it("정사각·범위 내 격자로 상태를 만든다", () => {
    const state = createFloodIt(
      [
        [0, 1],
        [2, 0],
      ],
      3,
    );
    expect(state.size).toBe(2);
    expect(state.colorCount).toBe(3);
    expect(state.board).toEqual([
      [0, 1],
      [2, 0],
    ]);
  });

  it("입력 board를 깊은 복사해 외부 변형과 격리한다", () => {
    const board: Color[][] = [
      [0, 1],
      [1, 0],
    ];
    const state = createFloodIt(board, 2);
    board[0]![0] = 1; // 외부에서 원본 변형
    expect(state.board[0]![0]).toBe(0); // 상태는 영향 없음
  });

  it("colorCount가 1 미만/비정수면 throw", () => {
    expect(() => createFloodIt([[0]], 0)).toThrow();
    expect(() => createFloodIt([[0]], 1.5)).toThrow();
  });

  it("정사각이 아니면 throw", () => {
    expect(() =>
      createFloodIt(
        [
          [0, 1],
          [0],
        ],
        2,
      ),
    ).toThrow();
  });

  it("빈 보드면 throw", () => {
    expect(() => createFloodIt([], 2)).toThrow();
  });

  it("색이 0..colorCount-1 범위 밖이면 throw", () => {
    expect(() => createFloodIt([[2]], 2)).toThrow();
    expect(() => createFloodIt([[-1]], 2)).toThrow();
    expect(() => createFloodIt([[0.5]], 2)).toThrow();
  });
});

describe("currentRegion", () => {
  it("좌상단과 4방 연결된 동일 색 영역만 포함한다(대각선 제외)", () => {
    // (0,0)=0, (0,1)=0 연결. 아래 행은 모두 1이라 좌상단 영역은 위 두 칸뿐.
    const state = createFloodIt(
      [
        [0, 0],
        [1, 1],
      ],
      2,
    );
    expect(regionSet(state)).toEqual(new Set(["0,0", "0,1"]));
  });

  it("대각선으로만 닿은 같은 색은 영역에서 제외한다", () => {
    // (0,0)=0, (1,1)=0은 대각선만 닿음 → 분리. 좌상단 영역은 (0,0)뿐.
    const state = createFloodIt(
      [
        [0, 1],
        [1, 0],
      ],
      2,
    );
    expect(regionSet(state)).toEqual(new Set(["0,0"]));
  });

  it("끊긴 같은 색은 영역에 포함하지 않는다", () => {
    // 좌상단 0 영역은 (0,0)뿐. (0,2)·(2,*)의 0은 1 벽으로 분리.
    const state = createFloodIt(
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      2,
    );
    expect(regionSet(state)).toEqual(new Set(["0,0"]));
  });

  it("단색 보드면 전체가 영역", () => {
    const state = createFloodIt(
      [
        [1, 1],
        [1, 1],
      ],
      2,
    );
    expect(currentRegion(state)).toHaveLength(4);
  });

  it("상태를 변형하지 않는다", () => {
    const state = createFloodIt(
      [
        [0, 0],
        [0, 1],
      ],
      2,
    );
    const before = JSON.stringify(state.board);
    currentRegion(state);
    expect(JSON.stringify(state.board)).toBe(before);
  });
});

describe("isLegalFloodMove / legalFloodMoves", () => {
  it("좌상단 색과 다른 범위 내 색만 합법", () => {
    const state = createFloodIt([[0]], 3);
    expect(topLeftColor(state)).toBe(0);
    expect(isLegalFloodMove(state, 0)).toBe(false); // 같은 색
    expect(isLegalFloodMove(state, 1)).toBe(true);
    expect(isLegalFloodMove(state, 2)).toBe(true);
  });

  it("범위 밖/비정수 색은 불법", () => {
    const state = createFloodIt([[0]], 3);
    expect(isLegalFloodMove(state, 3)).toBe(false);
    expect(isLegalFloodMove(state, -1)).toBe(false);
    expect(isLegalFloodMove(state, 1.5)).toBe(false);
  });

  it("legalFloodMoves는 좌상단 색을 제외한 색을 오름차순으로 반환", () => {
    const state = createFloodIt([[1]], 4);
    expect(legalFloodMoves(state)).toEqual([0, 2, 3]);
  });
});

describe("applyFloodMove", () => {
  it("flood region을 새 색으로 칠하고 영역이 확장된다", () => {
    // 좌상단 0 영역=(0,0),(0,1),(1,0). 1로 칠하면 (1,1)의 1과 연결되어 다음 영역이 전체로 확장.
    const state = createFloodIt(
      [
        [0, 0],
        [0, 1],
      ],
      2,
    );
    const next = applyFloodMove(state, 1);
    expect(next.board).toEqual([
      [1, 1],
      [1, 1],
    ]);
    // 새 좌상단 영역은 전체 4칸으로 확장됨.
    expect(currentRegion(next)).toHaveLength(4);
  });

  it("연결되지 않은 같은 색은 한 수로 칠해지지 않는다", () => {
    const state = createFloodIt(
      [
        [0, 1],
        [1, 0],
      ],
      2,
    );
    const next = applyFloodMove(state, 1);
    // (0,0)만 1로. 대각선 (1,1)의 0은 그대로.
    expect(next.board).toEqual([
      [1, 1],
      [1, 0],
    ]);
  });

  it("입력 상태/board를 변형하지 않는다(불변)", () => {
    const state = createFloodIt(
      [
        [0, 0],
        [1, 1],
      ],
      2,
    );
    const snapshot = JSON.stringify(state.board);
    applyFloodMove(state, 1);
    expect(JSON.stringify(state.board)).toBe(snapshot);
  });

  it("같은 색(무의미한 수)은 throw", () => {
    const state = createFloodIt([[0]], 2);
    expect(() => applyFloodMove(state, 0)).toThrow();
  });

  it("범위 밖 색은 throw", () => {
    const state = createFloodIt([[0]], 2);
    expect(() => applyFloodMove(state, 2)).toThrow();
    expect(() => applyFloodMove(state, -1)).toThrow();
  });
});

describe("isFloodItSolved", () => {
  it("단색 보드면 true", () => {
    const state = createFloodIt(
      [
        [2, 2],
        [2, 2],
      ],
      3,
    );
    expect(isFloodItSolved(state)).toBe(true);
  });

  it("색이 섞여 있으면 false", () => {
    const state = createFloodIt(
      [
        [0, 1],
        [1, 1],
      ],
      2,
    );
    expect(isFloodItSolved(state)).toBe(false);
  });

  it("1×1 보드는 즉시 클리어", () => {
    expect(isFloodItSolved(createFloodIt([[0]], 1))).toBe(true);
  });

  it("연속 수로 전체를 한 색으로 만들면 클리어", () => {
    let state = createFloodIt(
      [
        [0, 1],
        [2, 1],
      ],
      3,
    );
    expect(isFloodItSolved(state)).toBe(false);
    state = applyFloodMove(state, 1); // (0,0)→1, (0,1) 연결 → [[1,1],[2,1]]
    state = applyFloodMove(state, 2); // 위쪽 1영역→2 ... 점진적으로 단색화
    // 마지막으로 남은 색으로 한 번 더 칠해 단색을 보장
    if (!isFloodItSolved(state)) {
      state = applyFloodMove(state, legalFloodMoves(state)[0]!);
    }
    expect(isFloodItSolved(state)).toBe(true);
  });
});
