// Application layer: orchestrates a single High Card round. Depends on domain only.
import { createDeck, type Card } from "../domain/card";
import { compareHighCard, type HighCardResult } from "../domain/highCard";
import { deal, shuffle, type RandomSource } from "./dealCards";

export interface HighCardRoundResult {
  /** 플레이어 A에게 분배된 카드 */
  a: Card;
  /** 플레이어 B에게 분배된 카드 */
  b: Card;
  /** "first" = A 승, "second" = B 승, "draw" = 무승부 */
  result: HighCardResult;
}

/**
 * 표준 52장 덱을 rng로 셔플해 두 플레이어에게 한 장씩 나눠주고 승자를 가린다(불변, 결정적).
 * 동일 rng 시퀀스면 동일 결과가 나와야 한다(테스트 가능).
 */
export function playHighCardRound(rng: RandomSource): HighCardRoundResult {
  const deck = createDeck();
  const shuffled = shuffle(deck, rng);
  const { hands } = deal(shuffled, 2, 1);
  const a = hands[0]![0]!;
  const b = hands[1]![0]!;
  return { a, b, result: compareHighCard(a, b) };
}
