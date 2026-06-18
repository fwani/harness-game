// Application layer: orchestrates a single baccarat round (player vs banker). Depends on domain only.
import { createDeck, type Card } from "../domain/card";
import {
  evaluateBaccaratHand,
  settleBaccaratBet,
  type BaccaratBetSide,
  type BaccaratOutcome,
  type BaccaratSettlement,
} from "../domain/baccarat";
import { shuffle, type RandomSource } from "./dealCards";

// 한 판 승자 타입은 도메인(baccarat.ts)이 단일 소스다. 기존 import 경로 호환을 위해 재노출한다.
export type { BaccaratOutcome };

export interface BaccaratRoundResult {
  /** 플레이어 최종 손패(2장 또는 3장) */
  playerHand: Card[];
  /** 뱅커 최종 손패(2장 또는 3장) */
  bankerHand: Card[];
  /** 플레이어 최종 끗수(0~9) */
  playerScore: number;
  /** 뱅커 최종 끗수(0~9) */
  bankerScore: number;
  /** 한 판 승자 판정 */
  outcome: BaccaratOutcome;
}

/** 카드 한 장의 바카라 끗수값(A=1, 2~9=숫자, 10/J/Q/K=0). 단일 카드는 score가 곧 끗수값이다. */
function cardPip(card: Card): number {
  return evaluateBaccaratHand([card]).score;
}

/**
 * 뱅커가 플레이어의 세 번째 카드 끗수값(p3)에 따라 세 번째 카드를 받는지 판정한다(표준 타블로).
 * - 0~2: 받음
 * - 3: p3 !== 8 이면 받음
 * - 4: p3가 2~7이면 받음
 * - 5: p3가 4~7이면 받음
 * - 6: p3가 6~7이면 받음
 * - 7: 스탠드
 */
function bankerDrawsAfterPlayerThird(bankerScore: number, p3: number): boolean {
  switch (bankerScore) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return p3 !== 8;
    case 4:
      return p3 >= 2 && p3 <= 7;
    case 5:
      return p3 >= 4 && p3 <= 7;
    case 6:
      return p3 >= 6 && p3 <= 7;
    default:
      return false; // 7 이상은 스탠드
  }
}

/**
 * 표준 52장 덱을 rng로 셔플해 플레이어 vs 뱅커 한 판을 punto banco 타블로 규칙으로 진행한다(불변·결정적).
 * - 플레이어 먼저 번갈아 2장씩 나눈다(플레이어 idx 0,2 / 뱅커 idx 1,3). 나머지는 draw 큐.
 * - 내추럴(2장으로 8 또는 9): 양쪽 모두 추가로 뽑지 않고 즉시 비교한다.
 * - 플레이어 규칙: 0~5면 세 번째 카드를 받고, 6~7이면 스탠드.
 * - 뱅커 규칙: 플레이어가 스탠드면 0~5 드로우·6~7 스탠드, 플레이어가 세 번째 카드를 받았으면 타블로에 따른다.
 * - 최종 끗수가 큰 쪽이 승(동점이면 tie).
 * - 카드를 받아야 하는데 draw가 비면 throw(덱 소진). 동일 rng 시퀀스면 항상 동일 결과.
 */
export function playBaccaratRound(rng: RandomSource): BaccaratRoundResult {
  const shuffled = shuffle(createDeck(), rng);
  // 플레이어 먼저 번갈아 2장씩: 플레이어 idx 0,2 / 뱅커 idx 1,3.
  const playerHand: Card[] = [shuffled[0]!, shuffled[2]!];
  const bankerHand: Card[] = [shuffled[1]!, shuffled[3]!];
  const draw = shuffled.slice(4);
  let drawn = 0;

  const takeCard = (): Card => {
    if (drawn >= draw.length) {
      throw new Error("playBaccaratRound: 덱이 소진되어 카드를 더 뽑을 수 없다");
    }
    const card = draw[drawn]!;
    drawn += 1;
    return card;
  };

  const playerInitial = evaluateBaccaratHand(playerHand);
  const bankerInitial = evaluateBaccaratHand(bankerHand);

  // 내추럴이면 양쪽 모두 추가로 뽑지 않고 즉시 비교한다.
  if (!playerInitial.isNatural && !bankerInitial.isNatural) {
    let playerThird: Card | null = null;
    // 플레이어 규칙: 0~5 드로우, 6~7 스탠드.
    if (playerInitial.score <= 5) {
      playerThird = takeCard();
      playerHand.push(playerThird);
    }

    // 뱅커 규칙.
    if (playerThird === null) {
      // 플레이어 스탠드: 뱅커는 0~5 드로우, 6~7 스탠드.
      if (bankerInitial.score <= 5) {
        bankerHand.push(takeCard());
      }
    } else if (bankerDrawsAfterPlayerThird(bankerInitial.score, cardPip(playerThird))) {
      bankerHand.push(takeCard());
    }
  }

  const playerScore = evaluateBaccaratHand(playerHand).score;
  const bankerScore = evaluateBaccaratHand(bankerHand).score;

  let outcome: BaccaratOutcome;
  if (playerScore > bankerScore) {
    outcome = "player";
  } else if (bankerScore > playerScore) {
    outcome = "banker";
  } else {
    outcome = "tie";
  }

  return { playerHand, bankerHand, playerScore, bankerScore, outcome };
}

export interface BaccaratWagerResult {
  /** 한 판 타블로 진행 결과(끗수·손패·승자). */
  result: BaccaratRoundResult;
  /** 베팅 측·베팅액 기준 표준 배당 정산(순손익·push). */
  settlement: BaccaratSettlement;
}

/**
 * 이미 진행된 한 판 결과(result)에 베팅 측·베팅액 정산을 결합하는 순수 헬퍼(불변).
 * RNG는 playBaccaratRound에서만 쓰고, 정산은 결정적이다. domain의 settleBaccaratBet에 위임한다.
 */
export function resolveBaccaratWager(
  side: BaccaratBetSide,
  bet: number,
  result: BaccaratRoundResult,
): BaccaratWagerResult {
  return { result, settlement: settleBaccaratBet(side, bet, result.outcome) };
}
