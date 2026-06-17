// Application layer: orchestrates a single 2-player Janggi game. Depends on domain only.
// 장기(Janggi)의 2인 교대 진행 + 차례 관리 + 승패(장 포획·외통)·무승부(빅장) 판정을 도메인 위에 얇게 올린다.
// 외통(checkmate)은 도메인 isCheckmate로, 빅장(무승부)은 도메인 isBikjang으로 정식 판정한다.
// 점수제·기록 저장은 범위 밖이다(별도 이슈).
import {
  createInitialBoard,
  legalMovesFrom,
  applyMove as applyDomainMove,
  isCheckmate,
  type Board,
  type Side,
  type Pos,
} from "../domain/janggi";
import { isBikjang } from "../domain/janggiBikjang";

/**
 * 게임 종료 사유.
 * - "capture"=상대 장 포획(승),
 * - "checkmate"=외통수(승),
 * - "bikjang"=빅장(장군 마주보기) 무승부.
 * 미종료면 null.
 */
export type JanggiEndReason = "capture" | "checkmate" | "bikjang";

export interface JanggiState {
  board: Board;
  /** 다음에 둘 차례. 시작은 "cho". */
  next: Side;
  /** 게임 종료 여부(상대 general 포획·외통 또는 빅장 무승부 시 true). */
  finished: boolean;
  /** 승자. 미종료이거나 무승부(빅장)면 null. finished=true && winner=null은 무승부를 뜻한다. */
  winner: Side | null;
  /** 종료 사유. 미종료면 null. */
  endReason: JanggiEndReason | null;
}

/** 상대 진영으로 토글한다. */
function opponent(side: Side): Side {
  return side === "cho" ? "han" : "cho";
}

/** `side` 진영의 general(장)이 보드 위에 존재하는지. */
function hasGeneral(board: Board, side: Side): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.side === side && cell.type === "general") {
        return true;
      }
    }
  }
  return false;
}

/** 표준 초기 배치 보드로 새 게임을 시작한다(초 선). */
export function startGame(): JanggiState {
  return {
    board: createInitialBoard(),
    next: "cho",
    finished: false,
    winner: null,
    endReason: null,
  };
}

/**
 * 현재 차례(state.next)의 from→to 한 수를 적용한 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 종료(finished)면 throw.
 * - 도메인 applyMove가 throw하는 경우(불법 수)는 그대로 전파한다.
 * - 종료 판정 우선순위:
 *   1) 상대 general이 보드에서 사라지면(직접 포획) finished=true, winner=둔 쪽, endReason="capture".
 *   2) 그렇지 않더라도 상대가 외통수(isCheckmate)면 finished=true, winner=둔 쪽, endReason="checkmate".
 *   3) 둘 다 아니고 보드가 빅장(isBikjang)이면 finished=true, winner=null(무승부), endReason="bikjang".
 *   4) 모두 아니면 next 토글(미종료).
 */
export function applyMove(state: JanggiState, from: Pos, to: Pos): JanggiState {
  if (state.finished) {
    throw new Error("applyMove: game already finished");
  }
  const side = state.next;
  const board = applyDomainMove(state.board, side, from, to);
  const foe = opponent(side);
  const opponentCaptured = !hasGeneral(board, foe);
  // 장 포획이면 즉시 종료. 아니면 외통(상대가 어떤 합법 수로도 장군을 벗어나지 못함) 판정.
  const checkmated = !opponentCaptured && isCheckmate(board, foe);
  // 포획·외통이 아니어도 두 장이 마주보면(빅장) 무승부로 종료한다(포획·외통이 우선).
  const bikjang = !opponentCaptured && !checkmated && isBikjang(board);
  const finished = opponentCaptured || checkmated || bikjang;
  const endReason: JanggiEndReason | null = opponentCaptured
    ? "capture"
    : checkmated
      ? "checkmate"
      : bikjang
        ? "bikjang"
        : null;
  // 무승부(빅장)는 승자가 없다. 포획·외통은 둔 쪽이 승자.
  const winner = finished && !bikjang ? side : null;
  return {
    board,
    next: finished ? side : foe,
    finished,
    winner,
    endReason,
  };
}

/** 현재 차례(state.next)가 둘 수 있는 모든 (from,to) 후보를 반환한다(편의 함수). */
export function legalMoves(state: JanggiState): { from: Pos; to: Pos }[] {
  const side = state.next;
  const moves: { from: Pos; to: Pos }[] = [];
  for (let y = 0; y < state.board.length; y++) {
    const row = state.board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell === null || cell.side !== side) {
        continue;
      }
      const from: Pos = { x, y };
      for (const to of legalMovesFrom(state.board, side, from)) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}
