import { describe, it, expect } from "vitest";
import { chooseCpuConnectFourColumn } from "./connectFourCpuView";
import {
  createConnectFourBoard,
  dropDisc,
  findConnectFourWinner,
  legalColumns,
  type Board,
  type Cell,
  type Player,
} from "../../domain/connectFour";
import type { RandomSource } from "../../application/dealCards";

// 결정적 검증용 스텁: 미리 정한 인덱스를 순서대로 돌려주고 호출 횟수를 기록한다.
class StubRandom implements RandomSource {
  calls = 0;
  constructor(private readonly indices: number[]) {}
  nextInt(maxExclusive: number): number {
    const idx = this.indices[this.calls] ?? 0;
    this.calls += 1;
    if (idx >= maxExclusive) {
      throw new Error(`stub index ${idx} out of range for ${maxExclusive}`);
    }
    return idx;
  }
}

/** col 열을 player로 가득 채운다(중력 낙하로 6개). */
function fillColumn(board: Board, col: number, player: Player): Board {
  let next = board;
  for (let i = 0; i < 6; i += 1) {
    next = dropDisc(next, col, player)!;
  }
  return next;
}

describe("chooseCpuConnectFourColumn", () => {
  it("(a) 둘 곳이 있으면 합법 열을 반환한다", () => {
    const board = createConnectFourBoard();
    const rng = new StubRandom([0]);
    const col = chooseCpuConnectFourColumn(board, rng);
    expect(col).not.toBeNull();
    expect(legalColumns(board)).toContain(col);
  });

  it("(b) rng 인덱스로 합법 열을 결정적으로 선택한다", () => {
    const board = createConnectFourBoard();
    const legal = legalColumns(board); // [0..6]
    for (let i = 0; i < legal.length; i += 1) {
      const col = chooseCpuConnectFourColumn(board, new StubRandom([i]));
      expect(col).toBe(legal[i]);
    }
  });

  it("(c) 보드가 가득 차 둘 곳이 없으면 null(rng 미사용)", () => {
    // 승자 없이 가득 찬 보드를 직접 구성한다("벽돌" 색칠: 세로 최대 3연속, 가로/대각은
    // 매 칸 교차 → 어느 방향도 4목이 생기지 않는다). 중력(dropDisc)과 무관한 읽기 전용 입력.
    const board: Board = Array.from({ length: 6 }, (_unusedRow, row) =>
      Array.from(
        { length: 7 },
        (_unusedCol, col) => (((col % 2) ^ (row >= 3 ? 1 : 0)) === 0 ? 1 : 2) as Cell,
      ),
    );
    expect(findConnectFourWinner(board)).toBeNull();
    expect(legalColumns(board)).toEqual([]);
    const rng = new StubRandom([0]);
    expect(chooseCpuConnectFourColumn(board, rng)).toBeNull();
    expect(rng.calls).toBe(0);
  });

  it("(d) 이미 승자가 있으면 둘 곳이 남아도 null을 반환한다(rng 미사용)", () => {
    // 0열을 player 1로 가득 채우면 세로 4목 승자가 생긴다(다른 열은 비어 있음).
    const board = fillColumn(createConnectFourBoard(), 0, 1);
    const rng = new StubRandom([0]);
    expect(chooseCpuConnectFourColumn(board, rng)).toBeNull();
    expect(rng.calls).toBe(0);
  });

  it("(e) 입력 board를 변형하지 않는다", () => {
    const board = createConnectFourBoard();
    const snapshot = JSON.stringify(board);
    chooseCpuConnectFourColumn(board, new StubRandom([3]));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
