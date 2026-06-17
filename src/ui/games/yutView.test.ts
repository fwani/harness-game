import { describe, it, expect } from "vitest";
import {
  yutResultLabel,
  throwsLabel,
  playYutRound,
  yutOutcomeLabel,
  YUT_FINISH,
} from "./yutView";
import type { RandomSource } from "../../application/dealCards";
import type { YutThrow } from "../../domain/yut";

/**
 * 정해진 윷가락 면 시퀀스를 순환 반환하는 결정적 RandomSource 스텁.
 * playYutTurn은 한 번 던질 때 4개의 면(rng.nextInt(2))을 읽는다.
 * [1,1,1,0] 패턴은 매 던짐마다 배 3개 → "걸"(3칸, 추가 던짐 없음)을 만든다.
 */
function cyclingRng(faces: number[]): RandomSource {
  let i = 0;
  return {
    nextInt() {
      const face = faces[i % faces.length]!;
      i += 1;
      return face;
    },
  };
}

/** 매 턴 "걸"(3칸)만 나오는 스텁. 추가 던짐이 없어 턴당 정확히 한 번 던진다. */
function geolRng(): RandomSource {
  return cyclingRng([1, 1, 1, 0]);
}

describe("yutView helpers", () => {
  it("yutResultLabel은 도개걸윷모를 한국어로 매핑한다", () => {
    expect(yutResultLabel("do")).toBe("도");
    expect(yutResultLabel("gae")).toBe("개");
    expect(yutResultLabel("geol")).toBe("걸");
    expect(yutResultLabel("yut")).toBe("윷");
    expect(yutResultLabel("mo")).toBe("모");
  });

  it("throwsLabel은 한 턴의 던짐들을 순서대로 이어 표기한다(윷·모 추가 던짐 포함)", () => {
    const throws: YutThrow[] = [
      { result: "mo", steps: 5, extraThrow: true },
      { result: "geol", steps: 3, extraThrow: false },
    ];
    expect(throwsLabel(throws)).toBe("모 · 걸");
    expect(throwsLabel([])).toBe("");
  });

  it("yutOutcomeLabel은 승/패/무를 텍스트로 구분한다", () => {
    expect(yutOutcomeLabel("a")).toContain("승리");
    expect(yutOutcomeLabel("b")).toContain("패배");
    expect(yutOutcomeLabel("draw")).toContain("무승부");
  });

  it("내가 이번 턴에 완주하면 CPU는 던지지 않고 내 승리로 종료한다", () => {
    const result = playYutRound(YUT_FINISH - 2, 0, geolRng());
    expect(result.myTraveled).toBe(YUT_FINISH);
    expect(result.myTurn.position.finished).toBe(true);
    expect(result.cpuTurn).toBeNull();
    expect(result.cpuTraveled).toBe(0);
    expect(result.winner).toBe("a");
  });

  it("내가 완주 못하고 CPU가 완주하면 CPU 승리로 종료한다", () => {
    const result = playYutRound(0, YUT_FINISH - 2, geolRng());
    expect(result.myTurn.position.finished).toBe(false);
    expect(result.myTraveled).toBe(3); // 0 + 걸(3)
    expect(result.cpuTurn).not.toBeNull();
    expect(result.cpuTraveled).toBe(YUT_FINISH);
    expect(result.winner).toBe("b");
  });

  it("둘 다 완주하지 못하면 진행 중(winner=null)이며 양쪽이 전진한다", () => {
    const result = playYutRound(0, 0, geolRng());
    expect(result.myTraveled).toBe(3);
    expect(result.cpuTraveled).toBe(3);
    expect(result.winner).toBeNull();
  });
});
