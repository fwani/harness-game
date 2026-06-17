import { describe, it, expect } from "vitest";
import { advanceYutPiece } from "./yutMove";

describe("advanceYutPiece", () => {
  it("시작점(0)에서 첫 이동", () => {
    expect(advanceYutPiece(0, 1)).toEqual({ traveled: 1, finished: false });
    expect(advanceYutPiece(0, 5)).toEqual({ traveled: 5, finished: false });
  });

  it("판 위 일반 전진", () => {
    expect(advanceYutPiece(7, 3)).toEqual({ traveled: 10, finished: false });
    expect(advanceYutPiece(14, 4)).toEqual({ traveled: 18, finished: false });
  });

  it("완주 직전 → 정확히 20 도달 시 완주", () => {
    expect(advanceYutPiece(19, 1)).toEqual({ traveled: 20, finished: true });
    expect(advanceYutPiece(15, 5)).toEqual({ traveled: 20, finished: true });
  });

  it("오버슈트 시에도 완주(traveled=20)로 고정", () => {
    expect(advanceYutPiece(19, 5)).toEqual({ traveled: 20, finished: true });
    expect(advanceYutPiece(18, 4)).toEqual({ traveled: 20, finished: true });
  });

  it("traveled 범위/정수 위반 시 throw", () => {
    expect(() => advanceYutPiece(-1, 1)).toThrow();
    expect(() => advanceYutPiece(21, 1)).toThrow();
    expect(() => advanceYutPiece(1.5, 1)).toThrow();
    expect(() => advanceYutPiece(NaN, 1)).toThrow();
  });

  it("steps 범위/정수 위반 시 throw", () => {
    expect(() => advanceYutPiece(0, 0)).toThrow();
    expect(() => advanceYutPiece(0, 6)).toThrow();
    expect(() => advanceYutPiece(0, 2.5)).toThrow();
    expect(() => advanceYutPiece(0, NaN)).toThrow();
  });

  it("이미 완주한 말(traveled=20)을 다시 전진시키면 throw", () => {
    expect(() => advanceYutPiece(20, 1)).toThrow();
  });

  it("입력값을 변형하지 않는다(반환 객체는 새 객체)", () => {
    const traveled = 10;
    const steps = 3;
    const result = advanceYutPiece(traveled, steps);
    expect(traveled).toBe(10);
    expect(steps).toBe(3);
    expect(result).not.toBe(undefined);
  });
});
