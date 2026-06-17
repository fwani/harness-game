// Application layer: Chess(체스) AI move helpers. Depends on application/domain의 합법 수
// 열거(chessLegalMoves)와 RandomSource 포트만 사용한다. No infrastructure import (randomness
// is injected). reversiAi.ts / gomokuAi.ts와 동일한 패턴: 합법 수는 재구현하지 않고 재사용하며
// 난수는 주입받아 테스트 결정성을 보장한다.
import { chessLegalMoves, type ChessGameState, type Square } from "./playChess";
import type { RandomSource } from "./dealCards";

/**
 * 현재 차례(state.next)가 둘 수 있는 합법 수 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수는 chessLegalMoves(state)로 구한다(재구현 금지). 반환 순서는 도메인 함수 순서.
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 합법 수가 하나도 없으면(외통/스테일메이트로 둘 곳 없음) throw 한다. 종료 처리는
 *   오케스트레이터/뷰 책임이며 이 헬퍼 범위 밖이다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 state를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomChessMove(
  state: ChessGameState,
  rng: RandomSource,
): { from: Square; to: Square } {
  const moves = chessLegalMoves(state);
  if (moves.length === 0) {
    throw new Error("chooseRandomChessMove: no legal moves available");
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}
