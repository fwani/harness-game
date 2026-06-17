import { describe, it, expect } from "vitest";
import { chooseCpuCheckersMove } from "./checkersCpuView";
import {
  createCheckersBoard,
  legalCheckersMoves,
  type CheckersBoard,
} from "../../domain/checkers";
import { legalDestinations } from "./checkersView";
import type { RandomSource } from "../../application/dealCards";

// 결정적 검증용 스텁: 미리 정한 인덱스를 순서대로 돌려준다.
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

function emptyBoard(): CheckersBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

describe("chooseCpuCheckersMove", () => {
  it("(a) 합법 수가 있으면 합법 좌표를 반환한다(application 위임)", () => {
    const board = createCheckersBoard();
    const move = chooseCpuCheckersMove(board, "light", new StubRandom([0]));
    expect(move).not.toBeNull();
    expect(legalCheckersMoves(board, "light")).toContainEqual(move);
  });

  it("(b) 둘 곳이 없으면 null(스테일메이트/전멸)", () => {
    const board = emptyBoard(); // light 기물 없음 → 합법 수 없음
    const move = chooseCpuCheckersMove(board, "light", new StubRandom([0]));
    expect(move).toBeNull();
  });

  it("(c) 연속 점프 중(continuingFrom)에는 그 기물의 수만 후보로 둔다(같은 기물 제한)", () => {
    const board = emptyBoard();
    // light man (3,2)가 dark (4,3)을 뛰어넘어 (5,4)로 점프. 다른 light man (3,6)도 점프 가능.
    board[3]![2] = { color: "light", king: false };
    board[4]![3] = { color: "dark", king: false };
    board[3]![6] = { color: "light", king: false };
    board[4]![5] = { color: "dark", king: false };
    const from = { row: 3, col: 2 };
    const move = chooseCpuCheckersMove(board, "light", new StubRandom([0]), from);
    expect(move).not.toBeNull();
    // 반드시 잠긴 기물(3,2)에서 시작하는 수여야 한다.
    expect(move!.from).toEqual(from);
    expect(legalDestinations(board, from, "light")).toContainEqual(move);
  });

  it("(d) 연속 점프 대상 기물이 더 점프할 수 없으면 null", () => {
    const board = emptyBoard();
    board[3]![2] = { color: "light", king: false }; // 점프 상대 없음
    const move = chooseCpuCheckersMove(board, "light", new StubRandom([0]), {
      row: 3,
      col: 2,
    });
    expect(move).toBeNull();
  });
});
