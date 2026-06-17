import { describe, expect, it } from "vitest";
import { createScrambledLightsOut } from "./createScrambledLightsOut";
import {
  createLightsOutBoard,
  isLightsOutSolved,
  pressLight,
  type LightsOutPos,
} from "../domain/lightsOut";
import type { RandomSource } from "./dealCards";

/**
 * 미리 정한 값 목록을 순서대로 반환하고(소진되면 되감음) 반환값을 기록하는 결정적 rng.
 * 반환값은 maxExclusive 범위로 매핑해 항상 유효 인덱스를 보장한다.
 */
class RecordingRandom implements RandomSource {
  private i = 0;
  readonly returned: number[] = [];
  constructor(private readonly values: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    const raw = this.values[this.i % this.values.length]!;
    this.i += 1;
    const v = ((raw % maxExclusive) + maxExclusive) % maxExclusive;
    this.returned.push(v);
    return v;
  }
}

/** 항상 0(첫 칸)을 반환하는 스텁. */
class ZeroRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    return 0;
  }
}

/** 항상 maxExclusive(경계 밖)를 반환하는 비정상 스텁(방어적 throw 검증용). */
class OutOfRangeRandom implements RandomSource {
  nextInt(maxExclusive: number): number {
    return maxExclusive;
  }
}

/** rng가 반환한 값들을 (row, col) 쌍의 누름 좌표 목록으로 재구성한다. */
function pressesFrom(returned: number[]): LightsOutPos[] {
  const presses: LightsOutPos[] = [];
  for (let k = 0; k + 1 < returned.length; k += 2) {
    presses.push({ row: returned[k]!, col: returned[k + 1]! });
  }
  return presses;
}

describe("createScrambledLightsOut", () => {
  it("반환 보드는 항상 solvable: 누른 좌표를 같은 순서로 재적용하면 클리어된다", () => {
    for (const size of [2, 3, 4, 5]) {
      const rng = new RecordingRandom([0, 1, 2, 3, 1, 0, 2, 1, 3, 2]);
      const board = createScrambledLightsOut(size, rng);

      // 셔플에 쓰인 누름들을 같은 순서로 다시 누르면 토글이 짝수번 되어 모두 꺼진다(역연산).
      let replay = board;
      for (const pos of pressesFrom(rng.returned)) {
        replay = pressLight(replay, pos);
      }
      expect(isLightsOutSolved(replay)).toBe(true);

      // 보드 형태는 size×size를 유지한다.
      expect(board).toHaveLength(size);
      for (const row of board) {
        expect(row).toHaveLength(size);
      }
    }
  });

  it("반환 보드는 시작부터 클리어돼 있지 않다(결정적 stub 기준)", () => {
    for (const size of [2, 3, 4]) {
      // ZeroRandom: (0,0)을 size*size(짝/홀 상관없이 size>=2이면 홀수가 아니어도)
      // → size=2면 4번(짝수)이라 보정 한 번이 들어가고, size=3이면 9번(홀수)이라 그대로 켜진다.
      const board = createScrambledLightsOut(size, new ZeroRandom());
      expect(isLightsOutSolved(board)).toBe(false);
    }
  });

  it("셔플 후 우연히 클리어면 한 번 더 눌러 시작부터 완성돼 있지 않게 한다", () => {
    // scrambleCount=0이면 모두 꺼진(클리어) 상태이므로 보정 한 수가 적용되어야 한다.
    const rng = new ZeroRandom();
    const board = createScrambledLightsOut(3, rng, 0);
    expect(isLightsOutSolved(board)).toBe(false);
  });

  it("같은 stub 시퀀스·같은 입력이면 결정적으로 동일한 보드를 반환한다", () => {
    const seed = [4, 2, 7, 1, 5, 3, 6, 0, 2, 9];
    const a = createScrambledLightsOut(4, new RecordingRandom(seed));
    const b = createScrambledLightsOut(4, new RecordingRandom(seed));
    expect(a).toEqual(b);
  });

  it("기본 scrambleCount(미지정) 경로가 동작한다(size*size회 누름)", () => {
    const rng = new RecordingRandom([0, 1, 1, 2, 2, 0]);
    const board = createScrambledLightsOut(3, rng);
    // 기본 size*size=9회 → 누름당 nextInt 2회 = 18회 호출(보정 없음: 9는 홀수라 클리어 아님).
    expect(rng.returned).toHaveLength(18);
    // 여전히 solvable함을 역연산으로 확인.
    let replay = board;
    for (const pos of pressesFrom(rng.returned)) {
      replay = pressLight(replay, pos);
    }
    expect(isLightsOutSolved(replay)).toBe(true);
  });

  it("size를 undefined로 주면 domain 기본 크기(5)를 사용한다", () => {
    const board = createScrambledLightsOut(undefined, new ZeroRandom());
    expect(board).toHaveLength(5);
    expect(board[0]).toHaveLength(5);
    // domain 기본 보드와 동일한 형태.
    expect(board.length).toBe(createLightsOutBoard().length);
  });

  it("잘못된 size는 domain의 검증 에러를 그대로 전파한다", () => {
    expect(() => createScrambledLightsOut(0, new ZeroRandom())).toThrow(
      /size는 1 이상의 정수/,
    );
    expect(() => createScrambledLightsOut(1.5, new ZeroRandom())).toThrow(
      /size는 1 이상의 정수/,
    );
  });

  it("RandomSource가 범위를 벗어난 인덱스를 주면 방어적으로 throw 한다", () => {
    expect(() =>
      createScrambledLightsOut(3, new OutOfRangeRandom()),
    ).toThrow(/out-of-range/);
  });

  it("입력(누름 좌표)으로 도메인 pressLight만 사용하므로 결과는 불변이며 새 보드를 반환한다", () => {
    const rng = new RecordingRandom([1, 2, 0, 1]);
    const board = createScrambledLightsOut(3, rng);
    const snapshot = board.map((row) => row.slice());
    // 도메인 함수 재사용으로 만든 보드를 다시 눌러도 입력 board는 변하지 않는다(불변).
    pressLight(board, { row: 0, col: 0 });
    expect(board).toEqual(snapshot);
  });
});
