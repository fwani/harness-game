// Application layer: 님(Nim, 표준 플레이) 한 턴 진행 + 무작위 CPU 수 선택 헬퍼.
// 도메인 규칙(nim)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playMancala.ts / playTicTacToe.ts와 동일한 패턴:
// 도메인의 합법 수 열거·착수·종료/승자 판정을 재사용하고 난수는 주입받는다(규칙 재구현 금지).
import type { NimMove, NimPiles, NimPlayer } from "../domain/nim";
import { applyNimMove, findNimWinner, isNimGameOver, legalNimMoves } from "../domain/nim";
import type { RandomSource } from "./dealCards";

/**
 * 합법 수(legalNimMoves) 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 후보는 legalNimMoves(piles)로 구한다(재구현 금지). 반환 순서는 도메인 함수 순서.
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 둘 곳이 하나도 없으면(모든 더미 0=종료) null을 반환한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다(방어적).
 * - 입력 piles를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomNimMove(piles: NimPiles, rng: RandomSource): NimMove | null {
  const moves = legalNimMoves(piles);
  if (moves.length === 0) {
    return null;
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}

/** 한 턴 진행 결과: 착수 후 더미 + 턴 전환·승부 판정. */
export interface NimTurnResult {
  /** 착수 후 더미(입력 불변 — 도메인 applyNimMove가 새 배열 반환). */
  piles: NimPiles;
  /** 종료 시 마지막에 둔 player가 승자(findNimWinner). 진행 중이면 null. */
  winner: NimPlayer | null;
  /** 게임 종료 여부(isNimGameOver). */
  over: boolean;
  /** 다음에 둘 플레이어(상대). 종료면 의미 없음(상대로 둬도 무방). */
  next: NimPlayer;
}

/**
 * player가 move를 둔 한 턴을 진행하고 턴 전환·승부를 계산한다.
 * - applyNimMove(piles, move)로 새 더미를 만든다(불법 수면 도메인이 throw 전파).
 * - over = isNimGameOver(next). 표준 플레이라 마지막 돌을 가져가면 player가 승자다.
 * - winner = findNimWinner(next, player): 종료면 player, 진행 중이면 null(재구현 금지).
 * - next = 상대 플레이어(종료 여부와 무관하게 상대로 전환; 종료 시 의미 없음).
 * - 입력 piles를 변형하지 않는다(도메인 applyNimMove가 새 배열을 반환).
 */
export function playNimTurn(
  piles: NimPiles,
  player: NimPlayer,
  move: NimMove,
): NimTurnResult {
  const next = applyNimMove(piles, move);
  const over = isNimGameOver(next);
  const opponent: NimPlayer = player === 1 ? 2 : 1;
  return {
    piles: next,
    winner: findNimWinner(next, player),
    over,
    next: opponent,
  };
}
