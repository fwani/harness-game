// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 체스(Chess)의 8×8 보드 모델 + 표준 초기 배치 + 기초 조회 헬퍼.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts/reversi.ts/connectFour.ts/checkers.ts와
// 동일하다(board[row][col], row 0 = 최상단 = 흑 진영 쪽). 기물 합법 수·이동/포획·
// 캐슬링/앙파상/승진·체크/체크메이트·턴 진행은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 체스 진영 색. 색만으로 구분하지 않도록 후속 UI는 기호+레이블 병행(UX_GUIDELINES 참고). */
export type ChessColor = "white" | "black";

/** 기물 종류. */
export type ChessPieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

/** 보드 위 기물. 색·타입을 데이터로 명시한다(색 비의존 렌더 대비). */
export interface ChessPiece {
  color: ChessColor;
  type: ChessPieceType;
}

/** 한 칸: 기물 또는 빈 칸. */
export type ChessCell = ChessPiece | null;

/** 8×8 보드, board[row][col]. */
export type ChessBoard = ChessCell[][];

/** 표준 체스 보드 크기(8×8). */
const CHESS_SIZE = 8;

/** 백랭크(back rank) 기물 순서: col 0..7 = a..h 파일. queen은 col 3(d 파일). */
const BACK_RANK: readonly ChessPieceType[] = [
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
];

/**
 * (row,col)이 보드 범위(0..7) 안인지. 순수 산술 — 보드 인스턴스에 의존하지 않는다.
 */
export function isOnBoard(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < CHESS_SIZE &&
    col >= 0 &&
    col < CHESS_SIZE
  );
}

/**
 * 표준 초기 배치된 새 8×8 보드를 반환한다(매 호출마다 새 인스턴스, 기물 객체도 공유 금지).
 * - row 0 = black 백랭크(rook,knight,bishop,queen,king,bishop,knight,rook), row 1 = black pawn 8개.
 * - row 6 = white pawn 8개, row 7 = white 백랭크(동일 순서). row 2~5는 빈 칸.
 * - 각 색 정확히 16개. queen on her own color: white queen d1(row7/col3), black queen d8(row0/col3).
 */
export function createChessBoard(): ChessBoard {
  const board: ChessBoard = Array.from({ length: CHESS_SIZE }, () =>
    Array.from({ length: CHESS_SIZE }, () => null),
  );
  for (let col = 0; col < CHESS_SIZE; col++) {
    const type = BACK_RANK[col]!;
    board[0]![col] = { color: "black", type };
    board[1]![col] = { color: "black", type: "pawn" };
    board[6]![col] = { color: "white", type: "pawn" };
    board[7]![col] = { color: "white", type };
  }
  return board;
}

/**
 * 해당 칸의 기물을 반환한다. 범위 밖이면 null(throw 금지 — checkers.pieceAt 결과 맞춤).
 */
export function pieceAt(board: ChessBoard, row: number, col: number): ChessCell {
  if (!isOnBoard(row, col)) {
    return null;
  }
  return board[row]![col]!;
}

/**
 * 표준 대수기보(algebraic) 한 칸 표기로 변환한다.
 * 파일(col): 0→"a" .. 7→"h". 랭크(row): row 7→"1" .. row 0→"8"(아래가 white 진영).
 * 예) row7/col0 → "a1", row0/col7 → "h8", row7/col4 → "e1", row0/col3 → "d8".
 * 범위 밖 좌표는 throw(잘못된 입력을 조용히 무시하지 않음).
 */
export function squareName(row: number, col: number): string {
  if (!isOnBoard(row, col)) {
    throw new Error(`보드 범위 밖 좌표: (row=${row}, col=${col})`);
  }
  const file = String.fromCharCode("a".charCodeAt(0) + col);
  const rank = CHESS_SIZE - row;
  return `${file}${rank}`;
}
