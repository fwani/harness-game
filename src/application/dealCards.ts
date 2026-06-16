// Application layer: deck shuffling and dealing. Depends on domain only.
import type { Card } from "../domain/card";

/** Port: 0 이상 maxExclusive 미만의 정수 난수 공급원. 구현은 infrastructure에 둔다. */
export interface RandomSource {
  /** 0 <= 반환값 < maxExclusive 인 정수. maxExclusive < 1 이면 throw. */
  nextInt(maxExclusive: number): number;
}

/**
 * Fisher–Yates로 섞은 새 배열을 반환한다(불변: 입력 cards는 변형하지 않는다).
 * 끝에서부터 i(>=1)마다 j = rng.nextInt(i + 1) (0 <= j <= i)를 뽑아 교환한다.
 * rng.nextInt를 사용해 결정적 테스트가 가능해야 한다.
 */
export function shuffle(cards: readonly Card[], rng: RandomSource): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i >= 1; i--) {
    const j = rng.nextInt(i + 1);
    if (j < 0 || j > i) {
      throw new Error(`RandomSource returned out-of-range index: ${j}`);
    }
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

export interface DealResult {
  /** players명에게 perPlayer장씩 나눈 손패(길이 players, 각 길이 perPlayer). */
  hands: Card[][];
  /** 남은 더미(딜 후 남은 카드). */
  rest: Card[];
}

/**
 * deck에서 players명에게 perPlayer장씩 라운드로빈으로 분배한다(불변).
 * - players < 1 또는 perPlayer < 0 이면 throw.
 * - players, perPlayer가 정수가 아니면 throw.
 * - players * perPlayer 가 deck.length 를 초과하면 throw(카드 부족).
 */
export function deal(
  deck: readonly Card[],
  players: number,
  perPlayer: number,
): DealResult {
  if (!Number.isInteger(players) || players < 1) {
    throw new Error(`players must be an integer >= 1, got ${players}`);
  }
  if (!Number.isInteger(perPlayer) || perPlayer < 0) {
    throw new Error(`perPlayer must be an integer >= 0, got ${perPlayer}`);
  }
  const needed = players * perPlayer;
  if (needed > deck.length) {
    throw new Error(
      `not enough cards: need ${needed}, have ${deck.length}`,
    );
  }
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let round = 0; round < perPlayer; round++) {
    for (let p = 0; p < players; p++) {
      hands[p]!.push(deck[round * players + p]!);
    }
  }
  const rest = deck.slice(needed);
  return { hands, rest };
}
