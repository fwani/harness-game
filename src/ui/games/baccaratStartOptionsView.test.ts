import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACCARAT_BET,
  baccaratBetOptions,
  baccaratBetOutcomeLabel,
  baccaratBetResult,
  normalizeBaccaratBet,
} from "./baccaratStartOptionsView";

describe("DEFAULT_BACCARAT_BET", () => {
  it("기본값은 플레이어 베팅(기존 동작과 동일)이다", () => {
    expect(DEFAULT_BACCARAT_BET).toBe("player");
  });
});

describe("baccaratBetOptions", () => {
  it("플레이어→뱅커→타이 순으로 배당 포함 라벨을 제공한다", () => {
    expect(baccaratBetOptions()).toEqual([
      { value: "player", label: "플레이어 (1:1)" },
      { value: "banker", label: "뱅커 (1:1)" },
      { value: "tie", label: "타이 (8:1)" },
    ]);
  });
});

describe("normalizeBaccaratBet", () => {
  it("유효한 베팅 값은 그대로 통과시킨다", () => {
    expect(normalizeBaccaratBet("player")).toBe("player");
    expect(normalizeBaccaratBet("banker")).toBe("banker");
    expect(normalizeBaccaratBet("tie")).toBe("tie");
  });

  it("알 수 없는 입력은 기본값(플레이어)으로 대체한다", () => {
    expect(normalizeBaccaratBet("dragon")).toBe(DEFAULT_BACCARAT_BET);
    expect(normalizeBaccaratBet(undefined)).toBe(DEFAULT_BACCARAT_BET);
    expect(normalizeBaccaratBet(null)).toBe(DEFAULT_BACCARAT_BET);
    expect(normalizeBaccaratBet(3)).toBe(DEFAULT_BACCARAT_BET);
  });
});

describe("baccaratBetResult", () => {
  it("플레이어 베팅: 플레이어 승=적중, 뱅커 승=빗나감, 타이=푸시(환원)", () => {
    expect(baccaratBetResult("player", "player")).toBe("a");
    expect(baccaratBetResult("player", "banker")).toBe("b");
    expect(baccaratBetResult("player", "tie")).toBe("draw");
  });

  it("뱅커 베팅: 뱅커 승=적중, 플레이어 승=빗나감, 타이=푸시(환원)", () => {
    expect(baccaratBetResult("banker", "banker")).toBe("a");
    expect(baccaratBetResult("banker", "player")).toBe("b");
    expect(baccaratBetResult("banker", "tie")).toBe("draw");
  });

  it("타이 베팅: 타이=적중, 그 외(플레이어/뱅커 승)=빗나감", () => {
    expect(baccaratBetResult("tie", "tie")).toBe("a");
    expect(baccaratBetResult("tie", "player")).toBe("b");
    expect(baccaratBetResult("tie", "banker")).toBe("b");
  });
});

describe("baccaratBetOutcomeLabel", () => {
  it("적중/빗나감/푸시를 색 비의존 텍스트로 표기한다", () => {
    expect(baccaratBetOutcomeLabel("player", "player")).toContain("적중");
    expect(baccaratBetOutcomeLabel("player", "banker")).toContain("빗나감");
    expect(baccaratBetOutcomeLabel("player", "tie")).toContain("푸시");
    expect(baccaratBetOutcomeLabel("tie", "tie")).toContain("적중");
    expect(baccaratBetOutcomeLabel("banker", "tie")).toContain("푸시");
  });
});
