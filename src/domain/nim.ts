// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 님(Nim, 표준 플레이): 여러 더미에서 번갈아 한 더미의 돌을 1개 이상 가져가고,
// 마지막 돌을 가져가는 사람이 승리(normal play)하는 고전 조합 게임.
// 난수·CPU 수 선택·턴 오케스트레이션·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 배열 반환).

/** 1=선(先, 먼저 두는 쪽), 2=후. 색 비의존 — 후속 UI는 기호/레이블 병행. */
export type NimPlayer = 1 | 2;

/** 각 더미의 남은 돌 수. 인덱스가 더미 번호. */
export type NimPiles = number[];

/** 한 수: pile 더미에서 count개를 가져간다. */
export interface NimMove {
  pile: number;
  count: number;
}

/** 표준 초기 더미 배치. */
const DEFAULT_SIZES: ReadonlyArray<number> = [3, 5, 7];

/**
 * 더미 배치를 새 배열로 생성한다. 인자가 없으면 고전 [3, 5, 7].
 * - 빈 배열·음수·비정수가 하나라도 있으면 throw(한국어 사유).
 * - 반환 배열은 호출마다 독립(입력 sizes를 변형하지 않음).
 */
export function createNimPiles(sizes?: number[]): NimPiles {
  const source = sizes ?? DEFAULT_SIZES;
  if (source.length === 0) {
    throw new Error("님 잘못된 배치: 더미가 최소 1개 필요");
  }
  for (const size of source) {
    if (!Number.isInteger(size) || size < 0) {
      throw new Error(`님 잘못된 배치: 더미 크기는 0 이상의 정수여야 함(받은 값: ${size})`);
    }
  }
  return source.slice();
}

/** 모든 더미가 0이면(가져갈 돌 없음) 종료. */
export function isNimGameOver(piles: NimPiles): boolean {
  return piles.every((stones) => stones === 0);
}

/**
 * 합법 수 전체 열거: 돌이 남은 각 더미에서 1..(그 더미 돌 수)개.
 * 종료(모든 더미 0)면 빈 배열. 더미 인덱스 오름차순, 그 안에서 count 오름차순.
 */
export function legalNimMoves(piles: NimPiles): NimMove[] {
  const moves: NimMove[] = [];
  for (let pile = 0; pile < piles.length; pile += 1) {
    const stones = piles[pile]!;
    for (let count = 1; count <= stones; count += 1) {
      moves.push({ pile, count });
    }
  }
  return moves;
}

/**
 * 합법 여부만 판정한다(throw 금지, boolean만).
 * 범위 밖 pile·비정수·count<1·count가 그 더미 돌 수 초과·종료면 false.
 */
export function isLegalNimMove(piles: NimPiles, move: NimMove): boolean {
  const { pile, count } = move;
  if (!Number.isInteger(pile) || pile < 0 || pile >= piles.length) {
    return false;
  }
  if (!Number.isInteger(count) || count < 1) {
    return false;
  }
  const stones = piles[pile]!;
  return count <= stones;
}

/**
 * 한 수를 적용한 새 더미 배열을 반환한다(입력 piles 불변).
 * 불법 수면 throw(한국어 사유).
 */
export function applyNimMove(piles: NimPiles, move: NimMove): NimPiles {
  if (!isLegalNimMove(piles, move)) {
    throw new Error(
      `님 불법 수: pile=${move.pile}, count=${move.count} (더미 수=${piles.length})`,
    );
  }
  const next = piles.slice();
  next[move.pile] = next[move.pile]! - move.count;
  return next;
}

/**
 * 표준 플레이 승자: 마지막 돌을 가져간 플레이어가 승자다.
 * 종료 상태(모든 더미 0)면 마지막에 둔 플레이어(lastToMove)를 승자로 반환한다.
 * 진행 중(돌이 남음)이면 null.
 */
export function findNimWinner(piles: NimPiles, lastToMove: NimPlayer): NimPlayer | null {
  return isNimGameOver(piles) ? lastToMove : null;
}
