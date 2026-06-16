// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
}

const SUITS: readonly Suit[] = ["spades", "hearts", "diamonds", "clubs"];

const RANKS: readonly Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/**
 * 비교용 랭크 정수값(에이스 하이). 2=2 … 10=10, J=11, Q=12, K=13, A=14.
 */
const RANK_VALUES: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/** 4 suit × 13 rank = 52장의 표준 트럼프 덱을 만든다(중복 없음, 셔플하지 않음). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** 비교용 랭크 정수값을 반환한다(에이스 하이: A=14, K=13 … 2=2). */
export function rankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

/**
 * 두 카드를 랭크 기준으로 비교한다(suit는 무시).
 * a가 작으면 음수, 같으면 0, 크면 양수를 반환한다.
 */
export function compareCards(a: Card, b: Card): number {
  return rankValue(a.rank) - rankValue(b.rank);
}
