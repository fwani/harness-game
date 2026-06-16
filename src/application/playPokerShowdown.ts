// Application layer: orchestrates a single 5-card poker showdown. Depends on domain only.
import { createDeck, type Card } from "../domain/card";
import { findPokerWinners } from "../domain/pokerHand";
import { deal, shuffle, type RandomSource } from "./dealCards";

export interface PokerShowdownResult {
  /** players명에게 분배된 5장 손패(길이 players, 각 길이 5) */
  hands: Card[][];
  /** 가장 강한 핸드를 가진 플레이어 인덱스(동률이면 공동 우승 인덱스 오름차순) */
  winners: number[];
}

/**
 * 표준 52장 덱을 rng로 셔플해 players명에게 5장씩 나눠주고 승자(들)를 가린다(불변·결정적).
 * - players < 2 이면 throw(쇼다운은 최소 2명).
 * - players * 5 > 52 (즉 players > 10) 이면 throw(카드 부족) — deal이 이미 검증.
 * - 동일 rng 시퀀스면 동일 결과(테스트 가능).
 */
export function playPokerShowdown(
  rng: RandomSource,
  players: number,
): PokerShowdownResult {
  if (!Number.isInteger(players) || players < 2) {
    throw new Error(`players must be an integer >= 2, got ${players}`);
  }
  const deck = createDeck();
  const shuffled = shuffle(deck, rng);
  const { hands } = deal(shuffled, players, 5);
  const winners = findPokerWinners(hands);
  return { hands, winners };
}
