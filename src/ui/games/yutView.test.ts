import { describe, it, expect } from "vitest";
import {
  yutResultLabel,
  throwsLabel,
  playYutRound,
  playYutCaptureRound,
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

/**
 * 윷(배 4개=4칸, 한 번 더) → 걸(3칸, 멈춤)을 한 턴으로 만드는 면 시퀀스.
 * playYutTurn은 윷이면 한 번 더 던지므로, 한 턴 안에서 [윷, 걸](4+3=7칸)이 누적된다.
 */
const YUT_THEN_GEOL = [1, 1, 1, 1, 1, 1, 1, 0];

describe("playYutCaptureRound (잡기 모드)", () => {
  it("내가 상대 칸에 멈추면 상대 말을 잡아 출발점(0)으로 리셋하고 한 번 더 던진다", () => {
    // 나=0, CPU=3. 나 걸(3) → 3칸에서 CPU(3)를 잡음 → CPU 0으로 리셋, 한 번 더.
    // 추가 턴: 3 → 걸(3) → 6 (상대는 0이라 안전, 잡기 없음).
    const result = playYutCaptureRound(0, 3, geolRng());
    expect(result.myCaptured).toBe(true);
    expect(result.cpuCaptured).toBe(false);
    // 잡기로 한 번 더 던졌으니 내 던짐은 2회.
    expect(result.myThrows.map((t) => t.result)).toEqual(["geol", "geol"]);
    expect(result.myTraveled).toBe(6);
    // 잡힌 뒤 CPU가 0에서 걸(3)로 전진.
    expect(result.cpuTraveled).toBe(3);
    expect(result.winner).toBeNull();
  });

  it("윷/모 추가 던짐은 라운드에서 중복 적용되지 않는다(턴 내부에서만 누적)", () => {
    // 나=0, CPU=1(잡힐 칸 아님). 한 턴 = [윷, 걸] = 4+3 = 7칸(playYutTurn 내부 누적).
    // 잡기가 없으니 라운드는 추가 턴을 부여하지 않는다 → 던짐은 정확히 [윷, 걸] 두 번뿐.
    const result = playYutCaptureRound(0, 1, cyclingRng(YUT_THEN_GEOL));
    expect(result.myCaptured).toBe(false);
    expect(result.myThrows.map((t) => t.result)).toEqual(["yut", "geol"]);
    expect(result.myTraveled).toBe(7);
    expect(result.winner).toBeNull();
  });

  it("내가 이번 라운드에 완주하면 CPU는 진행하지 않고 내 승리로 종료한다", () => {
    const result = playYutCaptureRound(YUT_FINISH - 2, 0, geolRng());
    expect(result.myTraveled).toBe(YUT_FINISH);
    expect(result.cpuThrows).toBeNull();
    expect(result.winner).toBe("a");
  });

  it("내가 완주 못하고 CPU가 완주하면 CPU 승리로 종료한다", () => {
    const result = playYutCaptureRound(0, YUT_FINISH - 2, geolRng());
    expect(result.myTraveled).toBe(3); // 0 + 걸(3)
    expect(result.cpuThrows).not.toBeNull();
    expect(result.cpuTraveled).toBe(YUT_FINISH);
    expect(result.winner).toBe("b");
  });

  it("같은 rng 시퀀스면 같은 결과(결정적)", () => {
    const a = playYutCaptureRound(2, 5, geolRng());
    const b = playYutCaptureRound(2, 5, geolRng());
    expect(a).toEqual(b);
  });
});
