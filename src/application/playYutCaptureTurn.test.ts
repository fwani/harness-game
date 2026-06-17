import { describe, expect, it } from "vitest";
import { playYutCaptureTurn } from "./playYutCaptureTurn";
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

// 한 번의 던짐 = 4가락(nextInt 4회). face===1 → 배(belly).
// 배 개수: 0=모(5,추가), 1=도(1), 2=개(2), 3=걸(3), 4=윷(4,추가).

describe("playYutCaptureTurn", () => {
  it("(1) 같은 칸 도달 시 잡기: 상대 말 0 리셋·captured·extraThrow=true", () => {
    const rng = new SeqRandom([1, 1, 0, 0]); // 개(steps 2)
    const result = playYutCaptureTurn(3, 5, rng); // 3+2=5 → 상대(5)와 같은 칸
    expect(result.throws.map((t) => t.result)).toEqual(["gae"]);
    expect(result.moverTraveled).toBe(5);
    expect(result.captured).toBe(true);
    expect(result.opponentTraveled).toBe(0); // 잡혀서 출발점 리셋
    expect(result.extraThrow).toBe(true); // 잡으면 한 번 더
    expect(result.moverFinished).toBe(false);
  });

  it("(2) 안전 지대(완주 20)에서는 잡기 없음", () => {
    const rng = new SeqRandom([1, 1, 1, 0]); // 걸(steps 3)
    const result = playYutCaptureTurn(17, 20, rng); // 17+3=20(완주, 안전 지대)
    expect(result.moverTraveled).toBe(20);
    expect(result.captured).toBe(false); // 20은 안전 지대
    expect(result.opponentTraveled).toBe(20); // 잡지 못해 그대로
    expect(result.moverFinished).toBe(true);
    expect(result.extraThrow).toBe(false); // 걸은 추가 던짐 아님, 잡기도 없음
  });

  it("(3) 잡기 없이 윷/모(추가 던짐)면 extraThrow=true", () => {
    const rng = new SeqRandom([
      1, 1, 1, 1, // 윷(steps 4, 추가 던짐)
      1, 0, 0, 0, // 도(steps 1)
    ]);
    const result = playYutCaptureTurn(0, 10, rng); // 0+4+1=5, 상대 10 → 잡기 없음
    expect(result.throws.map((t) => t.result)).toEqual(["yut", "do"]);
    expect(result.moverTraveled).toBe(5);
    expect(result.captured).toBe(false);
    expect(result.opponentTraveled).toBe(10);
    expect(result.extraThrow).toBe(true); // 윷이 나와 한 번 더
    expect(result.moverFinished).toBe(false);
  });

  it("(4) 완주(moverFinished) 처리: 상대 말은 경로 밖이라 잡지 않음", () => {
    const rng = new SeqRandom([1, 1, 1, 0]); // 걸(steps 3)
    const result = playYutCaptureTurn(18, 3, rng); // 18+3 >= 20 → 완주
    expect(result.moverTraveled).toBe(20);
    expect(result.moverFinished).toBe(true);
    expect(result.captured).toBe(false);
    expect(result.opponentTraveled).toBe(3); // 변동 없음
    expect(result.extraThrow).toBe(false);
  });

  it("(5) 잡기 + 윷/모가 함께면 extraThrow=true (잡기 우선 보장)", () => {
    const rng = new SeqRandom([
      1, 1, 1, 1, // 윷(steps 4, 추가 던짐)
      1, 1, 0, 0, // 개(steps 2)
    ]);
    const result = playYutCaptureTurn(0, 6, rng); // 0+4+2=6 → 상대(6) 잡기
    expect(result.moverTraveled).toBe(6);
    expect(result.captured).toBe(true);
    expect(result.opponentTraveled).toBe(0);
    expect(result.extraThrow).toBe(true);
  });

  it("(6) 입력값을 변형하지 않는다(불변)", () => {
    const moverTraveled = 3;
    const opponentTraveled = 5;
    playYutCaptureTurn(moverTraveled, opponentTraveled, new SeqRandom([1, 1, 0, 0]));
    expect(moverTraveled).toBe(3);
    expect(opponentTraveled).toBe(5);
  });

  it("이미 완주한 말(20)을 다시 굴리면 도메인 검증으로 throw", () => {
    expect(() =>
      playYutCaptureTurn(20, 5, new SeqRandom([1, 0, 0, 0])),
    ).toThrow();
  });
});
