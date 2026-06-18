import { describe, expect, it } from "vitest";
import type { BaccaratSettlement } from "../../domain/baccarat";
import {
  STARTING_BANKROLL,
  DEFAULT_BET_AMOUNT,
  isValidBet,
  clampBet,
  nextBankroll,
  isBankrupt,
  baccaratSettlementLabel,
} from "./baccaratBankrollView";

describe("isValidBet", () => {
  it("양의 정수이며 잔고 이하면 유효", () => {
    expect(isValidBet(100, 1000)).toBe(true);
    expect(isValidBet(1000, 1000)).toBe(true);
  });
  it("잔고 초과면 무효", () => {
    expect(isValidBet(1001, 1000)).toBe(false);
  });
  it("0·음수·비정수는 무효", () => {
    expect(isValidBet(0, 1000)).toBe(false);
    expect(isValidBet(-10, 1000)).toBe(false);
    expect(isValidBet(10.5, 1000)).toBe(false);
  });
});

describe("clampBet", () => {
  it("범위 내 정수는 그대로", () => {
    expect(clampBet(100, 1000)).toBe(100);
  });
  it("잔고로 상한 클램프", () => {
    expect(clampBet(5000, 1000)).toBe(1000);
  });
  it("소수는 내림", () => {
    expect(clampBet(99.9, 1000)).toBe(99);
  });
  it("1 미만은 1로", () => {
    expect(clampBet(0, 1000)).toBe(1);
    expect(clampBet(-5, 1000)).toBe(1);
  });
  it("잔고가 1 미만이면 0(베팅 불가)", () => {
    expect(clampBet(10, 0)).toBe(0);
  });
  it("유효 숫자가 아니면 잔고로 상한된 기본값", () => {
    expect(clampBet("abc", 1000)).toBe(DEFAULT_BET_AMOUNT);
    expect(clampBet(NaN, 5)).toBe(5);
  });
});

describe("nextBankroll", () => {
  const s = (net: number, push = false): BaccaratSettlement => ({ net, push });
  it("획득 시 잔고 증가", () => {
    expect(nextBankroll(1000, s(95))).toBe(1095);
  });
  it("손실 시 잔고 감소", () => {
    expect(nextBankroll(1000, s(-100))).toBe(900);
  });
  it("push면 잔고 변화 없음", () => {
    expect(nextBankroll(1000, s(0, true))).toBe(1000);
  });
});

describe("isBankrupt", () => {
  it("1칩도 못 걸면 파산", () => {
    expect(isBankrupt(0)).toBe(true);
    expect(isBankrupt(0.5)).toBe(true);
  });
  it("1칩 이상이면 아님", () => {
    expect(isBankrupt(1)).toBe(false);
    expect(isBankrupt(STARTING_BANKROLL)).toBe(false);
  });
});

describe("baccaratSettlementLabel", () => {
  it("push는 환원 안내", () => {
    expect(baccaratSettlementLabel({ net: 0, push: true })).toContain("푸시");
  });
  it("획득은 금액과 함께", () => {
    expect(baccaratSettlementLabel({ net: 95, push: false })).toContain("+95");
  });
  it("손실은 음수 금액과 함께", () => {
    expect(baccaratSettlementLabel({ net: -100, push: false })).toContain("-100");
  });
});
