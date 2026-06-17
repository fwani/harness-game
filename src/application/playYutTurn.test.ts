import { describe, expect, it } from "vitest";
import { playYutTurn } from "./playYutTurn";
import type { RandomSource } from "./dealCards";

/** 미리 정한 nextInt 시퀀스를 순서대로 돌려주는 결정적 스텁. */
class SeqRandom implements RandomSource {
  private i = 0;
  constructor(private readonly seq: number[]) {}
  nextInt(maxExclusive: number): number {
    if (maxExclusive < 1) {
      throw new Error("maxExclusive must be >= 1");
    }
    if (this.i >= this.seq.length) {
      throw new Error("SeqRandom: sequence exhausted");
    }
    return this.seq[this.i++]!;
  }
}

// 한 번의 던짐 = 4가락(nextInt 4회). face===1 → 배(belly). 배 개수: 0=모,1=도,2=개,3=걸,4=윷.

describe("playYutTurn", () => {
  it("단발 결과(도): 추가 던짐 없이 1회 던지고 1칸 전진", () => {
    const rng = new SeqRandom([1, 0, 0, 0]); // 배 1개 → 도(steps 1)
    const { throws, position } = playYutTurn(0, rng);
    expect(throws).toHaveLength(1);
    expect(throws[0]).toEqual({ result: "do", steps: 1, extraThrow: false });
    expect(position).toEqual({ traveled: 1, finished: false });
  });

  it("단발 결과(걸): 추가 던짐 없이 3칸 전진", () => {
    const rng = new SeqRandom([1, 1, 1, 0]); // 배 3개 → 걸(steps 3)
    const { throws, position } = playYutTurn(5, rng);
    expect(throws).toHaveLength(1);
    expect(throws[0]!.result).toBe("geol");
    expect(position).toEqual({ traveled: 8, finished: false });
  });

  it("윷→일반(개) 연속 던짐을 누적해 여러 칸 전진", () => {
    const rng = new SeqRandom([
      1, 1, 1, 1, // 윷(steps 4, 추가 던짐)
      1, 1, 0, 0, // 개(steps 2)
    ]);
    const { throws, position } = playYutTurn(0, rng);
    expect(throws.map((t) => t.result)).toEqual(["yut", "gae"]);
    expect(throws[0]!.extraThrow).toBe(true);
    expect(throws[1]!.extraThrow).toBe(false);
    expect(position).toEqual({ traveled: 6, finished: false }); // 0+4+2
  });

  it("모→일반(도) 연속 던짐을 누적해 전진", () => {
    const rng = new SeqRandom([
      0, 0, 0, 0, // 모(steps 5, 추가 던짐)
      1, 0, 0, 0, // 도(steps 1)
    ]);
    const { throws, position } = playYutTurn(0, rng);
    expect(throws.map((t) => t.result)).toEqual(["mo", "do"]);
    expect(position).toEqual({ traveled: 6, finished: false }); // 0+5+1
  });

  it("누적 전진 중 완주하면 이후 던짐은 적용하지 않고 위치를 고정한다", () => {
    const rng = new SeqRandom([
      1, 1, 1, 1, // 윷(steps 4): 18+4=22 ≥ 20 → 완주
      1, 1, 0, 0, // 개: 추가 던짐으로 나오지만 적용되지 않음
    ]);
    const { throws, position } = playYutTurn(18, rng);
    expect(throws.map((t) => t.result)).toEqual(["yut", "gae"]); // 던짐은 모두 모은다
    expect(position).toEqual({ traveled: 20, finished: true }); // 개(steps 2)는 미적용
  });

  it("결정적 스텁으로 같은 시퀀스는 같은 결과를 재현한다", () => {
    const seq = [1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0]; // 윷→모→도
    const a = playYutTurn(2, new SeqRandom(seq));
    const b = playYutTurn(2, new SeqRandom([...seq]));
    expect(a).toEqual(b);
    expect(a.throws.map((t) => t.result)).toEqual(["yut", "mo", "do"]);
    expect(a.position).toEqual({ traveled: 12, finished: false }); // 2+4+5+1
  });

  it("nextInt가 0/1 외 값을 주면 throw", () => {
    const rng = new SeqRandom([2, 0, 0, 0]);
    expect(() => playYutTurn(0, rng)).toThrow(/out-of-range stick face/);
  });

  it("이미 완주(traveled=20)한 말을 전진시키면 도메인이 throw", () => {
    const rng = new SeqRandom([1, 0, 0, 0]); // 도
    expect(() => playYutTurn(20, rng)).toThrow(/already finished/);
  });

  it("범위 밖 traveled는 도메인이 throw", () => {
    const rng = new SeqRandom([1, 0, 0, 0]);
    expect(() => playYutTurn(21, rng)).toThrow(/integer traveled in 0\.\.20/);
  });

  it("입력 인자를 변형하지 않는다(같은 호출 반복 시 동일 결과)", () => {
    const traveled = 3;
    const seq = [1, 1, 0, 0]; // 개
    const first = playYutTurn(traveled, new SeqRandom(seq));
    const second = playYutTurn(traveled, new SeqRandom(seq));
    expect(traveled).toBe(3); // 원시값 인자 불변
    expect(seq).toEqual([1, 1, 0, 0]); // 시퀀스 원본 미변형
    expect(first).toEqual(second);
  });
});
