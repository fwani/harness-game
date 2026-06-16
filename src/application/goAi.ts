// Application layer: Go (바둑) AI move helpers. Depends on domain rules and the
// RandomSource port only. No infrastructure import (randomness is injected).
// gomokuAi.ts와 동일한 패턴: 도메인의 합법 수 열거를 재사용하고 난수는 주입받는다.
import type { Board, Stone } from "../domain/go";
import { legalGoMoves, type GoMove } from "../domain/goMoves";
import type { RandomSource } from "./dealCards";

/**
 * 현재 board에서 stone 색이 둘 수 있는 합법 수 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수는 legalGoMoves(board, stone, previousBoard)로 구한다(패 검사를 위해
 *   previousBoard 전달 가능, 생략 시 패 검사 없음).
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 합법 수가 하나도 없으면 throw 한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board / previousBoard를 변형하지 않는다(불변, 결정적).
 */
export function chooseRandomGoMove(
  board: Board,
  stone: Stone,
  rng: RandomSource,
  previousBoard?: Board,
): GoMove {
  const moves = legalGoMoves(board, stone, previousBoard);
  if (moves.length === 0) {
    throw new Error("chooseRandomGoMove: no legal moves available");
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}
