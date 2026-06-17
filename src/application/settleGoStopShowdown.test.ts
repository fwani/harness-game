import { describe, it, expect } from "vitest";
import type { HwatuCard } from "../domain/hwatu";
import { settleGoStopShowdown } from "./settleGoStopShowdown";

// 분류표 참고(hwatuCategory): 광 = {1,0},{3,0},{8,0},{11,0},{12,0}.
// 피 = 각 월의 인덱스 2·3 등(아래 fixture 는 모두 피로 분류되는 카드만 사용).
const GWANG_1: HwatuCard = { month: 1, index: 0 };
const GWANG_3: HwatuCard = { month: 3, index: 0 };
const GWANG_8: HwatuCard = { month: 8, index: 0 };
const GWANG_11: HwatuCard = { month: 11, index: 0 };

// 비광이 아닌 3광 → scoreGwang = 3.
const THREE_GWANG: HwatuCard[] = [GWANG_1, GWANG_3, GWANG_8];

// 피 카드(분류상 모두 "피").
const PI_CARDS: HwatuCard[] = [
  { month: 1, index: 2 },
  { month: 1, index: 3 },
  { month: 2, index: 2 },
  { month: 2, index: 3 },
  { month: 3, index: 2 },
  { month: 3, index: 3 },
  { month: 4, index: 2 },
  { month: 4, index: 3 },
  { month: 5, index: 2 },
  { month: 5, index: 3 },
];

describe("settleGoStopShowdown", () => {
  it("점수 합산만으로 승자를 가린다(고·박 없음)", () => {
    // a: 3광(=3점). b: 광 1장({11,0}) → 점수 0이지만 광 보유로 a 의 광박을 막는다.
    const result = settleGoStopShowdown(
      { captured: THREE_GWANG, goCount: 0 },
      { captured: [GWANG_11], goCount: 0 },
    );
    expect(result.winner).toBe("a");
    expect(result.a.base).toBe(3);
    expect(result.a.multiplier).toBe(1);
    expect(result.a.flags).toEqual({ gwangbak: false, pibak: false });
    expect(result.a.total).toBe(3);
    expect(result.b.total).toBe(0);
  });

  it("대칭: b 가 더 높으면 winner=b", () => {
    const result = settleGoStopShowdown(
      { captured: [GWANG_11], goCount: 0 },
      { captured: THREE_GWANG, goCount: 0 },
    );
    expect(result.winner).toBe("b");
    expect(result.b.base).toBe(3);
    expect(result.a.total).toBe(0);
  });

  it("「고」 보너스·배수가 base 에 반영된다", () => {
    // a: 3광(base 3) + 3고 → (3+3)*2 = 12. b: 광 1장으로 광박 차단.
    const result = settleGoStopShowdown(
      { captured: THREE_GWANG, goCount: 3 },
      { captured: [GWANG_11], goCount: 0 },
    );
    expect(result.winner).toBe("a");
    expect(result.a.base).toBe(12);
    expect(result.a.multiplier).toBe(1);
    expect(result.a.total).toBe(12);
  });

  it("광박·피박 배수(×4)가 반영된다", () => {
    // a: 3광 + 피 10장 → 점수 3+1=4. b: 피 1장만(광 0, 피<7) → 광박·피박 동시 성립.
    const aCaptured = [...THREE_GWANG, ...PI_CARDS];
    const result = settleGoStopShowdown(
      { captured: aCaptured, goCount: 0 },
      { captured: [{ month: 6, index: 2 }], goCount: 0 },
    );
    expect(result.winner).toBe("a");
    expect(result.a.base).toBe(4);
    expect(result.a.flags).toEqual({ gwangbak: true, pibak: true });
    expect(result.a.multiplier).toBe(4);
    expect(result.a.total).toBe(16);
  });

  it("동점이면 draw", () => {
    // 양쪽 모두 점수 0, 박 없음.
    const result = settleGoStopShowdown(
      { captured: [{ month: 6, index: 2 }], goCount: 0 },
      { captured: [{ month: 7, index: 2 }], goCount: 0 },
    );
    expect(result.winner).toBe("draw");
    expect(result.a.total).toBe(0);
    expect(result.b.total).toBe(0);
  });

  it("captured 가 비면 throw(빈 패)", () => {
    expect(() =>
      settleGoStopShowdown(
        { captured: [], goCount: 0 },
        { captured: [GWANG_1], goCount: 0 },
      ),
    ).toThrow();
    expect(() =>
      settleGoStopShowdown(
        { captured: [GWANG_1], goCount: 0 },
        { captured: [], goCount: 0 },
      ),
    ).toThrow();
  });

  it("goCount 가 음수·비정수면 throw(applyGoBonus 위임)", () => {
    expect(() =>
      settleGoStopShowdown(
        { captured: [GWANG_1], goCount: -1 },
        { captured: [GWANG_3], goCount: 0 },
      ),
    ).toThrow();
    expect(() =>
      settleGoStopShowdown(
        { captured: [GWANG_1], goCount: 1.5 },
        { captured: [GWANG_3], goCount: 0 },
      ),
    ).toThrow();
  });

  it("유효하지 않은 카드면 throw(도메인 분류 위임)", () => {
    expect(() =>
      settleGoStopShowdown(
        { captured: [{ month: 13, index: 0 }], goCount: 0 },
        { captured: [GWANG_1], goCount: 0 },
      ),
    ).toThrow();
  });

  it("입력 배열을 변형하지 않는다", () => {
    const aCaptured = [...THREE_GWANG];
    const bCaptured = [GWANG_11];
    const aSnapshot = JSON.stringify(aCaptured);
    const bSnapshot = JSON.stringify(bCaptured);
    settleGoStopShowdown(
      { captured: aCaptured, goCount: 2 },
      { captured: bCaptured, goCount: 1 },
    );
    expect(JSON.stringify(aCaptured)).toBe(aSnapshot);
    expect(JSON.stringify(bCaptured)).toBe(bSnapshot);
    expect(aCaptured).toHaveLength(3);
  });
});
