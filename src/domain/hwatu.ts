// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

/** 화투 한 장: month(1~12)와 그 달 안에서의 index(0~3)로 식별한다. */
export interface HwatuCard {
  /** 월(1~12) */
  month: number;
  /** 같은 달 4장 중 위치(0~3) */
  index: number;
}

/** 12개월(1~12) */
const MONTHS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 같은 달 안에서의 위치(0~3) */
const INDICES: readonly number[] = [0, 1, 2, 3];

/** 12개월 × 4장 = 48장의 화투 덱을 만든다(중복 없음, 셔플하지 않음). month 오름차순, 그 안에서 index 오름차순. */
export function createHwatuDeck(): HwatuCard[] {
  const deck: HwatuCard[] = [];
  for (const month of MONTHS) {
    for (const index of INDICES) {
      deck.push({ month, index });
    }
  }
  return deck;
}

/** 유효한 화투 카드인지 검증한다(month는 1~12 정수, index는 0~3 정수). */
export function isValidHwatuCard(card: HwatuCard): boolean {
  return (
    Number.isInteger(card.month) &&
    card.month >= 1 &&
    card.month <= 12 &&
    Number.isInteger(card.index) &&
    card.index >= 0 &&
    card.index <= 3
  );
}

/** 두 카드가 같은 달(month)인지 비교한다 — 섯다의 땡/끗 등 한국 카드 게임 판정의 공통 토대. index는 무시한다. */
export function isSameMonth(a: HwatuCard, b: HwatuCard): boolean {
  return a.month === b.month;
}
