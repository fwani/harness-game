// Application layer: orchestrates a single 2-player Janggi game. Depends on domain only.
// 장기(Janggi)의 2인 교대 진행 + 차례 관리 + 승패(장군 포획) 판정을 도메인 위에 얇게 올린다.
// 장군/외통(check/checkmate)·빅장 금지·점수제·기록 저장은 이 모듈 범위 밖이다(별도 이슈).
import {
  createInitialBoard,
  legalMovesFrom,
  applyMove as applyDomainMove,
  type Board,
  type Side,
  type Pos,
} from "../domain/janggi";

export interface JanggiState {
  board: Board;
  /** 다음에 둘 차례. 시작은 "cho". */
  next: Side;
  /** 게임 종료 여부(상대 general 포획 시 true). */
  finished: boolean;
  /** 승자. 미종료면 null. */
  winner: Side | null;
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
  };
}

/**
 * 현재 차례(state.next)의 from→to 한 수를 적용한 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 종료(finished)면 throw.
 * - 도메인 applyMove가 throw하는 경우(불법 수)는 그대로 전파한다.
 * - 결과적으로 상대 general이 보드에서 사라지면 finished=true, winner=둔 쪽. 아니면 next 토글.
 */
export function applyMove(state: JanggiState, from: Pos, to: Pos): JanggiState {
  if (state.finished) {
    throw new Error("applyMove: game already finished");
  }
  const side = state.next;
  const board = applyDomainMove(state.board, side, from, to);
  const opponentCaptured = !hasGeneral(board, opponent(side));
  return {
    board,
    next: opponentCaptured ? side : opponent(side),
    finished: opponentCaptured,
    winner: opponentCaptured ? side : null,
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
