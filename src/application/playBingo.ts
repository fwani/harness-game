// Application layer: 빙고(Bingo) 한 판 시작/한 턴(번호 추첨) 진행. domain(bingo)과 RandomSource 포트에만 의존한다.
// infrastructure(Math.random) 직접 사용 금지 — 무작위는 반드시 RandomSource로 주입한다(playMinesweeper/play2048/playMemory 패턴).
import {
  createBingoCard,
  createBingoState,
  markBingoNumber,
  isBingo,
  type BingoState,
} from "../domain/bingo";
import type { RandomSource } from "./dealCards";

/** 기본 카드 크기(5×5) — 도메인 기본과 일치. */
const DEFAULT_SIZE = 5;

/**
 * 빙고 한 판의 application 상태. 도메인 BingoState(card+marked)를 감싼다.
 */
export interface BingoGame {
  /** domain 상태: 카드 + 마킹. */
  state: BingoState;
  /** 아직 추첨되지 않은 번호 풀(시작 시 1..max 전부). */
  remaining: number[];
  /** 직전에 뽑힌 번호(없으면 null). */
  lastDrawn: number | null;
}

/**
 * 무작위 카드로 한 판 시작한다(불변 — 입력 변형 없음, 새 객체 반환).
 * - size 기본 5, max(추첨 번호 범위 상한) 기본 size*size.
 * - 검증(위반 시 한국어 사유로 throw): size는 1 이상의 정수, max는 정수이며 size*size 이상.
 * - 카드: 1..max에서 중복 없이 size*size개를 rng로 골라(뽑고 풀에서 제거 → 중복 없음) createBingoCard로 생성.
 *   rng.nextInt가 범위 밖 인덱스를 주면 방어적으로 throw(shuffle/generateMineCoordinates 규약).
 * - remaining: 카드 채택 여부와 무관하게 1..max 전부(시작 시 미추첨), lastDrawn=null.
 */
export function startBingoGame(
  rng: RandomSource,
  options?: { size?: number; max?: number },
): BingoGame {
  const size = options?.size ?? DEFAULT_SIZE;
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`빙고 잘못된 시작: size는 1 이상의 정수여야 함(받은 값: ${size})`);
  }
  const cells = size * size;
  const max = options?.max ?? cells;
  if (!Number.isInteger(max) || max < cells) {
    throw new Error(
      `빙고 잘못된 시작: max는 정수이며 size*size(${cells}) 이상이어야 함(받은 값: ${max})`,
    );
  }

  // 후보 풀 1..max. 뽑을 때마다 제거해 카드 번호 중복을 막는다(generateMineCoordinates 패턴).
  const pool: number[] = [];
  for (let n = 1; n <= max; n += 1) {
    pool.push(n);
  }

  const numbers: number[] = [];
  for (let k = 0; k < cells; k += 1) {
    const idx = rng.nextInt(pool.length);
    if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length) {
      throw new Error(`RandomSource returned out-of-range index: ${idx}`);
    }
    numbers.push(pool[idx]!);
    pool.splice(idx, 1);
  }

  const card = createBingoCard(numbers, size);
  const remaining: number[] = [];
  for (let n = 1; n <= max; n += 1) {
    remaining.push(n);
  }
  return { state: createBingoState(card), remaining, lastDrawn: null };
}

/**
 * 번호 한 개를 추첨해 한 턴 진행한다(불변 — 입력 game 변형 금지, 새 BingoGame 반환).
 * - remaining에서 rng로 하나를 뽑아 제거하고, 카드에 있으면 domain markBingoNumber로 마킹한다.
 * - lastDrawn은 이번에 뽑힌 번호로 갱신.
 * - remaining이 비어 있으면 한국어 사유로 throw(더 뽑을 번호 없음).
 * - rng.nextInt가 범위 밖 인덱스를 주면 방어적으로 throw(shuffle/generateMineCoordinates 규약).
 */
export function drawBingoNumber(game: BingoGame, rng: RandomSource): BingoGame {
  if (game.remaining.length === 0) {
    throw new Error("빙고 추첨 불가: 남은 번호가 없음");
  }
  const idx = rng.nextInt(game.remaining.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= game.remaining.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  const drawn = game.remaining[idx]!;
  const remaining = game.remaining.slice();
  remaining.splice(idx, 1);
  const state = markBingoNumber(game.state, drawn);
  return { state, remaining, lastDrawn: drawn };
}

/**
 * 현재 게임이 빙고인지 도메인 규칙으로 판정한다(application에서 규칙 재구현 금지). target 기본 1.
 */
export function isBingoGameWon(game: BingoGame, target: number = 1): boolean {
  return isBingo(game.state, target);
}
