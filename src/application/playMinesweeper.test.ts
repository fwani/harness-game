import { describe, expect, it } from "vitest";
import {
  generateMineCoordinates,
  startMinesweeperGame,
  playMinesweeperTurn,
} from "./playMinesweeper";
import { createMinefield, type Board } from "../domain/minesweeper";
import type { RandomSource } from "./dealCards";

/** 미리 정한 nextInt 시퀀스를 순서대로 돌려주는 결정적 스텁. 시퀀스를 다 쓰면 throw. */
class SequenceRandom implements RandomSource {
  private i = 0;
  constructor(private readonly seq: readonly number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    if (this.i >= this.seq.length) {
      throw new Error("SequenceRandom: sequence exhausted");
    }
    return this.seq[this.i++]!;
  }
}

/** board에서 공개된 좌표 목록(row-major). */
function revealedCoords(board: Board): [number, number][] {
  const out: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.revealed) {
        out.push([r, c]);
      }
    }),
  );
  return out;
}

describe("generateMineCoordinates", () => {
  it("입력 검증: rows/cols가 비정수 또는 < 1 이면 throw", () => {
    const rng = new SequenceRandom([]);
    expect(() => generateMineCoordinates(0, 3, 0, rng)).toThrow();
    expect(() => generateMineCoordinates(3, 0, 0, rng)).toThrow();
    expect(() => generateMineCoordinates(2.5, 3, 0, rng)).toThrow();
    expect(() => generateMineCoordinates(3, 2.5, 0, rng)).toThrow();
  });

  it("입력 검증: mineCount가 비정수 또는 음수면 throw", () => {
    const rng = new SequenceRandom([]);
    expect(() => generateMineCoordinates(3, 3, -1, rng)).toThrow();
    expect(() => generateMineCoordinates(3, 3, 1.5, rng)).toThrow();
  });

  it("입력 검증: mineCount가 칸 수를 초과하면 throw", () => {
    const rng = new SequenceRandom([]);
    expect(() => generateMineCoordinates(2, 2, 5, rng)).toThrow();
    // exclude가 있으면 가용 칸은 rows*cols - 1
    expect(() => generateMineCoordinates(2, 2, 4, rng, [0, 0])).toThrow();
    // exclude 없이 칸 수와 동일하면 OK
    expect(() => generateMineCoordinates(2, 2, 4, new SequenceRandom([0, 0, 0, 0]))).not.toThrow();
  });

  it("고정 시드로 결정적이며 좌표 중복이 없고 개수가 일치한다", () => {
    // 3x3 풀(row-major): 매번 풀 0번을 뽑는다 → (0,0),(0,1),(0,2)
    const a = generateMineCoordinates(3, 3, 3, new SequenceRandom([0, 0, 0]));
    const b = generateMineCoordinates(3, 3, 3, new SequenceRandom([0, 0, 0]));
    expect(a).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
    expect(a).toEqual(b); // 같은 시드 → 같은 결과
    expect(a.length).toBe(3);
    const keys = new Set(a.map(([r, c]) => `${r},${c}`));
    expect(keys.size).toBe(3); // 중복 없음
  });

  it("exclude 칸은 지뢰에서 제외된다(첫 클릭 안전지대)", () => {
    // 2x2, exclude (0,0): 풀 = [(0,1),(1,0),(1,1)]. 모두 뽑으면 exclude만 빠진다.
    const mines = generateMineCoordinates(2, 2, 3, new SequenceRandom([0, 0, 0]), [0, 0]);
    expect(mines).toEqual([
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(mines).not.toContainEqual([0, 0]);
  });

  it("mineCount가 0이면 빈 배열을 반환한다", () => {
    expect(generateMineCoordinates(3, 3, 0, new SequenceRandom([]))).toEqual([]);
  });

  it("rng.nextInt가 범위 밖 인덱스를 반환하면 throw(방어)", () => {
    // 풀 길이 9에 대해 9(= 범위 밖)를 반환
    expect(() => generateMineCoordinates(3, 3, 1, new SequenceRandom([9]))).toThrow(
      /out-of-range/,
    );
    expect(() => generateMineCoordinates(3, 3, 1, new SequenceRandom([-1]))).toThrow(
      /out-of-range/,
    );
  });
});

describe("startMinesweeperGame", () => {
  it("결정적으로 같은 보드를 만든다(모든 칸 미공개, adjacent 채워짐)", () => {
    const a = startMinesweeperGame(3, 3, 2, new SequenceRandom([0, 0]));
    const b = startMinesweeperGame(3, 3, 2, new SequenceRandom([0, 0]));
    expect(a).toEqual(b);
    // 모든 칸 미공개
    expect(a.every((row) => row.every((cell) => !cell.revealed))).toBe(true);
    // 지뢰 수가 mineCount와 일치
    const mineCount = a.flat().filter((cell) => cell.mine).length;
    expect(mineCount).toBe(2);
    // 직접 createMinefield와 동일해야 한다
    expect(a).toEqual(
      createMinefield(3, 3, [
        [0, 0],
        [0, 1],
      ]),
    );
  });
});

describe("playMinesweeperTurn", () => {
  it("지뢰 칸을 열면 loss", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    const result = playMinesweeperTurn(board, 0, 0);
    expect(result.status).toBe("loss");
    expect(result.board[0]![0]!.revealed).toBe(true);
  });

  it("인접 0인 빈 칸을 열면 연쇄 공개 후 아직 남은 칸이 있으면 playing", () => {
    // 1x5, 가운데 (0,2)만 지뢰. (0,0) 열기 → (0,0),(0,1) 연쇄 공개, (0,3),(0,4) 미공개.
    const board = createMinefield(1, 5, [[0, 2]]);
    const result = playMinesweeperTurn(board, 0, 0);
    expect(result.status).toBe("playing");
    expect(revealedCoords(result.board)).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it("지뢰 아닌 모든 칸이 공개되면 win(연쇄 공개 포함)", () => {
    // 3x3, (0,0)만 지뢰. (2,2)에서 연쇄 공개되면 나머지 8칸 전부 열려 win.
    const board = createMinefield(3, 3, [[0, 0]]);
    const result = playMinesweeperTurn(board, 2, 2);
    expect(result.status).toBe("win");
    expect(revealedCoords(result.board).length).toBe(8); // 지뢰 1칸 제외 전부
  });

  it("숫자 칸 하나만 열면 진행 중(playing)이다", () => {
    const board = createMinefield(3, 3, [[0, 0]]);
    const result = playMinesweeperTurn(board, 1, 1); // adjacent=1, 연쇄 없음
    expect(result.status).toBe("playing");
    expect(revealedCoords(result.board)).toEqual([[1, 1]]);
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board = createMinefield(3, 3, [[0, 0]]);
    playMinesweeperTurn(board, 2, 2);
    expect(board.every((row) => row.every((cell) => !cell.revealed))).toBe(true);
  });
});
