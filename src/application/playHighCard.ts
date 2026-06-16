// Application layer: orchestrates a single High Card round. Depends on domain only.
// 셔플한 덱에서 두 카드를 뽑아 랭크로 비교하는 한 판을 진행한다.
// 비교 규칙(에이스 하이·무늬 무시)은 도메인 highCard.ts에 있다.
import { createDeck, type Card } from "../domain/card";
import { compareHighCard, type HighCardResult } from "../domain/highCard";
import { shuffle, type RandomSource } from "./dealCards";

export interface HighCardRoundResult {
  /** 플레이어 a가 뽑은 카드. */
  a: Card;
  /** 플레이어 b가 뽑은 카드. */
  b: Card;
  /** a 기준 결과: "first"=a 승, "second"=b 승, "draw"=무승부. */
  result: HighCardResult;
}

/**
 * 52장 덱을 섞어 위에서 두 장을 뽑아(a, b) 랭크로 비교한 결과를 반환한다.
 * rng를 주입받아 결정적 테스트가 가능하다(불변: 덱은 매 판 새로 생성).
 */
export function playHighCardRound(rng: RandomSource): HighCardRoundResult {
  const deck = shuffle(createDeck(), rng);
  const a = deck[0]!;
  const b = deck[1]!;
  return { a, b, result: compareHighCard(a, b) };
}
