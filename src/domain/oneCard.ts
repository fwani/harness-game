// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 원카드(One Card, 우노류)의 핵심 규칙: 버림더미 맨 위 카드와 같은 무늬(suit) 또는 숫자(rank) 내기,
// 낼 게 없으면 드로우더미에서 한 장 뽑기, 손패를 먼저 비우면 승리.
// 무작위 셔플·딜·CPU 착수·재셔플(드로우더미 소진)·UI 연동은 이 모듈 범위 밖이다(후속 application/UI 짝 이슈).
// 특수 카드(공격·스킵·리버스·조커 등) 효과도 범위 밖(후속 확장 이슈). 진행 방향은 시계 방향으로 고정.

import type { Card } from "./card";

/**
 * 원카드 진행 상태(불변으로 다룬다).
 * - hands[p]는 플레이어 p의 손패.
 * - drawPile은 뽑는 더미(맨 앞=다음 뽑을 카드).
 * - discardPile은 버림더미(맨 뒤=맨 위 카드).
 * - currentPlayer는 0..n-1 중 현재 차례.
 */
export interface OneCardState {
  readonly hands: ReadonlyArray<ReadonlyArray<Card>>;
  readonly drawPile: ReadonlyArray<Card>;
  readonly discardPile: ReadonlyArray<Card>;
  readonly currentPlayer: number;
}

function cloneCard(card: Card): Card {
  return { suit: card.suit, rank: card.rank };
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function nextPlayer(current: number, playerCount: number): number {
  return (current + 1) % playerCount;
}

function currentHand(state: OneCardState): ReadonlyArray<Card> {
  const hand = state.hands[state.currentPlayer];
  if (hand === undefined) {
    throw new Error(`현재 차례 인덱스가 손패 범위를 벗어났습니다: ${state.currentPlayer}`);
  }
  return hand;
}

/**
 * 손패/더미/현재 차례를 검증해 새 상태를 만든다(입력 깊은 복사로 외부 변형 격리).
 * - 플레이어는 2명 이상이어야 한다.
 * - discardPile은 비어 있지 않아야 한다(맨 위 카드 필요).
 * - currentPlayer는 유효한 정수 인덱스(0..n-1)여야 한다.
 * 위반 시 한국어 사유로 throw.
 */
export function createOneCardGame(
  hands: Card[][],
  drawPile: Card[],
  discardPile: Card[],
  currentPlayer: number,
): OneCardState {
  if (!Array.isArray(hands) || hands.length < 2) {
    throw new Error("원카드는 2명 이상의 플레이어가 필요합니다.");
  }
  if (!hands.every((hand) => Array.isArray(hand))) {
    throw new Error("각 플레이어의 손패는 배열이어야 합니다.");
  }
  if (discardPile.length === 0) {
    throw new Error("버림더미에는 맨 위 카드가 최소 한 장 있어야 합니다.");
  }
  if (!Number.isInteger(currentPlayer) || currentPlayer < 0 || currentPlayer >= hands.length) {
    throw new Error(`현재 차례 인덱스가 유효 범위(0..${hands.length - 1})를 벗어났습니다: ${currentPlayer}`);
  }
  return {
    hands: hands.map((hand) => hand.map(cloneCard)),
    drawPile: drawPile.map(cloneCard),
    discardPile: discardPile.map(cloneCard),
    currentPlayer,
  };
}

/** 버림더미 맨 위 카드를 반환한다. */
export function topDiscard(state: OneCardState): Card {
  const top = state.discardPile[state.discardPile.length - 1];
  if (top === undefined) {
    throw new Error("버림더미가 비어 있어 맨 위 카드를 구할 수 없습니다.");
  }
  return cloneCard(top);
}

/** 합법 내기 여부: 맨 위 카드와 무늬가 같거나 숫자가 같으면 낼 수 있다. */
export function isLegalOneCardPlay(top: Card, card: Card): boolean {
  return top.suit === card.suit || top.rank === card.rank;
}

/** 현재 플레이어 손패 중 낼 수 있는 카드 목록(원본 순서 유지). */
export function legalOneCardPlays(state: OneCardState): Card[] {
  const top = topDiscard(state);
  return currentHand(state)
    .filter((card) => isLegalOneCardPlay(top, card))
    .map(cloneCard);
}

/**
 * 현재 플레이어가 card를 내 버림더미 맨 위로 올리고 다음 플레이어로 턴을 넘긴 새 상태를 반환한다.
 * - 손패에 없는 카드, 불법(무늬/숫자 불일치) 내기는 조용히 무시하지 않고 throw.
 */
export function applyOneCardPlay(state: OneCardState, card: Card): OneCardState {
  const top = topDiscard(state);
  if (!isLegalOneCardPlay(top, card)) {
    throw new Error("버림더미 맨 위 카드와 무늬도 숫자도 일치하지 않아 낼 수 없습니다.");
  }
  const hand = currentHand(state);
  const index = hand.findIndex((c) => sameCard(c, card));
  if (index === -1) {
    throw new Error("현재 플레이어의 손패에 없는 카드는 낼 수 없습니다.");
  }
  const newHand = hand.filter((_, i) => i !== index).map(cloneCard);
  const newHands = state.hands.map((h, p) => (p === state.currentPlayer ? newHand : h.map(cloneCard)));
  return {
    hands: newHands,
    drawPile: state.drawPile.map(cloneCard),
    discardPile: [...state.discardPile.map(cloneCard), cloneCard(card)],
    currentPlayer: nextPlayer(state.currentPlayer, state.hands.length),
  };
}

/**
 * 드로우더미 맨 위 한 장을 현재 플레이어 손패에 넣고 다음 플레이어로 턴을 넘긴 새 상태를 반환한다.
 * - drawPile이 비어 있으면 throw(재셔플은 application 책임).
 */
export function drawOneCard(state: OneCardState): OneCardState {
  if (state.drawPile.length === 0) {
    throw new Error("드로우더미가 비어 있어 카드를 뽑을 수 없습니다.");
  }
  const drawn = state.drawPile[0];
  if (drawn === undefined) {
    throw new Error("드로우더미가 비어 있어 카드를 뽑을 수 없습니다.");
  }
  const newDrawPile = state.drawPile.slice(1).map(cloneCard);
  const newHands = state.hands.map((hand, p) =>
    p === state.currentPlayer
      ? [...hand.map(cloneCard), cloneCard(drawn)]
      : hand.map(cloneCard),
  );
  return {
    hands: newHands,
    drawPile: newDrawPile,
    discardPile: state.discardPile.map(cloneCard),
    currentPlayer: nextPlayer(state.currentPlayer, state.hands.length),
  };
}

/** 손패가 빈 플레이어 인덱스를 반환하고, 없으면 null(승자 없음). */
export function findOneCardWinner(state: OneCardState): number | null {
  const index = state.hands.findIndex((hand) => hand.length === 0);
  return index === -1 ? null : index;
}
