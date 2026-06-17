// Application layer: 체커(Checkers / 서양 장기, Draughts) 한 수 진행 헬퍼.
// 도메인 규칙(checkers)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playConnectFour.ts / reversiAi.ts / gomokuAi.ts와 동일한 패턴: 도메인의 합법 수 열거·착수·승부
// 판정을 재사용하고(재구현 금지) 난수는 주입받는다.
import type {
  CheckersBoard,
  CheckersColor,
  CheckersMove,
} from "../domain/checkers";
import {
  applyCheckersMove,
  canJumpAgain,
  findCheckersWinner,
  legalCheckersMoves,
  pieceAt,
} from "../domain/checkers";
import type { RandomSource } from "./dealCards";

/** dark의 상대는 light, light의 상대는 dark. */
function opponent(color: CheckersColor): CheckersColor {
  return color === "dark" ? "light" : "dark";
}

/**
 * color의 합법 수(legalCheckersMoves) 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수는 legalCheckersMoves(board, color)로 구한다(강제 점프는 도메인이 이미 반영).
 * - idx = rng.nextInt(moves.length)로 선택. 범위 밖 인덱스를 주면 throw.
 * - 둘 곳이 하나도 없으면 null. 입력 board 불변.
 */
export function chooseRandomCheckersMove(
  board: CheckersBoard,
  color: CheckersColor,
  rng: RandomSource,
): CheckersMove | null {
  const moves = legalCheckersMoves(board, color);
  if (moves.length === 0) {
    return null;
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}

/** 한 수 진행 결과: 착수 후 보드 + 멀티 점프 연속·턴 전환·승부 판정. */
export interface CheckersMoveResult {
  /** 착수 후 보드(입력 불변 — 도메인 applyCheckersMove가 새 보드 반환). */
  board: CheckersBoard;
  /** 이 수로 완성된 게임의 승자(findCheckersWinner). 없으면 null. */
  winner: CheckersColor | null;
  /** 방금 점프한 같은 기물이 멀티 점프를 이어가야 해서 같은 색이 한 번 더 두어야 하면 true. */
  continues: boolean;
  /** 다음에 둘 색. continues면 같은 color, 아니면 상대 색. */
  nextToMove: CheckersColor;
  /** 게임 종료 여부(winner !== null). */
  over: boolean;
}

/** color의 일반 기물이 승급(king)하는 행: light는 마지막 행, dark는 0행(도메인 promotionRow와 동일). */
function promotionRow(board: CheckersBoard, color: CheckersColor): number {
  return color === "light" ? board.length - 1 : 0;
}

/**
 * color가 move를 둔 한 수를 진행하고 멀티 점프 연속·턴 전환·승부를 계산한다.
 * - applyCheckersMove(board, move)로 새 보드를 만든다.
 * - 멀티 점프 연속: move가 점프(move.captured 존재)이고 canJumpAgain(next, move.to)가 true면 continues=true,
 *   nextToMove=color(같은 색 유지). 단, 이 수로 man이 마지막 행에 도달해 king으로 승급했으면
 *   표준 규칙상 승급 즉시 턴 종료 → continues=false. 점프가 아니거나 더 점프할 수 없으면
 *   continues=false, nextToMove=상대 색.
 * - winner는 findCheckersWinner(next, nextToMove)로 계산(재구현 금지).
 * - 입력 board 불변.
 */
export function playCheckersMove(
  board: CheckersBoard,
  move: CheckersMove,
  color: CheckersColor,
): CheckersMoveResult {
  const mover = pieceAt(board, move.from.row, move.from.col);
  const wasMan = mover !== null && mover.color === color && !mover.king;
  const promoted = wasMan && move.to.row === promotionRow(board, color);

  const next = applyCheckersMove(board, move);
  const isJump = move.captured !== undefined;
  const continues = isJump && !promoted && canJumpAgain(next, move.to);
  const nextToMove = continues ? color : opponent(color);
  const winner = findCheckersWinner(next, nextToMove);
  return {
    board: next,
    winner,
    continues,
    nextToMove,
    over: winner !== null,
  };
}
