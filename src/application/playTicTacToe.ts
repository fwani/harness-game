// Application layer: 틱택토(Tic-Tac-Toe) 한 수 진행 + 무작위 CPU 합법 수 선택 헬퍼.
// 도메인 규칙(ticTacToe)과 RandomSource 포트에만 의존한다. infrastructure import 금지(난수는 주입).
// playConnectFour.ts / gomokuAi.ts와 동일한 패턴: 도메인의 합법 수 열거를 재사용하고 난수는 주입받는다.
import type { Board, Mark } from "../domain/ticTacToe";
import {
  applyTicTacToeMove,
  findTicTacToeWinner,
  isTicTacToeDraw,
} from "../domain/ticTacToe";
import type { RandomSource } from "./dealCards";

/**
 * board의 빈 칸(null) 좌표를 행 우선(row-major)으로 열거한다.
 * - 입력 board를 변형하지 않는다(읽기만 함).
 * - 가득 찬 보드면 빈 배열을 반환한다.
 */
export function legalTicTacToeMoves(board: Board): Array<{ row: number; col: number }> {
  const moves: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < board.length; row++) {
    const cells = board[row]!;
    for (let col = 0; col < cells.length; col++) {
      if (cells[col] === null) {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

/**
 * 현재 board의 합법 수(legalTicTacToeMoves) 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수는 legalTicTacToeMoves(board)로 구한다(재구현 금지). 반환 순서는 행 우선.
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 둘 곳이 하나도 없으면(보드가 가득 참) null을 반환한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다(방어적).
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomTicTacToeMove(
  board: Board,
  rng: RandomSource,
): { row: number; col: number } | null {
  const moves = legalTicTacToeMoves(board);
  if (moves.length === 0) {
    return null;
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}

/** 한 수 진행 결과: 착수 후 보드 + 승패/무승부 판정. */
export interface TicTacToeMoveResult {
  /** 착수 후 보드(입력 보드는 변형하지 않음). */
  board: Board;
  /** findTicTacToeWinner 결과. 승자 없으면 null. */
  winner: Mark | null;
  /** 승자가 없고 보드가 가득 차 무승부면 true. */
  draw: boolean;
  /** 게임 종료 여부(winner !== null || draw). */
  over: boolean;
}

/**
 * mark가 (row,col)에 착수한 한 수를 진행하고 승패/무승부를 계산한다.
 * - applyTicTacToeMove(board, row, col, mark)로 착수한다. 불법 착수(범위 밖/이미 점유)는 도메인 throw를 그대로 전파.
 * - 착수 후 winner/draw/over를 계산한다. 승리·무승부 판정은 도메인을 재사용(재구현 금지).
 * - 입력 board를 변형하지 않는다(도메인 applyTicTacToeMove가 새 보드를 반환).
 */
export function playTicTacToeMove(
  board: Board,
  row: number,
  col: number,
  mark: Mark,
): TicTacToeMoveResult {
  const next = applyTicTacToeMove(board, row, col, mark);
  const winner = findTicTacToeWinner(next);
  const draw = winner === null && isTicTacToeDraw(next);
  return {
    board: next,
    winner,
    draw,
    over: winner !== null || draw,
  };
}
