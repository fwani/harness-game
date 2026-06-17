import { describe, it, expect } from "vitest";
import { describeBaseballResult, parseGuessInput } from "./numberBaseballView";
import { isValidBaseballNumber } from "../../domain/numberBaseball";

describe("describeBaseballResult", () => {
  it("전부 스트라이크면 정답!", () => {
    expect(describeBaseballResult({ strikes: 3, balls: 0 })).toBe("정답!");
  });

  it("스트라이크·볼이 모두 0이면 아웃", () => {
    expect(describeBaseballResult({ strikes: 0, balls: 0 })).toBe("아웃");
  });

  it("부분 일치는 nS mB 형식으로 표시", () => {
    expect(describeBaseballResult({ strikes: 1, balls: 2 })).toBe("1S 2B");
    expect(describeBaseballResult({ strikes: 0, balls: 3 })).toBe("0S 3B");
    expect(describeBaseballResult({ strikes: 2, balls: 0 })).toBe("2S 0B");
  });

  it("length를 받아 다른 자리수의 정답도 판정한다", () => {
    expect(describeBaseballResult({ strikes: 4, balls: 0 }, 4)).toBe("정답!");
    // 3 스트라이크는 4자리에선 아직 정답이 아니다.
    expect(describeBaseballResult({ strikes: 3, balls: 0 }, 4)).toBe("3S 0B");
  });
});

describe("parseGuessInput", () => {
  it("정상 입력을 숫자 배열로 파싱한다", () => {
    expect(parseGuessInput("123")).toEqual({ digits: [1, 2, 3] });
    expect(parseGuessInput("907")).toEqual({ digits: [9, 0, 7] });
  });

  it("공백은 무시하고 파싱한다", () => {
    expect(parseGuessInput("1 2 3")).toEqual({ digits: [1, 2, 3] });
    expect(parseGuessInput("  4 5 6  ")).toEqual({ digits: [4, 5, 6] });
  });

  it("빈 입력은 한국어 사유를 반환(throw 아님)", () => {
    expect(parseGuessInput("")).toEqual({
      error: "3자리 숫자를 입력하세요.",
    });
    expect(parseGuessInput("   ")).toEqual({
      error: "3자리 숫자를 입력하세요.",
    });
  });

  it("길이 불일치는 사유를 반환", () => {
    const tooShort = parseGuessInput("12");
    expect(tooShort).toEqual({
      error: "3자리 숫자를 입력하세요. (입력: 2자리)",
    });
    const tooLong = parseGuessInput("1234");
    expect(tooLong).toEqual({
      error: "3자리 숫자를 입력하세요. (입력: 4자리)",
    });
  });

  it("중복 숫자는 사유를 반환", () => {
    expect(parseGuessInput("112")).toEqual({
      error: "서로 다른 숫자를 입력하세요(중복 불가).",
    });
  });

  it("0–9 이외 문자는 사유를 반환(영어 예외 노출 금지)", () => {
    const v = parseGuessInput("12a");
    expect(v).toEqual({ error: "0–9 사이 숫자만 입력하세요." });
    if ("error" in v) {
      expect(v.error).not.toMatch(/NaN|integer|valid/i);
    }
    expect(parseGuessInput("1.2")).toEqual({
      error: "0–9 사이 숫자만 입력하세요.",
    });
    expect(parseGuessInput("-12")).toEqual({
      error: "0–9 사이 숫자만 입력하세요.",
    });
  });

  it("length 인자로 다른 자리수도 파싱한다", () => {
    expect(parseGuessInput("1234", 4)).toEqual({ digits: [1, 2, 3, 4] });
    expect(parseGuessInput("123", 4)).toEqual({
      error: "4자리 숫자를 입력하세요. (입력: 3자리)",
    });
  });

  it("파싱 성공값은 항상 유효한 숫자야구 수다(domain과 정합)", () => {
    const v = parseGuessInput("507");
    expect("digits" in v).toBe(true);
    if ("digits" in v) {
      expect(isValidBaseballNumber(v.digits, 3)).toBe(true);
    }
  });
});
