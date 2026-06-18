import { describe, expect, it } from "vitest";

import {
  applyPegMove,
  createPegSolitaire,
  isLegalPegMove,
  isPegSolitaireFinished,
  isPegSolitaireSolved,
  legalPegMoves,
  pegCount,
  type PegMove,
  type PegSolitaireState,
} from "./pegSolitaire";

// 상태 스냅샷(불변성 검증용): 동적 집합을 정렬된 배열로 직렬화.
function snapshot(state: PegSolitaireState) {
  return {
    size: state.size,
    valid: [...state.valid].sort(),
    pegs: [...state.pegs].sort(),
  };
}

describe("createPegSolitaire", () => {
  it("표준 33칸 십자 보드를 만든다(코너 2×2는 보드 밖)", () => {
    const state = createPegSolitaire();
    expect(state.size).toBe(7);
    expect(state.valid.size).toBe(33);
    // 네 모서리 2×2 코너는 보드 밖.
    for (const [row, col] of [
      [0, 0],
      [1, 1],
      [0, 6],
      [1, 5],
      [6, 0],
      [5, 1],
      [6, 6],
      [5, 5],
    ]) {
      expect(state.valid.has(`${row},${col}`)).toBe(false);
    }
    // 가운데 세로 띠/가로 띠는 보드 안.
    expect(state.valid.has("0,3")).toBe(true);
    expect(state.valid.has("3,0")).toBe(true);
    expect(state.valid.has("3,6")).toBe(true);
  });

  it("중앙(3,3)만 빈 채 나머지 32칸에 못이 있다", () => {
    const state = createPegSolitaire();
    expect(pegCount(state)).toBe(32);
    expect(state.pegs.has("3,3")).toBe(false);
    expect(state.valid.has("3,3")).toBe(true);
    // 못 집합은 valid의 부분집합.
    for (const k of state.pegs) {
      expect(state.valid.has(k)).toBe(true);
    }
  });
});

describe("isLegalPegMove / applyPegMove", () => {
  it("합법 점프를 적용하면 가운데 못이 제거되고 못 수가 1 줄어든다", () => {
    const state = createPegSolitaire();
    // (1,3)의 못이 (2,3)을 넘어 빈 중앙 (3,3)으로 점프(세로).
    const move: PegMove = {
      from: { row: 1, col: 3 },
      over: { row: 2, col: 3 },
      to: { row: 3, col: 3 },
    };
    expect(isLegalPegMove(state, move)).toBe(true);
    const next = applyPegMove(state, move);
    expect(pegCount(next)).toBe(31);
    expect(next.pegs.has("1,3")).toBe(false); // from 비워짐
    expect(next.pegs.has("2,3")).toBe(false); // over 제거됨
    expect(next.pegs.has("3,3")).toBe(true); // to 채워짐
  });

  it("적용은 입력 상태를 변형하지 않는다(불변)", () => {
    const state = createPegSolitaire();
    const before = snapshot(state);
    applyPegMove(state, {
      from: { row: 1, col: 3 },
      over: { row: 2, col: 3 },
      to: { row: 3, col: 3 },
    });
    expect(snapshot(state)).toEqual(before);
  });

  it("불법 수를 거부한다: 대각선·가운데 못 없음·도착칸 채워짐·2칸 아님·보드 밖", () => {
    const state = createPegSolitaire();

    // 대각선 점프(직선 아님).
    expect(
      isLegalPegMove(state, {
        from: { row: 1, col: 2 },
        over: { row: 2, col: 3 },
        to: { row: 3, col: 4 },
      }),
    ).toBe(false);

    // 가운데(over)에 못이 없음: 중앙이 빈 시작에서 (3,1)→(3,3)은 over=(3,2) 못 있으나 to가 빈 칸.
    // over에 못이 없는 경우를 만들려면 먼저 한 수 둬서 빈 칸을 만든다.
    const afterFirst = applyPegMove(state, {
      from: { row: 3, col: 1 },
      over: { row: 3, col: 2 },
      to: { row: 3, col: 3 },
    });
    // 이제 (3,1),(3,2)가 비었다. (3,0)→(3,2)는 over=(3,1)에 못이 없어 불법.
    expect(
      isLegalPegMove(afterFirst, {
        from: { row: 3, col: 0 },
        over: { row: 3, col: 1 },
        to: { row: 3, col: 2 },
      }),
    ).toBe(false);

    // 도착칸이 비어있지 않음: (0,3)→(2,3) to=(2,3)에 못 있음(시작 상태).
    expect(
      isLegalPegMove(state, {
        from: { row: 0, col: 3 },
        over: { row: 1, col: 3 },
        to: { row: 2, col: 3 },
      }),
    ).toBe(false);

    // 2칸이 아님(1칸 이동).
    expect(
      isLegalPegMove(state, {
        from: { row: 2, col: 3 },
        over: { row: 2, col: 3 },
        to: { row: 3, col: 3 },
      }),
    ).toBe(false);

    // 보드 밖(코너)으로의 점프.
    expect(
      isLegalPegMove(state, {
        from: { row: 0, col: 2 },
        over: { row: 0, col: 1 },
        to: { row: 0, col: 0 },
      }),
    ).toBe(false);
  });

  it("불법 수에 applyPegMove는 throw 한다", () => {
    const state = createPegSolitaire();
    expect(() =>
      applyPegMove(state, {
        from: { row: 0, col: 0 },
        over: { row: 0, col: 1 },
        to: { row: 0, col: 2 },
      }),
    ).toThrow(/불법 수/);
  });
});

