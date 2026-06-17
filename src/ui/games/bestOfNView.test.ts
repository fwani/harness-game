import { describe, it, expect } from "vitest";
import {
  TARGET_OPTIONS,
  rpsResultToOutcome,
  roundOutcomeLabel,
  targetLabel,
  seriesScoreLabel,
  matchStatusLabel,
} from "./bestOfNView";
import { playMatch, type RoundOutcome } from "../../domain/match";

describe("bestOfNView helpers", () => {
  it("rpsResultToOutcome은 RpsResult를 RoundOutcome으로 매핑한다", () => {
    expect(rpsResultToOutcome("a-win")).toBe("a");
    expect(rpsResultToOutcome("b-win")).toBe("b");
    expect(rpsResultToOutcome("draw")).toBe("draw");
  });

  it("roundOutcomeLabel은 a=승리, b=패배, draw=무승부를 라벨로 구분한다", () => {
    expect(roundOutcomeLabel("a")).toContain("승리");
    expect(roundOutcomeLabel("b")).toContain("패배");
    expect(roundOutcomeLabel("draw")).toContain("무승부");
  });

  it("targetLabel은 선승 수와 판제를 함께 표기한다", () => {
    expect(targetLabel(2)).toBe("2선승 (3판제)");
    expect(targetLabel(3)).toBe("3선승 (5판제)");
    expect(targetLabel(4)).toBe("4선승 (7판제)");
  });

  it("TARGET_OPTIONS는 2·3·4선승을 제공한다", () => {
    expect([...TARGET_OPTIONS]).toEqual([2, 3, 4]);
  });

  it("seriesScoreLabel은 시리즈 점수를 나/CPU로 보여주고 무승부가 있으면 병기한다", () => {
    const noDraw = playMatch(["a", "b"], 2);
    expect(seriesScoreLabel(noDraw)).toBe("나 1 : 1 CPU");

    const withDraw = playMatch(["a", "draw", "b"], 2);
    expect(seriesScoreLabel(withDraw)).toBe("나 1 : 1 CPU · 무 1");
  });

  it("a가 먼저 targetWins에 도달하면 decided·승자(나)로 표시된다", () => {
    const status = playMatch(["a", "b", "a"], 2);
    expect(status.decided).toBe(true);
    expect(status.winner).toBe("a");
    expect(matchStatusLabel(status, 2)).toContain("매치 승리");
  });

  it("b가 먼저 targetWins에 도달하면 매치 패배로 표시된다", () => {
    const status = playMatch(["b", "a", "b"], 2);
    expect(status.decided).toBe(true);
    expect(status.winner).toBe("b");
    expect(matchStatusLabel(status, 2)).toContain("매치 패배");
  });

  it("미결정 매치는 진행 중 라벨을 보여준다", () => {
    const status = playMatch(["a"], 2);
    expect(status.decided).toBe(false);
    expect(matchStatusLabel(status, 2)).toContain("진행 중");
  });

  it("무승부 라운드는 어느 쪽 승수에도 들어가지 않는다", () => {
    const status = playMatch(["draw", "draw", "draw"], 2);
    expect(status.winsA).toBe(0);
    expect(status.winsB).toBe(0);
    expect(status.draws).toBe(3);
    expect(status.decided).toBe(false);
  });

  it("매치가 결정된 뒤의 라운드는 집계에서 무시된다", () => {
    // a가 2선승으로 이미 결정된 후 b 라운드가 와도 승수·승자 불변.
    const status = playMatch(["a", "a", "b", "b"], 2);
    expect(status.winner).toBe("a");
    expect(status.winsA).toBe(2);
    expect(status.winsB).toBe(0);
  });

  it("리셋은 빈 라운드 배열 → 미결정·0:0 상태로 표현된다", () => {
    const reset = playMatch([] as RoundOutcome[], 2);
    expect(reset.decided).toBe(false);
    expect(seriesScoreLabel(reset)).toBe("나 0 : 0 CPU");
    expect(matchStatusLabel(reset, 2)).toContain("진행 중");
  });
});
