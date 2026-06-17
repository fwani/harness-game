import { describe, it, expect } from "vitest";
import type { HwatuCard } from "./hwatu";
import { scoreGwang } from "./goStopScore";
import { scoreYeol } from "./goStopYeol";
import { scoreTti } from "./goStopTti";
import { scorePi } from "./goStopPi";
import { scoreGoStopHand, scoreGoStopTotal } from "./goStopTotal";

// 표준 분류표(hwatuCategory) 기준 카테고리별 대표 카드.
// 광: 1·3·8·11·12월 index0 (12월 index0 은 비광)
// 열끗: 2·4·5·6·7·9·10월 index0, 8·12월 index1
// 띠: 1~7·9·10월 index1, 12월 index2
// 피: 대부분 월의 index 2·3

// 비광을 포함하지 않는 광 3장
const GWANG_3_NO_BI: HwatuCard[] = [
  { month: 1, index: 0 },
  { month: 3, index: 0 },
  { month: 8, index: 0 },
];

// 고도리(2·4·8월 열끗) 3장 포함 열끗 5장
const YEOL_5_GODORI: HwatuCard[] = [
  { month: 2, index: 0 },
  { month: 4, index: 0 },
  { month: 8, index: 1 },
  { month: 5, index: 0 },
  { month: 6, index: 0 },
];

// 홍단(1·2·3월 띠) 3장 포함 띠 5장
const TTI_5_HONGDAN: HwatuCard[] = [
  { month: 1, index: 1 },
  { month: 2, index: 1 },
  { month: 3, index: 1 },
  { month: 4, index: 1 },
  { month: 5, index: 1 },
];

// 서로 다른 피 n장(월 1~6의 index 2·3 에서 최대 12장)
function distinctPi(n: number): HwatuCard[] {
  const cards: HwatuCard[] = [];
  for (let month = 1; cards.length < n && month <= 6; month++) {
    for (const index of [2, 3]) {
      if (cards.length >= n) break;
      cards.push({ month, index });
    }
  }
  if (cards.length < n) {
    throw new Error(`distinctPi: ${n}장을 만들 수 없음`);
  }
  return cards;
}

describe("scoreGoStopHand - 고스톱 카테고리 합산 집계", () => {
  it("빈 배열은 모든 항목 0, total 0", () => {
    expect(scoreGoStopHand([])).toEqual({
      gwang: 0,
      yeol: 0,
      tti: 0,
      pi: 0,
      total: 0,
    });
  });

  it("광 3장(비광 미포함)만 있으면 gwang=3 이고 다른 항목 0, total=3", () => {
    const result = scoreGoStopHand(GWANG_3_NO_BI);
    expect(result).toEqual({
      gwang: 3,
      yeol: 0,
      tti: 0,
      pi: 0,
      total: 3,
    });
    expect(result.total).toBe(scoreGwang(GWANG_3_NO_BI));
  });

  it("열끗만 있는 손은 yeol 항목만 반영되고 total 일치(고도리 3장 포함 5장 = 6)", () => {
    const result = scoreGoStopHand(YEOL_5_GODORI);
    expect(result.yeol).toBe(6);
    expect(result.gwang).toBe(0);
    expect(result.tti).toBe(0);
    expect(result.pi).toBe(0);
    expect(result.total).toBe(6);
  });

  it("띠만 있는 손은 tti 항목만 반영되고 total 일치(홍단 3장 포함 5장 = 4)", () => {
    const result = scoreGoStopHand(TTI_5_HONGDAN);
    expect(result.tti).toBe(4);
    expect(result.gwang).toBe(0);
    expect(result.yeol).toBe(0);
    expect(result.pi).toBe(0);
    expect(result.total).toBe(4);
  });

  it("광·열끗·띠·피가 섞인 손: 각 항목이 개별 score 함수 결과와 동일하고 total = 합", () => {
    const hand: HwatuCard[] = [
      ...GWANG_3_NO_BI,
      ...YEOL_5_GODORI,
      ...TTI_5_HONGDAN,
      ...distinctPi(10),
    ];
    const result = scoreGoStopHand(hand);

    expect(result.gwang).toBe(scoreGwang(hand));
    expect(result.yeol).toBe(scoreYeol(hand));
    expect(result.tti).toBe(scoreTti(hand));
    expect(result.pi).toBe(scorePi(hand));
    expect(result.total).toBe(
      result.gwang + result.yeol + result.tti + result.pi,
    );

    // 구체 기대값 잠금: 광 3 + 열끗 6 + 띠 4 + 피 1 = 14
    expect(result).toEqual({ gwang: 3, yeol: 6, tti: 4, pi: 1, total: 14 });
  });

  it("피 경계값이 개별 함수 규칙과 일치한다(9장=0, 10장=1)", () => {
    expect(scoreGoStopHand(distinctPi(9)).pi).toBe(0);
    expect(scoreGoStopHand(distinctPi(9)).total).toBe(0);
    expect(scoreGoStopHand(distinctPi(10)).pi).toBe(1);
    expect(scoreGoStopHand(distinctPi(10)).total).toBe(1);
  });

  it("유효하지 않은 카드가 섞이면 위임 함수에서 throw", () => {
    expect(() => scoreGoStopHand([{ month: 13, index: 0 }])).toThrow();
    expect(() => scoreGoStopHand([{ month: 1, index: 9 }])).toThrow();
  });

  it("입력 배열/원소를 변형하지 않는다(불변)", () => {
    const hand: HwatuCard[] = [
      ...GWANG_3_NO_BI,
      ...YEOL_5_GODORI,
      ...TTI_5_HONGDAN,
      ...distinctPi(10),
    ];
    const snapshot = hand.map((c) => ({ ...c }));
    scoreGoStopHand(hand);
    expect(hand).toEqual(snapshot);
    expect(hand.length).toBe(snapshot.length);
  });
});

describe("scoreGoStopTotal - 총점 편의 함수", () => {
  it("빈 배열은 0", () => {
    expect(scoreGoStopTotal([])).toBe(0);
  });

  it("scoreGoStopTotal(cards) === scoreGoStopHand(cards).total", () => {
    const hands: HwatuCard[][] = [
      [],
      GWANG_3_NO_BI,
      YEOL_5_GODORI,
      TTI_5_HONGDAN,
      [...GWANG_3_NO_BI, ...YEOL_5_GODORI, ...TTI_5_HONGDAN, ...distinctPi(10)],
    ];
    for (const hand of hands) {
      expect(scoreGoStopTotal(hand)).toBe(scoreGoStopHand(hand).total);
    }
  });
});
