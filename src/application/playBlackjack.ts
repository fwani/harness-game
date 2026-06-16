// Application layer: orchestrates a single blackjack round (player vs dealer). Depends on domain only.
import { createDeck, type Card } from "../domain/card";
import { evaluateBlackjackHand } from "../domain/blackjack";
import { shuffle, type RandomSource } from "./dealCards";

export type BlackjackOutcome = "player" | "dealer" | "push";

export interface BlackjackRoundResult {
  /** 플레이어 최종 손패(첫 2장 + 히트한 카드 순서대로) */
  playerHand: Card[];
  /** 딜러 최종 손패 */
  dealerHand: Card[];
  /** 한 판 승자 판정 */
  outcome: BlackjackOutcome;
}

/**
 * 17 미만이면 히트, 17 이상(소프트 17 포함)이면 스탠드하는 하우스 룰로 한 손패를 진행한다.
 * - hand에서 시작해 draw 큐(rest)의 앞에서부터 카드를 받는다.
 * - 버스트되면 즉시 중단한다.
 * - 카드를 받아야 하는데 draw가 비어 있으면 throw(덱 소진).
 * 입력 배열을 변형하지 않고, 진행된 손패와 소비한 카드 수를 반환한다.
 */
function playHand(
  hand: readonly Card[],
  draw: readonly Card[],
): { hand: Card[]; used: number } {
  const result = [...hand];
  let used = 0;
  while (true) {
    const value = evaluateBlackjackHand(result);
    if (value.isBust || value.total >= 17) break;
    if (used >= draw.length) {
      throw new Error("playBlackjackRound: 덱이 소진되어 카드를 더 뽑을 수 없다");
    }
    result.push(draw[used]!);
    used += 1;
  }
  return { hand: result, used };
}

/**
 * 표준 52장 덱을 rng로 셔플해 플레이어 vs 딜러 한 판을 끝까지 진행하고 승자를 가린다(불변·결정적).
 * - 플레이어 2장, 딜러 2장을 번갈아 나눈다(플레이어 먼저).
 * - 플레이어/딜러 모두 17 미만 히트, 17 이상(소프트 17 포함) 스탠드. 버스트되면 즉시 중단.
 * - 플레이어가 버스트면 딜러는 진행하지 않는다.
 * - 정산: 플레이어 버스트→dealer, 딜러 버스트→player, 양쪽 내추럴 블랙잭→push,
 *   한쪽만 내추럴 블랙잭→그쪽 승, 그 외 total이 큰 쪽 승(동률 push).
 * - 동일 rng 시퀀스면 항상 동일 결과. rng/덱을 파괴적으로 변형하지 않는다.
 */
export function playBlackjackRound(rng: RandomSource): BlackjackRoundResult {
  const shuffled = shuffle(createDeck(), rng);
  // 플레이어 먼저 번갈아 2장씩: 플레이어 idx 0,2 / 딜러 idx 1,3.
  const playerInitial: Card[] = [shuffled[0]!, shuffled[2]!];
  const dealerInitial: Card[] = [shuffled[1]!, shuffled[3]!];
  const draw = shuffled.slice(4);

  const player = playHand(playerInitial, draw);
  const playerValue = evaluateBlackjackHand(player.hand);

  // 플레이어가 버스트면 딜러는 진행하지 않는다.
  if (playerValue.isBust) {
    return {
      playerHand: player.hand,
      dealerHand: dealerInitial,
      outcome: "dealer",
    };
  }

  const dealer = playHand(dealerInitial, draw.slice(player.used));
  const dealerValue = evaluateBlackjackHand(dealer.hand);

  let outcome: BlackjackOutcome;
  if (dealerValue.isBust) {
    outcome = "player";
  } else if (playerValue.isBlackjack && dealerValue.isBlackjack) {
    outcome = "push";
  } else if (playerValue.isBlackjack) {
    outcome = "player";
  } else if (dealerValue.isBlackjack) {
    outcome = "dealer";
  } else if (playerValue.total > dealerValue.total) {
    outcome = "player";
  } else if (dealerValue.total > playerValue.total) {
    outcome = "dealer";
  } else {
    outcome = "push";
  }

  return { playerHand: player.hand, dealerHand: dealer.hand, outcome };
}
