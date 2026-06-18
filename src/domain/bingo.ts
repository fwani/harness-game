// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 빙고(Bingo): N×N 카드에 적힌 번호 중 뽑힌 번호를 칸에 표시(마킹)하고,
// 가로/세로/대각선이 모두 채워진 "완성 줄"의 수가 목표(기본 1)에 도달하면 빙고로 판정한다.
// 카드 번호의 무작위 생성·번호 추첨·턴 오케스트레이션·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 객체/배열 반환).
// 색 비의존 — 후속 UI는 마킹 여부를 기호/레이블로도 병행 표시한다.

/**
 * 빙고 카드. `numbers`는 행 우선(row-major)으로 평탄화된 `size*size` 길이 배열.
 * 예) size=2 의 `[1,2,3,4]` 는 1행 `[1,2]`, 2행 `[3,4]`.
 */
export interface BingoCard {
  size: number;
  numbers: number[];
}

/**
 * 빙고 진행 상태. `marked`는 카드와 같은 길이로, 같은 인덱스 칸의 표시 여부.
 */
export interface BingoState {
  card: BingoCard;
  marked: boolean[];
}

/** 기본 카드 크기(5×5). */
const DEFAULT_SIZE = 5;

/**
 * 카드를 새 객체로 생성한다(입력 numbers를 변형하지 않음). 기본 size=5.
 * 검증(위반 시 한국어 사유로 throw):
 * - size 는 1 이상의 정수.
 * - numbers.length === size*size.
 * - 모든 원소가 양의 정수(1 이상).
 * - 중복 없음.
 * (가운데 FREE 칸 같은 변형은 범위 밖 — 순수 N×N.)
 */
export function createBingoCard(numbers: number[], size: number = DEFAULT_SIZE): BingoCard {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`빙고 잘못된 카드: size는 1 이상의 정수여야 함(받은 값: ${size})`);
  }
  const expected = size * size;
  if (numbers.length !== expected) {
    throw new Error(
      `빙고 잘못된 카드: 번호 개수는 size*size(${expected})여야 함(받은 개수: ${numbers.length})`,
    );
  }
  for (const value of numbers) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`빙고 잘못된 카드: 모든 번호는 1 이상의 정수여야 함(받은 값: ${value})`);
    }
  }
  if (new Set(numbers).size !== numbers.length) {
    throw new Error("빙고 잘못된 카드: 번호는 중복될 수 없음");
  }
  return { size, numbers: numbers.slice() };
}

/**
 * 모든 칸이 미표시인 초기 상태를 만든다(카드는 그대로 참조).
 */
export function createBingoState(card: BingoCard): BingoState {
  return { card, marked: card.numbers.map(() => false) };
}

/**
 * 카드에 `value`가 있으면 그 칸을 표시한 새 상태를 반환한다.
 * 없으면 동일 내용의 새 상태(no-op). 이미 표시된 칸을 다시 표시해도 안전(멱등).
 * 입력 state(및 marked 배열)는 변형하지 않는다.
 */
export function markBingoNumber(state: BingoState, value: number): BingoState {
  const index = state.card.numbers.indexOf(value);
  const marked = state.marked.slice();
  if (index !== -1) {
    marked[index] = true;
  }
  return { card: state.card, marked };
}

/**
 * 완전히 표시된 줄의 수를 센다: 가로 size개 + 세로 size개 + 대각 2개.
 * 각 줄은 그 줄의 모든 칸이 표시되어 있을 때만 1로 집계한다.
 */
export function countBingoLines(state: BingoState): number {
  const { size } = state.card;
  const { marked } = state;
  const at = (row: number, col: number): boolean => marked[row * size + col]!;

  let lines = 0;

  // 가로 줄
  for (let row = 0; row < size; row += 1) {
    let full = true;
    for (let col = 0; col < size; col += 1) {
      if (!at(row, col)) {
        full = false;
        break;
      }
    }
    if (full) lines += 1;
  }

  // 세로 줄
  for (let col = 0; col < size; col += 1) {
    let full = true;
    for (let row = 0; row < size; row += 1) {
      if (!at(row, col)) {
        full = false;
        break;
      }
    }
    if (full) lines += 1;
  }

  // 주대각(↘): (0,0),(1,1),...
  let mainFull = true;
  for (let i = 0; i < size; i += 1) {
    if (!at(i, i)) {
      mainFull = false;
      break;
    }
  }
  if (mainFull) lines += 1;

  // 반대각(↙): (0,size-1),(1,size-2),...
  let antiFull = true;
  for (let i = 0; i < size; i += 1) {
    if (!at(i, size - 1 - i)) {
      antiFull = false;
      break;
    }
  }
  if (antiFull) lines += 1;

  return lines;
}

/**
 * 완성 줄 수가 목표 이상이면 빙고로 판정한다. target 기본 1.
 */
export function isBingo(state: BingoState, target: number = 1): boolean {
  return countBingoLines(state) >= target;
}
