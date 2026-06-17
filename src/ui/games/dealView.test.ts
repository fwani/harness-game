import { describe, it, expect } from "vitest";
import { validateDealInput, dealFailureMessage } from "./dealView";

const DECK = 52;

describe("validateDealInput", () => {
  it("정상 입력은 ok=true, reason=null", () => {
    expect(validateDealInput(4, 5, DECK)).toEqual({ ok: true, reason: null });
  });

  it("덱을 정확히 다 쓰는 경계(인원×장수 == 덱 크기)는 통과", () => {
    expect(validateDealInput(4, 13, DECK)).toEqual({ ok: true, reason: null });
  });

  it("0장 딜(perPlayer=0)은 통과", () => {
    expect(validateDealInput(8, 0, DECK)).toEqual({ ok: true, reason: null });
  });

  it("인원 0은 한국어 사유로 거부(영어 'got 0' 노출 금지)", () => {
    const v = validateDealInput(0, 13, DECK);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("인원은 1명 이상이어야 합니다.");
    expect(v.reason).not.toMatch(/got|integer/i);
  });

  it("인원이 정수가 아니면 거부", () => {
    expect(validateDealInput(2.5, 5, DECK)).toEqual({
      ok: false,
      reason: "인원은 1명 이상이어야 합니다.",
    });
  });

  it("1인당 음수는 한국어 사유로 거부", () => {
    expect(validateDealInput(4, -1, DECK)).toEqual({
      ok: false,
      reason: "1인당 카드 수는 0장 이상이어야 합니다.",
    });
  });

  it("1인당이 정수가 아니면 거부", () => {
    expect(validateDealInput(4, 2.5, DECK)).toEqual({
      ok: false,
      reason: "1인당 카드 수는 0장 이상이어야 합니다.",
    });
  });

  it("카드 부족(8명×13장=104>52)은 필요/보유 수를 한국어로 안내(영어 'need/have' 노출 금지)", () => {
    const v = validateDealInput(8, 13, DECK);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("카드가 부족합니다: 104장 필요, 52장뿐입니다.");
    expect(v.reason).not.toMatch(/need|have/i);
  });

  it("덱 크기를 인자로 받아 다른 덱에도 적용된다", () => {
    expect(validateDealInput(2, 2, 3)).toEqual({
      ok: false,
      reason: "카드가 부족합니다: 4장 필요, 3장뿐입니다.",
    });
  });
});

describe("dealFailureMessage", () => {
  it("플레이어용 한국어 폴백 메시지를 돌려준다", () => {
    expect(dealFailureMessage()).toBe("딜에 실패했습니다. 입력을 확인해 주세요.");
  });
});
