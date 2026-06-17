import { describe, it, expect } from "vitest";
import { chooseCpuReversiMove } from "./reversiCpuView";
import { createReversiBoard, type Board, type Stone } from "../../domain/reversi";
import { legalReversiMoves } from "../../domain/reversiMoves";
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

/** 모든 칸을 stone으로 채운 보드(빈 칸 없음 → 어떤 색도 둘 곳 없음). */
function fullBoard(stone: Stone): Board {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => stone as Stone | null),
  );
}

describe("chooseCpuReversiMove", () => {
  it("(a) 합법 수가 있으면 합법 좌표를 반환한다", () => {
    const board = createReversiBoard();
    const rng = new StubRandom([0]);
    const move = chooseCpuReversiMove(board, "black", rng);
    expect(move).not.toBeNull();
    const legal = legalReversiMoves(board, "black");
    expect(legal).toContainEqual(move);
  });

  it("(b) 둘 곳이 없으면 null을 반환한다(자동 패스 케이스, rng 미사용)", () => {
    const board = fullBoard("white");
    const rng = new StubRandom([0]);
    const move = chooseCpuReversiMove(board, "black", rng);
    expect(move).toBeNull();
    // 합법 수가 없으면 throw 없이 곧장 null을 반환하므로 난수를 뽑지 않는다.
    expect(rng.calls).toBe(0);
  });

  it("(c) 입력 board를 변형하지 않는다", () => {
    const board = createReversiBoard();
    const snapshot = JSON.stringify(board);
    chooseCpuReversiMove(board, "white", new StubRandom([0]));
    expect(JSON.stringify(board)).toBe(snapshot);
  });

  it("(d) 반환 좌표는 항상 합법 수(난수 인덱스가 달라도)다", () => {
    const board = createReversiBoard();
    const legal = legalReversiMoves(board, "white");
    for (let i = 0; i < legal.length; i += 1) {
      const move = chooseCpuReversiMove(board, "white", new StubRandom([i]));
      expect(move).toEqual(legal[i]);
    }
  });
});
