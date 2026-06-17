// Application layer: orchestrates a single 2-player Reversi (Othello) game. Depends on domain only.
// 오델로(Reversi)의 2인 교대 진행 + 자동 패스(둘 곳 없는 쪽은 차례를 건너뜀) + 양쪽 모두
// 둘 수 없을 때 종료 + 디스크 집계 기반 승자 판정을 진행한다. 보드/착수/합법 수/계가 규칙은
// 도메인(reversi / reversiMoves / reversiScore)을 그대로 재사용하며 재정의하지 않는다.
import { createReversiBoard, applyReversiMove, type Board, type Stone } from "../domain/reversi";
import { hasLegalReversiMove } from "../domain/reversiMoves";
import { countReversiDiscs, isReversiGameOver } from "../domain/reversiScore";

export interface ReversiState {
  /** 도메인 Board(8×8 행 우선). */
  board: Board;
  /** 다음에 둘 차례. 시작은 "black"(흑 선). */
  next: Stone;
  /** 양쪽 모두 합법 수가 없으면 true(isReversiGameOver 기준). */
  finished: boolean;
  /** 직전 턴이 자동 패스였는지(상대가 둘 곳이 없어 차례를 건너뜀). */
  lastWasPass: boolean;
}

/** 상대 색으로 토글한다. */
function opponent(stone: Stone): Stone {
  return stone === "black" ? "white" : "black";
}

/** 표준 초기 배치 보드로 새 게임을 시작한다(흑 선). */
export function startReversiGame(): ReversiState {
  return {
    board: createReversiBoard(),
    next: "black",
    finished: false,
    lastWasPass: false,
  };
}

/**
 * 현재 차례(state.next)가 (x,y)에 착수한 새 상태를 반환한다(불변: 입력 state는 변형하지 않는다).
 * - 이미 종료(finished)면 throw.
 * - 합법 수가 아니면 applyReversiMove가 throw한다(범위 밖/비정수/뒤집힘 0개 동일 계약).
 * - 착수 후 차례 결정:
 *   - 상대가 둘 곳이 있으면 상대로 토글(lastWasPass=false).
 *   - 상대가 둘 곳이 없고 자신은 있으면 자동 패스로 차례를 다시 자신에게(lastWasPass=true).
 *   - 양쪽 모두 둘 곳이 없으면 finished=true(isReversiGameOver).
 */
export function applyReversiTurn(state: ReversiState, x: number, y: number): ReversiState {
  if (state.finished) {
    throw new Error("applyReversiTurn: game already finished");
  }
  const stone = state.next;
  const board = applyReversiMove(state.board, x, y, stone);

  if (isReversiGameOver(board)) {
    return { board, next: opponent(stone), finished: true, lastWasPass: true };
  }

  const foe = opponent(stone);
  if (hasLegalReversiMove(board, foe)) {
    return { board, next: foe, finished: false, lastWasPass: false };
  }
  // 상대는 둘 곳이 없고(여기서 isReversiGameOver=false이므로) 자신은 둘 수 있다 → 자동 패스.
  return { board, next: stone, finished: false, lastWasPass: true };
}

/**
 * 종료 시 디스크 집계 기반 승자를 반환한다("black" | "white" | "draw"), 미종료면 null.
 * countReversiDiscs의 winner(동수면 null)를 "draw"로 매핑한다.
 */
export function reversiResult(state: ReversiState): Stone | "draw" | null {
  if (!state.finished) {
    return null;
  }
  const { winner } = countReversiDiscs(state.board);
  return winner === null ? "draw" : winner;
}
