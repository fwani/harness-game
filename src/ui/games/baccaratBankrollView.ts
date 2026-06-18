// Presentation helpers for the Baccarat (바카라) 칩 뱅크롤 + 베팅액 정산 표시. Pure functions only —
// 잔고·베팅액 검증·정산 후 잔고 계산·정산 레이블을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 배당 규칙은 domain(settleBaccaratBet)을 재사용하며 여기서 재구현하지 않는다. 부수효과·난수 없음(입력 불변).
import type { BaccaratSettlement } from "../../domain/baccarat";

/** 새 게임 시작 시 지급되는 가상 칩 시작 잔고. 실거래·외부 인증 없는 세션/로컬 값. */
export const STARTING_BANKROLL = 1000;

/** 베팅액 프리셋(칩). 잔고를 초과하는 칩은 UI에서 비활성화한다. */
export const BET_PRESETS = [10, 50, 100, 500] as const;

/** 베팅액 기본값(가장 작은 프리셋). */
export const DEFAULT_BET_AMOUNT = 10;

/** 베팅액이 유효한가: 양의 정수이며 현재 잔고 이하. */
export function isValidBet(bet: number, bankroll: number): boolean {
  return Number.isInteger(bet) && bet > 0 && bet <= bankroll;
}

/**
 * 임의 입력을 안전한 베팅액으로 정규화한다(순수·결정적, 입력 불변).
 * - 잔고가 1 미만이면 0(베팅 불가).
 * - 그 외에는 내림한 정수를 [1, 잔고] 범위로 클램프. 유효 숫자가 아니면 잔고로 상한된 기본값.
 */
export function clampBet(input: unknown, bankroll: number): number {
  if (bankroll < 1) {
    return 0;
  }
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) {
    return Math.min(DEFAULT_BET_AMOUNT, bankroll);
  }
  const floored = Math.floor(n);
  if (floored < 1) {
    return 1;
  }
  return Math.min(floored, bankroll);
}

/** 정산 후 갱신된 잔고. net이 순손익(push는 0)이므로 잔고에 그대로 더한다. */
export function nextBankroll(bankroll: number, settlement: BaccaratSettlement): number {
  return bankroll + settlement.net;
}

/** 잔고 소진(더 이상 베팅 불가) 여부. 1칩도 못 걸면 리셋이 필요하다. */
export function isBankrupt(bankroll: number): boolean {
  return bankroll < 1;
}

/**
 * 정산 결과를 색 비의존 레이블(기호+텍스트+금액)로 표기한다.
 * - push: 무효 환원(잔고 변화 없음)
 * - net>0: 획득 금액
 * - net<0: 손실 금액
 */
export function baccaratSettlementLabel(settlement: BaccaratSettlement): string {
  if (settlement.push) {
    return "🤝 타이 — 베팅 무효 환원(푸시) · 잔고 변화 없음";
  }
  if (settlement.net > 0) {
    return `🎉 +${settlement.net} 칩 획득`;
  }
  return `😢 ${settlement.net} 칩 손실`;
}
