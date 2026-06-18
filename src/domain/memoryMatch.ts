// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 메모리(짝 맞추기, Concentration)의 카드 모델 + 두 장 뒤집기 + 짝 판정/제거 + 클리어 종료.
// 카드 목록은 1차원(MemoryCard[])이며 격자 배치는 UI 책임이다(minesweeper.ts와 동일한 순수-도메인 정책).
// 무작위 셔플(RandomSource 주입)·한 판 진행(시도 수 집계)·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 한 카드의 상태: 덮임 / 뒤집힘 / 짝 완성. */
export type CardStatus = "down" | "up" | "matched";

/** 한 장의 카드. 같은 value 두 장이 한 쌍을 이룬다. */
export interface MemoryCard {
  value: number; // 짝 식별자(같은 value 두 장이 한 쌍)
  status: CardStatus;
}

/** 길이 2*pairCount의 1차원 카드 목록(격자 배치는 UI 책임). */
export type MemoryBoard = MemoryCard[];

/** 보드를 깊은 복사한다(각 카드 객체까지 새로). 입력 board를 변형하지 않기 위해 사용. */
function cloneBoard(board: MemoryBoard): MemoryBoard {
  return board.map((card) => ({ ...card }));
}

/**
 * pairCount쌍(2*pairCount장)을 모두 "down" 상태로 생성한다.
 * value는 [0,0,1,1,...] 결정적 순서로 채운다(셔플은 범위 밖 — 후속 application 이슈).
 * - pairCount<1 또는 비정수면 throw.
 * - 매 호출마다 새 인스턴스를 반환한다(불변).
 */
export function createMemoryBoard(pairCount: number): MemoryBoard {
  if (!Number.isInteger(pairCount) || pairCount < 1) {
    throw new Error(`createMemoryBoard: pairCount must be a positive integer, got ${pairCount}`);
  }
  const board: MemoryBoard = [];
  for (let value = 0; value < pairCount; value++) {
    board.push({ value, status: "down" });
    board.push({ value, status: "down" });
  }
  return board;
}

/** 현재 "up" 상태인 카드 인덱스 목록(0, 1, 또는 2장). */
export function faceUpIndices(board: MemoryBoard): number[] {
  const indices: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i]!.status === "up") {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * index 카드를 "down"→"up"으로 뒤집어 새 보드를 반환한다(입력 불변).
 * - 범위 밖·비정수면 throw.
 * - 이미 up/matched면 throw.
 * - 이미 2장이 up이면(먼저 resolveFlips 필요) throw.
 */
export function flipUp(board: MemoryBoard, index: number): MemoryBoard {
  if (!Number.isInteger(index) || index < 0 || index >= board.length) {
    throw new Error(`flipUp: index out of range: ${index}`);
  }
  const card = board[index]!;
  if (card.status !== "down") {
    throw new Error(`flipUp: card at ${index} is not down (status=${card.status})`);
  }
  if (faceUpIndices(board).length >= 2) {
    throw new Error("flipUp: two cards are already up; resolveFlips first");
  }
  const next = cloneBoard(board);
  next[index] = { ...card, status: "up" };
  return next;
}

/**
 * 정확히 2장이 up일 때 판정한다.
 * - 같은 value면 둘 다 "matched"로 바꾸고 matched:true.
 * - 다른 value면 둘 다 "down"으로 복귀하고 matched:false.
 * - up이 2장이 아니면 throw.
 * - 입력 board 불변(새 보드 반환).
 */
export function resolveFlips(board: MemoryBoard): { board: MemoryBoard; matched: boolean } {
  const up = faceUpIndices(board);
  if (up.length !== 2) {
    throw new Error(`resolveFlips: exactly two cards must be up, found ${up.length}`);
  }
  const [a, b] = up as [number, number];
  const matched = board[a]!.value === board[b]!.value;
  const nextStatus: CardStatus = matched ? "matched" : "down";
  const next = cloneBoard(board);
  next[a] = { ...next[a]!, status: nextStatus };
  next[b] = { ...next[b]!, status: nextStatus };
  return { board: next, matched };
}

/** 완성된 짝(쌍) 수. */
export function countMatchedPairs(board: MemoryBoard): number {
  let matchedCards = 0;
  for (const card of board) {
    if (card.status === "matched") {
      matchedCards++;
    }
  }
  return Math.floor(matchedCards / 2);
}

/** 빈 보드가 아니고 모든 카드가 "matched"면 true(=클리어). */
export function isMemoryGameOver(board: MemoryBoard): boolean {
  return board.length > 0 && board.every((card) => card.status === "matched");
}
