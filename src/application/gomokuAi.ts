// Application layer: Gomoku AI move helpers. Depends on domain types and the
// RandomSource port only. No infrastructure import (randomness is injected).
import type { Board } from "../domain/gomoku";
import type { RandomSource } from "./dealCards";

/** 보드 좌표(접근은 board[y][x]). */
export interface GomokuMove {
  x: number;
  y: number;
}

/**
 * 현재 board에서 비어 있는(합법) 착수 지점을 row-major(y 먼저, 그 안에서 x) 순서로 모두 반환한다.
 * - 입력 board를 변형하지 않는다(불변, 결정적).
 * - 빈 칸이 없으면 빈 배열을 반환한다(throw 하지 않는다).
 */
export function legalGomokuMoves(board: Board): GomokuMove[] {
  const moves: GomokuMove[] = [];
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      if (row[x] === null) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
}

/**
 * 합법 착수 지점 중 하나를 RandomSource로 균등하게 골라 반환한다.
 * - 합법 수 목록을 legalGomokuMoves로 구하고, idx = rng.nextInt(moves.length)로 선택한다.
 * - 합법 수가 하나도 없으면(보드가 가득 참) throw 한다.
 * - 입력 board를 변형하지 않는다.
 */
export function chooseRandomGomokuMove(board: Board, rng: RandomSource): GomokuMove {
  const moves = legalGomokuMoves(board);
  if (moves.length === 0) {
    throw new Error("chooseRandomGomokuMove: no legal moves (board is full)");
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}
