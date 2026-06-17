// Application layer: 만칼라(Mancala / Kalah, 6·4) 한 턴 진행 + 무작위 CPU 수 선택 헬퍼.
// 도메인 규칙(mancala)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playDotsAndBoxes.ts / playConnectFour.ts / gomokuAi.ts와 동일한 패턴:
// 도메인의 합법 수 열거·착수·종료/승자 판정을 재사용하고 난수는 주입받는다.
import type { MancalaBoard, MancalaPlayer } from "../domain/mancala";
import {
  applyMancalaMove,
  findMancalaWinner,
  isMancalaGameOver,
  legalMancalaMoves,
} from "../domain/mancala";
import type { RandomSource } from "./dealCards";

/**
 * player의 합법 수(legalMancalaMoves) 중 하나를 RandomSource로 균등 선택해 구덩이 인덱스를 반환한다.
 * - 후보는 legalMancalaMoves(board, player)로 구한다(재구현 금지). 반환 순서는 도메인 함수 순서.
 * - idx = rng.nextInt(moves.length)로 선택한다.
 * - 둘 곳이 하나도 없으면(빈 쪽뿐이거나 종료) null을 반환한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomMancalaMove(
  board: MancalaBoard,
  player: MancalaPlayer,
  rng: RandomSource,
): number | null {
  const moves = legalMancalaMoves(board, player);
  if (moves.length === 0) {
    return null;
  }
  const idx = rng.nextInt(moves.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moves.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return moves[idx]!;
}

/** 한 턴 진행 결과: 착수 후 보드 + 한 번 더·턴 전환·승부 판정. */
export interface MancalaTurnResult {
  /** 씨 뿌리기·포획·(종료 시)쓸어담기까지 반영한 새 보드(입력 불변 — 도메인 applyMancalaMove가 새 보드 반환). */
  board: MancalaBoard;
  /** 마지막 씨앗이 자기 곳간에 떨어져 같은 플레이어가 한 번 더 두면 true(도메인 결과 계승). */
  again: boolean;
  /** 다음에 둘 플레이어. again이면 같은 player, 아니면 상대. 게임 종료 시 의미 없음(현재 player 유지). */
  nextToMove: MancalaPlayer;
  /** 종료 시 findMancalaWinner(동점 null=무승부), 진행 중이면 null. */
  winner: MancalaPlayer | null;
  /** 게임 종료 여부(isMancalaGameOver). */
  over: boolean;
}

/**
 * player가 pit에 한 턴을 두고 한 번 더·턴 전환·승부를 계산한다.
 * - applyMancalaMove(board, player, pit)로 새 보드를 만든다(불법 수면 도메인이 throw).
 * - again이면 nextToMove=player(유지), 아니면 상대 색. 종료면 현재 player를 유지(의미 없음).
 * - over = isMancalaGameOver(next). winner는 종료일 때만 findMancalaWinner, 진행 중이면 null(재구현 금지).
 * - 입력 board를 변형하지 않는다(도메인 applyMancalaMove가 새 보드를 반환).
 */
export function playMancalaTurn(
  board: MancalaBoard,
  player: MancalaPlayer,
  pit: number,
): MancalaTurnResult {
  const { board: next, again } = applyMancalaMove(board, player, pit);
  const over = isMancalaGameOver(next);
  const opponent: MancalaPlayer = player === 1 ? 2 : 1;
  return {
    board: next,
    again,
    // again이면 같은 player. 게임이 끝났으면 의미 없으므로 현재 player를 유지한다. 그 외엔 상대 턴.
    nextToMove: again || over ? player : opponent,
    winner: over ? findMancalaWinner(next) : null,
    over,
  };
}
