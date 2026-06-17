import { describe, expect, it } from "vitest";
import { play2048, spawnTile, startGame } from "./play2048";
import {
  applyMove,
  canMove,
  createBoard,
  type Board,
} from "../domain/game2048";
import type { RandomSource } from "./dealCards";

/** 미리 정한 값 목록을 순서대로 반환하는 스크립트 rng(결정적 검증용). */
class ScriptedRandom implements RandomSource {
  private i = 0;
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    if (this.i >= this.values.length) {
      throw new Error("ScriptedRandom exhausted");
    }
    return this.values[this.i++]!;
  }
}

/** 항상 같은 인덱스를 반환하는 스텁. */
class ConstantRandom implements RandomSource {
  constructor(private readonly value: number) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return this.value;
  }
}

/** 보드의 0이 아닌 타일 개수. */
function tileCount(board: Board): number {
  return board.reduce(
    (sum, row) => sum + row.filter((t) => t !== 0).length,
    0,
  );
}

/** 보드 전체 값 합. */
function tileSum(board: Board): number {
  return board.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
}

describe("spawnTile", () => {
  it("빈 보드의 빈 칸에만 새 타일을 놓는다", () => {
    // 위치 인덱스 0 → (0,0), 값 추첨 9 → 2
    const rng = new ScriptedRandom([0, 9]);
    const board = spawnTile(createBoard(), rng);
    expect(board[0]![0]).toBe(2);
    expect(tileCount(board)).toBe(1);
  });

  it("값 추첨이 임계 미만이면 4를 놓는다(10% 분기)", () => {
    // 위치 0, 값 추첨 0(<1) → 4
    const rng = new ScriptedRandom([0, 0]);
    const board = spawnTile(createBoard(), rng);
    expect(board[0]![0]).toBe(4);
  });

  it("값 추첨이 임계 이상이면 2를 놓는다(90% 분기 경계)", () => {
    // 위치 0, 값 추첨 1(>=1) → 2
    const rng = new ScriptedRandom([0, 1]);
    const board = spawnTile(createBoard(), rng);
    expect(board[0]![0]).toBe(2);
  });

  it("이미 찬 칸을 건너뛰고 빈 칸 좌표만 후보로 삼는다", () => {
    // (0,0),(0,1) 채워둠 → 빈 칸 14개. 위치 인덱스 0 → (0,2)
    const board: Board = [
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const rng = new ScriptedRandom([0, 9]);
    const next = spawnTile(board, rng);
    expect(next[0]![2]).toBe(2);
    expect(tileCount(next)).toBe(3);
  });

  it("빈 칸이 없으면 스폰하지 않고 사본을 반환한다", () => {
    const full: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    // rng를 호출하면 exhausted로 throw → 호출하지 않음을 보장
    const rng = new ScriptedRandom([]);
    const next = spawnTile(full, rng);
    expect(next).toEqual(full);
    expect(next).not.toBe(full); // 사본
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board = createBoard();
    const snapshot = board.map((row) => [...row]);
    spawnTile(board, new ScriptedRandom([5, 9]));
    expect(board).toEqual(snapshot);
  });

  it("rng가 빈 칸 범위를 벗어난 인덱스를 주면 throw", () => {
    // 빈 칸 16개인데 인덱스 16 반환 → 범위 밖
    expect(() => spawnTile(createBoard(), new ConstantRandom(16))).toThrow();
  });

  it("결정적이다: 같은 rng 스크립트면 같은 결과", () => {
    const a = spawnTile(createBoard(), new ScriptedRandom([7, 9]));
    const b = spawnTile(createBoard(), new ScriptedRandom([7, 9]));
    expect(a).toEqual(b);
  });
});

describe("startGame", () => {
  it("정확히 2개의 타일을 스폰한다", () => {
    const rng = new ScriptedRandom([0, 9, 1, 9]);
    const board = startGame(rng);
    expect(tileCount(board)).toBe(2);
  });

  it("두 타일이 서로 다른 빈 칸에 놓인다", () => {
    // 첫 스폰: 빈칸16 중 0 → (0,0)=2. 둘째 스폰: 빈칸15 중 0 → (0,1)=2
    const rng = new ScriptedRandom([0, 9, 0, 9]);
    const board = startGame(rng);
    expect(board[0]![0]).toBe(2);
    expect(board[0]![1]).toBe(2);
    expect(tileCount(board)).toBe(2);
  });

  it("결정적이다", () => {
    const a = startGame(new ScriptedRandom([3, 0, 5, 9]));
    const b = startGame(new ScriptedRandom([3, 0, 5, 9]));
    expect(a).toEqual(b);
  });
});

describe("play2048", () => {
  it("이동이 변화를 만들면 새 타일 1개를 스폰한다", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const before = tileCount(board); // 2
    // left 이동 → [4,0,0,0]. 그 후 빈칸 중 위치 0, 값 2 스폰
    const result = play2048(board, "left", new ScriptedRandom([0, 9]));
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(4);
    expect(tileCount(result.board)).toBe(before); // 병합으로 2→1, 스폰으로 +1
    expect(result.board[0]![0]).toBe(4);
  });

  it("이동이 변화를 만들지 못하면 스폰하지 않는다", () => {
    const board: Board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    // 이미 좌측 정렬 + 인접 병합 불가 → left 이동 변화 없음
    const result = play2048(board, "left", new ScriptedRandom([]));
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toEqual(board);
  });

  it("won: 결과 보드가 목표 타일에 도달하면 true", () => {
    const board: Board = [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    // left → 2048 병합 후 스폰
    const result = play2048(board, "left", new ScriptedRandom([0, 9]));
    expect(result.won).toBe(true);
  });

  it("target 인자로 목표 타일을 조정할 수 있다", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = play2048(board, "left", new ScriptedRandom([0, 9]), 4);
    expect(result.won).toBe(true);
  });

  it("over: 이동 후 빈 칸도 병합 가능도 없으면 true", () => {
    // 거의 체커보드(병합 불가)이고 맨 아래 행에 인접 4,4가 있어 left로만 변화가 생긴다.
    const board: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4],
    ];
    // left: 아래 행 [4,2,4,4] → 4+4 병합 → [4,2,8,0]. 다른 행은 인접 동일값 없어 그대로.
    // 유일한 빈 칸 (3,3)이 생기고, 거기에 값 2를 스폰하면 어떤 병합도 불가 → over.
    const moved = applyMove(board, "left");
    expect(moved.moved).toBe(true);
    const empties = moved.board.flatMap((row, r) =>
      row.flatMap((t, c) => (t === 0 ? [{ r, c }] : [])),
    );
    expect(empties).toEqual([{ r: 3, c: 3 }]);
    // 빈 칸 1개 중 위치 0, 값 추첨 9(>=1) → 2 스폰
    const result = play2048(board, "left", new ScriptedRandom([0, 9]));
    expect(result.board[3]![3]).toBe(2);
    expect(canMove(result.board)).toBe(false);
    expect(result.over).toBe(true);
  });

  it("over: 이동 후에도 빈 칸이 남으면 false", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = play2048(board, "left", new ScriptedRandom([0, 9]));
    expect(result.over).toBe(false);
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const snapshot = board.map((row) => [...row]);
    play2048(board, "left", new ScriptedRandom([0, 9]));
    expect(board).toEqual(snapshot);
  });

  it("결정적이다: 같은 입력·rng면 같은 결과", () => {
    const board: Board = [
      [2, 0, 2, 0],
      [0, 4, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const a = play2048(board, "left", new ScriptedRandom([2, 9]));
    const b = play2048(board, "left", new ScriptedRandom([2, 9]));
    expect(a).toEqual(b);
  });

  it("스폰으로 타일 합이 정확히 새 타일 값만큼 증가한다", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const sumBefore = tileSum(board); // 4
    const result = play2048(board, "left", new ScriptedRandom([0, 9])); // 값 2 스폰
    // left 병합으로 합은 보존(2+2 → 4), 스폰으로 +2
    expect(tileSum(result.board)).toBe(sumBefore + 2);
  });
});
