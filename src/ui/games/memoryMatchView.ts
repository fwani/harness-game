// Presentation helpers for the 메모리(짝 맞추기·Concentration) screen. Pure functions only —
// 카드 한 장의 표시(값 기호·상태 라벨·선택 가능 여부)·진행 상태 문구(시도 수·완성/남은 짝)·
// 클리어 문구를 React/DOM에서 분리해 단위 테스트할 수 있게 한다. 셔플·두 장 뒤집기·짝 판정·
// 클리어 종료 규칙은 application(playMemory)/domain(memoryMatch)을 호출해 수행하며 여기서
// 재구현하지 않는다(표시용 변환, 입력 불변).
import type { CardStatus, MemoryCard } from "../../domain/memoryMatch";

/**
 * 카드 값(0-기반)을 색에 의존하지 않는 기호 텍스트로 변환한다.
 * 팔레트를 벗어나는 값은 `#N`(1-기반 숫자)으로 안전하게 대체한다 — 색이 아니라
 * 항상 서로 다른 텍스트로 짝을 구분하기 위함이다.
 */
export const MEMORY_SYMBOLS = [
  "🍎",
  "🍌",
  "🍇",
  "🍒",
  "🍋",
  "🍉",
  "🥝",
  "🍑",
  "🫐",
  "🥥",
  "🍍",
  "🍓",
];

export function memoryCardLabel(value: number): string {
  return MEMORY_SYMBOLS[value] ?? `#${value + 1}`;
}

/** 한 카드를 화면에 어떻게 그릴지(색 비의존: 값 기호 + 상태 라벨). */
export interface MemoryCardView {
  /** 앞면에 보일 값 기호. 덮인(down) 카드는 값을 숨겨 "". */
  content: string;
  /** 스크린리더용/색 비의존 상태 라벨. */
  ariaLabel: string;
  /** 색이 아니라 상태로 구분하기 위한 분류(스타일 클래스/판정용). */
  status: CardStatus;
  /** 지금 클릭(뒤집기)할 수 있는 칸인지(덮인 카드만 선택 가능). */
  selectable: boolean;
}

/**
 * 한 카드의 표시 정보를 만든다(순수·결정적, 입력 불변).
 * - down: 값 숨김("덮인 카드"), 선택 가능.
 * - up: 값 노출("뒤집힌 카드"), 판정 대기라 선택 불가.
 * - matched: 값 노출("짝 완성"), 선택 불가.
 * 색만이 아니라 기호·상태 라벨로 구분한다.
 */
export function memoryCardView(card: MemoryCard, index: number): MemoryCardView {
  const where = `${index + 1}번 카드`;
  const symbol = memoryCardLabel(card.value);
  if (card.status === "matched") {
    return {
      content: symbol,
      ariaLabel: `${where} 짝 완성 ${symbol}`,
      status: "matched",
      selectable: false,
    };
  }
  if (card.status === "up") {
    return {
      content: symbol,
      ariaLabel: `${where} 뒤집힌 카드 ${symbol}`,
      status: "up",
      selectable: false,
    };
  }
  return { content: "", ariaLabel: `${where} 덮인 카드`, status: "down", selectable: true };
}

/**
 * 진행 상태 문구(시도 수·완성한 짝·남은 짝)를 만든다(순수·결정적).
 * - pairCount가 양의 정수가 아니면 throw(표시 계산이 음수가 되지 않도록 방어).
 */
export function memoryProgressLabel(
  attempts: number,
  matchedPairs: number,
  pairCount: number,
): string {
  if (!Number.isInteger(pairCount) || pairCount < 1) {
    throw new Error(`memoryProgressLabel: pairCount must be a positive integer, got ${pairCount}`);
  }
  const remaining = pairCount - matchedPairs;
  return `시도 ${attempts}회 · 완성한 짝 ${matchedPairs}/${pairCount} · 남은 짝 ${remaining}`;
}

/** 진행 상태 구분(클리어·진행 중). */
export type MemoryStatusKind = "clear" | "playing";

export interface MemoryStatus {
  kind: MemoryStatusKind;
  message: string;
}

/**
 * 클리어(모든 짝 완성)·진행 중을 명확히 구분해 플레이어용 한국어 상태 메시지를 만든다
 * (순수·결정적). over면 시도 수와 함께 클리어를 .outcome로 표시한다.
 */
export function describeMemoryStatus(
  over: boolean,
  attempts: number,
  pairCount: number,
): MemoryStatus {
  if (over) {
    return {
      kind: "clear",
      message: `🎉 ${pairCount}쌍을 모두 맞췄습니다! 시도 ${attempts}회 만에 클리어!`,
    };
  }
  return { kind: "playing", message: "카드 두 장을 뒤집어 같은 그림의 짝을 찾으세요." };
}
