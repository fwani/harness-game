// Application layer: Connect Four(커넥트포·사목) 한 판 진행 헬퍼.
// 도메인 규칙(connectFour)과 RandomSource 포트에만 의존한다. infrastructure import 금지(난수는 주입).
// reversiAi.ts / gomokuAi.ts와 동일한 패턴: 도메인의 합법 수 열거를 재사용하고 난수는 주입받는다.
import type { Board, Player } from "../domain/connectFour";
import {
  dropDisc,
  findConnectFourWinner,
  isConnectFourDraw,
  legalColumns,
} from "../domain/connectFour";
import type { RandomSource } from "./dealCards";

/**
 * 현재 board에서 둘 수 있는 합법 열(legalColumns) 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 열은 legalColumns(board)로 구한다(재구현 금지). 반환 순서는 도메인 함수 순서.
 * - idx = rng.nextInt(cols.length)로 선택한다.
 * - 둘 곳이 하나도 없으면(보드가 가득 참) null을 반환한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomConnectFourColumn(board: Board, rng: RandomSource): number | null {
  const cols = legalColumns(board);
  if (cols.length === 0) {
    return null;
  }
  const idx = rng.nextInt(cols.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= cols.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return cols[idx]!;
}

/** 한 수 진행 결과: 착수 후 보드 + 승패/무승부 판정. */
export interface ConnectFourMoveResult {
  /** 착수 후 보드(입력 보드는 변형하지 않음). */
  board: Board;
  /** findConnectFourWinner 결과. 승자 없으면 null. */
  winner: Player | null;
  /** 승자가 없고 보드가 가득 차 무승부면 true. */
  draw: boolean;
  /** 게임 종료 여부(winner !== null || draw). */
  over: boolean;
}

/**
 * player가 col에 디스크를 떨어뜨린 한 수를 진행하고 승패/무승부를 계산한다.
 * - dropDisc(board, col, player)를 호출한다. 반환이 null(가득 찬 열/범위 밖/잘못된 player)이면 throw.
 * - 착수 후 winner/draw/over를 계산한다. 승리 판정 로직은 도메인을 재사용(재구현 금지).
 * - 입력 board를 변형하지 않는다(도메인 dropDisc가 새 보드를 반환).
 */
export function playConnectFourMove(board: Board, col: number, player: Player): ConnectFourMoveResult {
  const next = dropDisc(board, col, player);
  if (next === null) {
    throw new Error(`playConnectFourMove: illegal move (col=${col}, player=${player})`);
  }
  const winner = findConnectFourWinner(next);
  const draw = winner === null && isConnectFourDraw(next);
  return {
    board: next,
    winner,
    draw,
    over: winner !== null || draw,
  };
}
