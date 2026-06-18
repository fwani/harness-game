// Application layer: orchestrates a single 2-player Chess game. Depends on domain only.
// 체스(Chess)의 2인 교대 진행 + 차례 관리 + 외통(승)/스테일메이트(무승부) 종료를 도메인 위에
// 얇게 올린다(playJanggi.ts와 동일한 domain→application 파이프라인의 application 단계).
// 합법 수/체크/외통/스테일메이트 판정은 모두 도메인(chess.ts)에 위임하고 여기서 재구현하지 않는다.
// 범위: 기본 이동/포획 + 외통/스테일메이트 종료까지만. 캐슬링·앙파상·프로모션·
// 50수/3회 반복 무승부는 범위 밖(별도 이슈).
import {
  createChessBoard,
  legalChessMoves,
  colorLegalMoves,
  isCheckmate,
  isStalemate,
  pieceAt,
  type ChessBoard,
  type ChessColor,
  type ChessSquare,
} from "../domain/chess";

/** 좌표 표현은 도메인(board[row][col])을 그대로 따른다(중복 정의 금지). */
export type Square = ChessSquare;

/** 게임 종료 사유. "checkmate"=외통(승), "stalemate"=스테일메이트(무승부). 미종료면 null. */
export type ChessEndReason = "checkmate" | "stalemate";

export interface ChessGameState {
  board: ChessBoard;
  /** 다음에 둘 차례. 시작은 "white". */
  next: ChessColor;
  /** 게임 종료 여부(외통 또는 스테일메이트 시 true). */
  finished: boolean;
  /** 승자. 미종료이거나 무승부(스테일메이트)면 null. finished && winner===null → 무승부. */
  winner: ChessColor | null;
  /** 종료 사유. 미종료면 null. */
  endReason: ChessEndReason | null;
}

/** 상대 색으로 토글한다. */
function opponent(color: ChessColor): ChessColor {
  return color === "white" ? "black" : "white";
}

/**
 * from→to 단순 이동/포획을 적용한 새 보드를 반환한다(입력 board 비변형).
 * 합법성은 호출 전에 도메인 legalChessMoves로 검증되므로 여기서는 칸만 옮긴다(규칙 없음).
 * 배열 슬롯만 새로 만들고 기물 객체는 불변이라 참조 공유는 안전하다.
 */
function applyBoardMove(board: ChessBoard, from: Square, to: Square): ChessBoard {
  const next: ChessBoard = board.map((rowCells) => rowCells.slice());
  next[to.row]![to.col] = next[from.row]![from.col]!;
  next[from.row]![from.col] = null;
  return next;
}

/** 표준 초기 배치로 새 게임을 시작한다(백 선·미종료). */
export function startChessGame(): ChessGameState {
  return {
    board: createChessBoard(),
    next: "white",
    finished: false,
    winner: null,
    endReason: null,
  };
}

/**
 * 현재 차례(state.next)의 from→to 한 수를 적용한 새 상태를 반환한다(불변: 입력 state 비변형).
 * - 이미 finished면 throw.
 * - from에 현재 차례의 기물이 없으면 throw(빈 칸·상대 기물).
 * - from→to가 현재 차례의 **합법 수(domain legalChessMoves)** 가 아니면 throw
 *   (자기 킹이 잡히는 수 포함 — 도메인 판정에 위임). 사유는 식별 가능한 메시지로 던진다.
 * - 적용 후 차례를 상대로 전환하고 종료를 판정한다(우선순위):
 *   1) 상대가 isCheckmate → finished, winner=둔 쪽, endReason="checkmate".
 *   2) 외통은 아니지만 상대가 isStalemate → finished, winner=null, endReason="stalemate".
 *   3) 둘 다 아니면 미종료(next 토글).
 */
export function applyChessMove(state: ChessGameState, from: Square, to: Square): ChessGameState {
  if (state.finished) {
    throw new Error("applyChessMove: 게임이 이미 종료되었습니다");
  }
  const side = state.next;
  const piece = pieceAt(state.board, from.row, from.col);
  if (piece === null) {
    throw new Error(`applyChessMove: 빈 칸에서는 둘 수 없습니다 (row=${from.row}, col=${from.col})`);
  }
  if (piece.color !== side) {
    throw new Error(`applyChessMove: 현재 차례(${side})의 기물이 아닙니다`);
  }
  const isLegal = legalChessMoves(state.board, from.row, from.col).some(
    (m) => m.row === to.row && m.col === to.col,
  );
  if (!isLegal) {
    throw new Error(
      `applyChessMove: 합법 수가 아닙니다 (from row=${from.row},col=${from.col} → to row=${to.row},col=${to.col})`,
    );
  }
  const board = applyBoardMove(state.board, from, to);
  const foe = opponent(side);
  const checkmated = isCheckmate(board, foe);
  const stalemated = !checkmated && isStalemate(board, foe);
  const finished = checkmated || stalemated;
  const endReason: ChessEndReason | null = checkmated
    ? "checkmate"
    : stalemated
      ? "stalemate"
      : null;
  // 외통은 둔 쪽이 승자. 스테일메이트는 무승부(승자 없음).
  const winner = checkmated ? side : null;
  return {
    board,
    next: finished ? side : foe,
    finished,
    winner,
    endReason,
  };
}

/** 현재 차례(state.next)가 둘 수 있는 모든 합법 수(from→to). 도메인 위임, UI 하이라이트용. */
export function chessLegalMoves(state: ChessGameState): { from: Square; to: Square }[] {
  return colorLegalMoves(state.board, state.next);
}
