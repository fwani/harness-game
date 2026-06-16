// Application layer: orchestrates a single Sutda round (two players, two cards each).
// Depends on domain only. 기존 playBaccaratRound/playPokerShowdown와 동일한 패턴:
// 덱 셔플 → 분배 → 도메인 규칙(evaluate/compare)으로 승자 판정. 부수효과 없음.
import { createHwatuDeck, type HwatuCard } from "../domain/hwatu";
import {
  evaluateSutdaHand,
  compareSutdaHands,
  type SutdaHandRank,
} from "../domain/sutda";
import { shuffle, deal, type RandomSource } from "./dealCards";

export interface SutdaRoundResult {
  /** A의 2장 */
  a: [HwatuCard, HwatuCard];
  /** B의 2장 */
  b: [HwatuCard, HwatuCard];
  /** evaluateSutdaHand(a[0], a[1]) */
  aRank: SutdaHandRank;
  /** evaluateSutdaHand(b[0], b[1]) */
  bRank: SutdaHandRank;
  /** compareSutdaHands 부호로 결정: 양수면 "a", 음수면 "b", 0이면 "draw" */
  result: "a" | "b" | "draw";
}

/**
 * 섯다(Sutda)는 화투 month 1~10만 사용한다(11·12월 제외 — sutda.ts의 validatePip가 1~10 강제).
 * createHwatuDeck()(48장)에서 month 1~10만 남긴 40장 섯다 덱을 만든다(불변, 결정적).
 */
function createSutdaDeck(): HwatuCard[] {
  return createHwatuDeck().filter((card) => card.month >= 1 && card.month <= 10);
}

/**
 * 섯다 덱(40장)을 rng로 셔플해 2인에게 2장씩 분배하고 패 등급을 비교해 승자를 가린다(불변·결정적).
 * - shuffle(deck, rng) → deal(shuffled, 2, 2)로 기존 dealCards 규약 그대로 분배한다
 *   (라운드로빈: A = shuffled[0]·shuffled[2], B = shuffled[1]·shuffled[3]).
 * - 각 손패를 evaluateSutdaHand로 판정하고 compareSutdaHands로 비교한다.
 * - 양수면 "a", 음수면 "b", 0이면 "draw". 동일 rng 시퀀스면 항상 동일 결과.
 * - 입력 덱/카드를 변형하지 않는다. rng만으로 결과가 완전히 결정된다.
 */
export function playSutdaRound(rng: RandomSource): SutdaRoundResult {
  const shuffled = shuffle(createSutdaDeck(), rng);
  const { hands } = deal(shuffled, 2, 2);

  const a: [HwatuCard, HwatuCard] = [hands[0]![0]!, hands[0]![1]!];
  const b: [HwatuCard, HwatuCard] = [hands[1]![0]!, hands[1]![1]!];

  const aRank = evaluateSutdaHand(a[0], a[1]);
  const bRank = evaluateSutdaHand(b[0], b[1]);

  const cmp = compareSutdaHands(aRank, bRank);
  const result: "a" | "b" | "draw" = cmp > 0 ? "a" : cmp < 0 ? "b" : "draw";

  return { a, b, aRank, bRank, result };
}
