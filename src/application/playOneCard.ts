// Application layer: 원카드(One Card) 무작위 한 판 조립 + 드로우더미 소진 시 재셔플 + CPU 한 턴 진행.
// domain(oneCard, card)과 RandomSource/shuffle/deal(dealCards) 포트에만 의존한다. infrastructure/ui 의존 금지.
// 규칙·합법성·승자 판정은 도메인 함수(isLegalOneCardPlay/applyOneCardPlay/drawOneCard/findOneCardWinner/
// legalOneCardPlays/topDiscard/createOneCardGame)만 호출하고 재구현하지 않는다.
// 무작위는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼와 동일 패턴).
import { createDeck, type Card } from "../domain/card";
import {
  applyOneCardPlay,
  createOneCardGame,
  drawOneCard,
  findOneCardWinner,
  legalOneCardPlays,
  type OneCardState,
} from "../domain/oneCard";
import { deal, shuffle, type RandomSource } from "./dealCards";

/** 표준 트럼프 덱 장수(원카드는 52장 1덱으로 시작한다). */
const DECK_SIZE = 52;

function cloneCard(card: Card): Card {
  return { suit: card.suit, rank: card.rank };
}

/** 손패를 가변 배열(Card[][])로 깊은 복사한다(도메인 createOneCardGame 입력용). */
function cloneHands(hands: ReadonlyArray<ReadonlyArray<Card>>): Card[][] {
  return hands.map((hand) => hand.map(cloneCard));
}

/**
 * 무작위 시작 게임을 조립한다(결정적: 같은 random 시퀀스·같은 입력이면 항상 동일 결과).
 * createDeck()으로 52장 덱을 만들고 shuffle(deck, random)로 섞은 뒤 deal로 분배하고,
 * 남은 더미의 맨 앞 1장을 버림더미 첫 장, 나머지를 드로우더미로 두어 createOneCardGame에 위임한다.
 * 현재 차례는 항상 0번 플레이어로 시작한다.
 * - playerCount는 2 이상의 정수, handSize는 1 이상의 정수여야 한다(아니면 한국어 사유로 throw).
 * - 버림더미 1장을 포함해 카드가 부족하면(playerCount*handSize + 1 > 52) 한국어 사유로 throw.
 * 입력 random 외에 외부 상태를 변형하지 않는다(불변).
 */
export function startOneCardGame(
  playerCount: number,
  handSize: number,
  random: RandomSource,
): OneCardState {
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    throw new Error(
      `원카드는 2명 이상의 플레이어가 필요합니다(받은 값: ${playerCount}).`,
    );
  }
  if (!Number.isInteger(handSize) || handSize < 1) {
    throw new Error(
      `원카드 손패는 1장 이상이어야 합니다(받은 값: ${handSize}).`,
    );
  }
  if (playerCount * handSize + 1 > DECK_SIZE) {
    throw new Error(
      `카드가 부족합니다: ${playerCount}명에게 ${handSize}장씩 분배하고 버림더미 1장을 두려면 ` +
        `${playerCount * handSize + 1}장이 필요하지만 덱은 ${DECK_SIZE}장뿐입니다.`,
    );
  }
  const shuffled = shuffle(createDeck(), random);
  const { hands, rest } = deal(shuffled, playerCount, handSize);
  const top = rest[0];
  if (top === undefined) {
    // 위 카드 부족 검증을 통과하면 도달하지 않지만, 타입 안전을 위해 방어한다.
    throw new Error("버림더미 첫 장을 둘 카드가 없습니다.");
  }
  const discardPile = [cloneCard(top)];
  const drawPile = rest.slice(1).map(cloneCard);
  return createOneCardGame(hands, drawPile, discardPile, 0);
}

/**
 * 드로우더미가 비었으면 버림더미 맨 위 1장만 남기고 나머지를 섞어 드로우더미로 되돌린 새 상태를 반환한다.
 * - 드로우더미에 카드가 남아 있으면 그대로(입력 state) 반환한다.
 * - 재셔플 후에도 뽑을 카드가 없으면(버림더미도 1장뿐) 그대로(입력 state) 반환한다(호출 측이 패스 처리).
 * 결정적: 같은 random 시퀀스·같은 입력이면 항상 동일 결과. 입력 state는 변형하지 않는다(불변).
 */
export function reshuffleIfNeeded(
  state: OneCardState,
  random: RandomSource,
): OneCardState {
  if (state.drawPile.length > 0) {
    return state;
  }
  // 버림더미 맨 위(맨 뒤) 1장만 남기고 나머지를 드로우더미로 재셔플한다.
  const discardCount = state.discardPile.length;
  if (discardCount <= 1) {
    return state; // 되돌릴 카드가 없다 — 호출 측이 패스 처리.
  }
  const topCard = state.discardPile[discardCount - 1]!;
  const toReshuffle = state.discardPile.slice(0, discardCount - 1);
  const newDrawPile = shuffle(toReshuffle, random).map(cloneCard);
  return createOneCardGame(
    cloneHands(state.hands),
    newDrawPile,
    [cloneCard(topCard)],
    state.currentPlayer,
  );
}

/** CPU 한 턴에 실제로 한 동작. */
export type OneCardTurnAction =
  | { kind: "play"; card: Card }
  | { kind: "draw"; card: Card }
  | { kind: "pass" }; // 재셔플 후에도 뽑을 카드 없음

/** CPU 한 턴 진행 결과(다음 상태 + 무엇을 했는지). */
export interface OneCardTurnResult {
  state: OneCardState;
  action: OneCardTurnAction;
}

/**
 * 현재 플레이어(CPU) 한 턴을 진행한다(입력 state 불변, random 외 외부 상태 비변형).
 * - 낼 수 있으면(legalOneCardPlays가 비어있지 않으면) 그중 하나를 random으로 골라 applyOneCardPlay → "play".
 * - 낼 게 없으면 reshuffleIfNeeded 후 drawOneCard로 한 장 뽑는다 → "draw"
 *   (뽑은 카드가 즉시 합법이어도 이번 턴엔 내지 않고 턴 종료 — 단순 규칙).
 * - 재셔플 후에도 뽑을 카드가 없으면 상태 그대로 반환 → "pass"(턴 미진행, 호출 측이 처리).
 * - 이미 승자가 있는 상태(findOneCardWinner !== null)에서 호출되면 한국어 사유로 throw.
 * 규칙·합법성은 도메인에 위임하고 무작위 선택만 이 레이어에서 처리한다. 결정적(같은 random·입력 → 같은 결과).
 */
export function playOneCardCpuTurn(
  state: OneCardState,
  random: RandomSource,
): OneCardTurnResult {
  if (findOneCardWinner(state) !== null) {
    throw new Error("이미 승자가 결정된 게임에서는 턴을 진행할 수 없습니다.");
  }
  const legal = legalOneCardPlays(state);
  if (legal.length > 0) {
    const index = random.nextInt(legal.length);
    if (!Number.isInteger(index) || index < 0 || index >= legal.length) {
      throw new Error(`RandomSource returned out-of-range index: ${index}`);
    }
    const card = legal[index]!;
    return { state: applyOneCardPlay(state, card), action: { kind: "play", card } };
  }
  // 낼 게 없다 — 필요하면 재셔플 후 한 장 뽑는다.
  const reshuffled = reshuffleIfNeeded(state, random);
  if (reshuffled.drawPile.length === 0) {
    return { state: reshuffled, action: { kind: "pass" } };
  }
  const drawnCard = cloneCard(reshuffled.drawPile[0]!);
  return { state: drawOneCard(reshuffled), action: { kind: "draw", card: drawnCard } };
}