describe("legalPegMoves", () => {
  it("표준 시작에서는 정확히 4개의 합법 점프(중앙 빈 칸 사방)가 있다", () => {
    const state = createPegSolitaire();
    const moves = legalPegMoves(state);
    expect(moves).toHaveLength(4);
    // 모두 (3,3)으로 도착한다.
    for (const m of moves) {
      expect(m.to).toEqual({ row: 3, col: 3 });
      expect(isLegalPegMove(state, m)).toBe(true);
    }
  });

  it("결정적 순서(행→열, 위→아래→왼쪽→오른쪽)로 열거한다", () => {
    const state = createPegSolitaire();
    const froms = legalPegMoves(state).map((m) => `${m.from.row},${m.from.col}`);
    // from 후보: (1,3) 위, (5,3) 아래, (3,1) 왼쪽, (3,5) 오른쪽.
    expect(froms).toEqual(["1,3", "3,1", "3,5", "5,3"]);
  });
});

describe("isPegSolitaireFinished / isPegSolitaireSolved", () => {
  it("시작 상태는 종국이 아니고 클리어도 아니다", () => {
    const state = createPegSolitaire();
    expect(isPegSolitaireFinished(state)).toBe(false);
    expect(isPegSolitaireSolved(state)).toBe(false);
  });

  it("못이 1개면 클리어, 그 1개가 중앙이면 완벽 클리어", () => {
    const center = buildSinglePegState({ row: 3, col: 3 });
    expect(pegCount(center)).toBe(1);
    expect(isPegSolitaireSolved(center)).toBe(true);
    expect(isPegSolitaireSolved(center, true)).toBe(true);
    expect(isPegSolitaireFinished(center)).toBe(true); // 합법 수 없음

    const offCenter = buildSinglePegState({ row: 0, col: 2 });
    expect(isPegSolitaireSolved(offCenter)).toBe(true);
    expect(isPegSolitaireSolved(offCenter, true)).toBe(false); // 중앙 아님
  });

  it("못이 2개 이상이지만 합법 수가 없으면 종국이되 클리어는 아니다", () => {
    // 멀리 떨어진 두 못만 남겨 점프 불가.
    const base = createPegSolitaire();
    const pegs = new Set<string>(["0,2", "6,4"]);
    const stuck: PegSolitaireState = { size: base.size, valid: base.valid, pegs };
    expect(pegCount(stuck)).toBe(2);
    expect(isPegSolitaireFinished(stuck)).toBe(true);
    expect(isPegSolitaireSolved(stuck)).toBe(false);
  });
});

// 단일 못만 남은 상태를 구성하는 헬퍼(클리어 판정 검증용).
function buildSinglePegState(only: { row: number; col: number }): PegSolitaireState {
  const base = createPegSolitaire();
  const pegs = new Set<string>([`${only.row},${only.col}`]);
  return { size: base.size, valid: base.valid, pegs };
}
