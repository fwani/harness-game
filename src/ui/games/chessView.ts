// Presentation helpers for the 체스(Chess) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 규칙(합법 수/체크/외통/
// 스테일메이트·턴 진행)은 domain(chess)·application(playChess)을 재사용하며 여기서 재구현하지
// 않는다. janggiView/checkersView와 동일한 패턴. 색에만 의존하지 않도록 진영을 기호(글리프)+
// 텍스트 레이블+aria-label로도 구분한다(UX_GUIDELINES 접근성 원칙).
import {
  legalChessMoves,
  isKingInCheck,
  pieceAt,
  squareName,
  type ChessColor,
  type ChessPieceType,
} from "../../domain/chess";
import type { ChessGameState, Square } from "../../application/playChess";
import type { WinSide } from "../records";

/** 진영 한국어 라벨(색 비의존 텍스트 단서). */
const COLOR_LABEL: Record<ChessColor, string> = { white: "백", black: "흑" };

/** 기물 한국어 이름. */
const PIECE_NAME: Record<ChessPieceType, string> = {
  pawn: "폰",
  knight: "나이트",
  bishop: "비숍",
  rook: "룩",
  queen: "퀸",
  king: "킹",
};

// 유니코드 체스 기물 글리프. 백은 외곽선(♔♕♖♗♘♙), 흑은 채움(♚♛♜♝♞♟)으로 자형이 달라
// 색을 못 보거나 색이 같아도 모양으로 진영을 구분할 수 있다(색 비의존 단서).
const GLYPH: Record<ChessColor, Record<ChessPieceType, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

/** 두 칸이 같은 좌표인지. */
function sameSquare(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * 현재 차례(state.next) 기물의 from에서 둘 수 있는 합법 도착 칸.
 * - from에 현재 차례 기물이 없거나 게임이 끝났으면 `[]`.
 * - 도메인 legalChessMoves에 위임하므로 application chessLegalMoves(state)의 그 from 부분집합과
 *   정확히 일치한다(규칙 재구현 없음).
 */
export function legalTargetsFrom(state: ChessGameState, from: Square): Square[] {
  if (state.finished) {
    return [];
  }
  const piece = pieceAt(state.board, from.row, from.col);
  if (piece === null || piece.color !== state.next) {
    return [];
  }
  return legalChessMoves(state.board, from.row, from.col);
}

/** 한 칸의 렌더 정보(색 비의존: 글리프·텍스트 라벨·강조·aria-label). */
export interface ChessSquareView {
  /** 기물 글리프(빈 칸은 ""). */
  glyph: string;
  /** 기물 색(렌더 클래스용). 빈 칸은 null. */
  color: ChessColor | null;
  /** 기물 설명("백 룩" 등). 빈 칸은 "빈 칸". */
  pieceLabel: string;
  /** 현재 선택된 칸인지. */
  selected: boolean;
  /** 선택된 기물의 합법 도착 칸인지(강조 대상). */
  target: boolean;
  /** 지금 선택할 수 있는 칸인지(현재 차례 기물 + 합법 수 1개 이상). */
  selectable: boolean;
  /** 좌표 + 기물 + 강조 상태를 담은 접근성 라벨. */
  ariaLabel: string;
}

/**
 * 한 칸의 렌더 정보를 만든다(순수). selected는 현재 선택된 칸(없으면 null).
 * target은 selected에서의 합법 도착 칸 여부, selectable은 그 칸을 선택할 수 있는지.
 */
export function chessSquareView(
  state: ChessGameState,
  selected: Square | null,
  sq: Square,
): ChessSquareView {
  const piece = pieceAt(state.board, sq.row, sq.col);
  const isSelected = selected !== null && sameSquare(selected, sq);
  const isTarget =
    selected !== null &&
    legalTargetsFrom(state, selected).some((t) => sameSquare(t, sq));
  const selectable = !state.finished && legalTargetsFrom(state, sq).length > 0;
  const pieceLabel =
    piece === null ? "빈 칸" : `${COLOR_LABEL[piece.color]} ${PIECE_NAME[piece.type]}`;
  let ariaLabel = `${squareName(sq.row, sq.col)}, ${pieceLabel}`;
  if (isSelected) {
    ariaLabel += " · 선택됨";
  } else if (isTarget) {
    ariaLabel += " · 둘 수 있는 칸";
  }
  return {
    glyph: piece === null ? "" : GLYPH[piece.color][piece.type],
    color: piece === null ? null : piece.color,
    pieceLabel,
    selected: isSelected,
    target: isTarget,
    selectable,
    ariaLabel,
  };
}

/**
 * 현재 차례/체크/종료(외통 승·스테일메이트 무승부)를 한국어 안내 문구로 만든다.
 * 종료 사유(endReason)를 기준으로 구분한다(색 비의존 텍스트).
 */
export function chessStatusLabel(state: ChessGameState): string {
  if (state.finished) {
    if (state.endReason === "checkmate" && state.winner !== null) {
      return `외통수! ${COLOR_LABEL[state.winner]} 승리 🎉`;
    }
    if (state.endReason === "stalemate") {
      return "스테일메이트 · 무승부";
    }
    return "게임 종료";
  }
  const turn = `${COLOR_LABEL[state.next]} 차례`;
  if (isKingInCheck(state.board, state.next)) {
    return `${turn} · 장군! (체크를 피하는 수만 둘 수 있습니다)`;
  }
  return `${turn} — 둘 기물을 누르면 갈 수 있는 칸이 표시됩니다.`;
}

/**
 * applyChessMove가 던지는 불법 수 에러를 한국어 사유로 매핑한다(조용히 무시하지 않음).
 * 메시지 패턴으로 식별하고, 알 수 없으면 일반 사유로 폴백한다.
 */
export function chessMoveErrorReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("이미 종료")) {
    return "이미 종료된 게임입니다.";
  }
  if (msg.includes("빈 칸")) {
    return "빈 칸에서는 둘 수 없습니다.";
  }
  if (msg.includes("차례")) {
    return "현재 차례의 기물이 아닙니다.";
  }
  if (msg.includes("합법 수가 아닙니다")) {
    return "둘 수 없는 칸입니다 (합법 수가 아닙니다).";
  }
  return "둘 수 없는 수입니다.";
}

/** 종료 상태를 전적 저장용 승패로 변환한다(백=a/흑=b/무승부=draw). */
export function chessWinSide(state: ChessGameState): WinSide {
  if (state.winner === "white") {
    return "a";
  }
  if (state.winner === "black") {
    return "b";
  }
  return "draw";
}

/** 좌표 "row,col" 키(렌더 key·집합 조회용). */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}
