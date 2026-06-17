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

/** 보드 위 한 칸의 좌표(행·열). board[row][col] 컨벤션과 일치. */
export interface ChessSquare {
  row: number;
  col: number;
}

/** 나이트의 L자 8방향 오프셋(row,col). */
const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

/** 킹의 인접 8방향 오프셋(row,col). 슬라이더(룩·비숍·퀸)의 방향 집합으로도 재사용한다. */
const KING_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/** 룩의 직교 4방향. */
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** 비숍의 대각 4방향. */
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/** 슬라이더(룩·비숍·퀸)가 한 방향으로 빈 칸을 따라 진행하다 첫 기물에서 멈추는 수를 모은다. */
function slidingMoves(
  board: ChessBoard,
  row: number,
  col: number,
  color: ChessColor,
  dirs: ReadonlyArray<readonly [number, number]>,
  moves: ChessSquare[],
): void {
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (isOnBoard(r, c)) {
      const target = board[r]![c]!;
      if (target === null) {
        moves.push({ row: r, col: c });
      } else {
        // 첫 기물: 상대면 포획(그 칸까지), 자기 기물이면 그 앞까지. 어느 쪽이든 진행 종료.
        if (target.color !== color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

/** 보드 밖이 아니고 자기 기물도 아닌 칸(빈 칸/상대 기물)이면 수에 추가한다. 나이트·킹용. */
function stepMove(
  board: ChessBoard,
  row: number,
  col: number,
  color: ChessColor,
  moves: ChessSquare[],
): void {
  if (!isOnBoard(row, col)) {
    return;
  }
  const target = board[row]![col]!;
  if (target === null || target.color !== color) {
    moves.push({ row, col });
  }
}

/** 폰의 의사합법 수(전진·두 칸·대각 포획). 앙파상·승진은 제외. */
function pawnMoves(
  board: ChessBoard,
  row: number,
  col: number,
  color: ChessColor,
  moves: ChessSquare[],
): void {
  const dir = color === "white" ? -1 : 1; // white는 row 감소, black은 row 증가.
  const startRow = color === "white" ? 6 : 1;
  // 전진 1칸: 도착 칸이 비어 있을 때만.
  const oneRow = row + dir;
  if (isOnBoard(oneRow, col) && board[oneRow]![col]! === null) {
    moves.push({ row: oneRow, col });
    // 전진 2칸: 시작 랭크에서, 중간·도착 모두 비어 있을 때만.
    const twoRow = row + 2 * dir;
    if (row === startRow && isOnBoard(twoRow, col) && board[twoRow]![col]! === null) {
      moves.push({ row: twoRow, col });
    }
  }
  // 대각 포획: 상대 기물이 있을 때만(전진은 포획 아님).
  for (const dc of [-1, 1]) {
    const cr = row + dir;
    const cc = col + dc;
    if (isOnBoard(cr, cc)) {
      const target = board[cr]![cc]!;
      if (target !== null && target.color !== color) {
        moves.push({ row: cr, col: cc });
      }
    }
  }
}

/**
 * 해당 칸 기물의 의사합법 도착칸 목록을 반환한다. 빈 칸/범위 밖이면 `[]`.
 * "의사합법(pseudo-legal)"이므로 체크(자기 킹 노출)는 고려하지 않는다 — 후속 짝 이슈 범위.
 * 캐슬링·앙파상·승진도 제외한다. 입력 board는 변형하지 않는다(순수 함수, 읽기만 함).
 */
export function pseudoLegalMoves(board: ChessBoard, row: number, col: number): ChessSquare[] {
  const piece = pieceAt(board, row, col);
  if (piece === null) {
    return [];
  }
  const moves: ChessSquare[] = [];
  switch (piece.type) {
    case "pawn":
      pawnMoves(board, row, col, piece.color, moves);
      break;
    case "knight":
      for (const [dr, dc] of KNIGHT_OFFSETS) {
        stepMove(board, row + dr, col + dc, piece.color, moves);
      }
      break;
    case "bishop":
      slidingMoves(board, row, col, piece.color, BISHOP_DIRS, moves);
      break;
    case "rook":
      slidingMoves(board, row, col, piece.color, ROOK_DIRS, moves);
      break;
    case "queen":
      slidingMoves(board, row, col, piece.color, ROOK_DIRS, moves);
      slidingMoves(board, row, col, piece.color, BISHOP_DIRS, moves);
      break;
    case "king":
      for (const [dr, dc] of KING_OFFSETS) {
        stepMove(board, row + dr, col + dc, piece.color, moves);
      }
      break;
  }
  return moves;
}

/**
 * 한 색의 모든 의사합법 수 목록(from→to)을 반환한다. 입력 board는 변형하지 않는다.
 * 후속(체크/체크메이트 판정·UI)에서 한 색의 전체 수를 열거할 때 쓴다.
 */
export function pieceColorMoves(
  board: ChessBoard,
  color: ChessColor,
): { from: ChessSquare; to: ChessSquare }[] {
  const result: { from: ChessSquare; to: ChessSquare }[] = [];
  for (let row = 0; row < CHESS_SIZE; row++) {
    for (let col = 0; col < CHESS_SIZE; col++) {
      const piece = board[row]![col]!;
      if (piece === null || piece.color !== color) {
        continue;
      }
      for (const to of pseudoLegalMoves(board, row, col)) {
        result.push({ from: { row, col }, to });
      }
    }
  }
  return result;
}

/**
 * 해당 색 킹의 좌표를 반환한다. 보드에 그 색 킹이 없으면 null.
 * (인공 배치 테스트에서 킹이 없을 수 있으므로 throw하지 않는다.)
 */
export function findKing(board: ChessBoard, color: ChessColor): ChessSquare | null {
  for (let row = 0; row < CHESS_SIZE; row++) {
    for (let col = 0; col < CHESS_SIZE; col++) {
      const piece = board[row]![col]!;
      if (piece !== null && piece.color === color && piece.type === "king") {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * (row,col) 칸이 `byColor` 기물들에게 공격받는지 여부.
 * - 폰은 **대각 전방 두 칸만 공격**한다(전진 칸은 공격 아님 — 그래서 pseudoLegalMoves를
 *   재사용하지 않고 직접 판정한다. pseudoLegalMoves의 폰 대각은 상대 기물이 있을 때만
 *   포함되므로 빈 칸 공격 판정에 부적합).
 * - 나이트·킹·슬라이더(룩/비숍/퀸)는 의사합법 도착칸이 곧 공격 칸이므로 pseudoLegalMoves로 판정.
 *   (막힌 슬라이더는 첫 기물에서 멈추므로 그 너머는 공격하지 않는다.)
 * 입력 board는 변형하지 않는다(읽기만 함).
 */
export function isSquareAttacked(
  board: ChessBoard,
  row: number,
  col: number,
  byColor: ChessColor,
): boolean {
  if (!isOnBoard(row, col)) {
    return false;
  }
  for (let r = 0; r < CHESS_SIZE; r++) {
    for (let c = 0; c < CHESS_SIZE; c++) {
      const piece = board[r]![c]!;
      if (piece === null || piece.color !== byColor) {
        continue;
      }
      if (piece.type === "pawn") {
        // 폰은 전진 방향(white: row 감소, black: row 증가)의 대각 두 칸을 공격한다.
        const dir = piece.color === "white" ? -1 : 1;
        if (r + dir === row && (c - 1 === col || c + 1 === col)) {
          return true;
        }
        continue;
      }
      for (const to of pseudoLegalMoves(board, r, c)) {
        if (to.row === row && to.col === col) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * `color` 킹이 상대에게 공격받는 중이면 true. 킹이 없으면 false.
 */
export function isKingInCheck(board: ChessBoard, color: ChessColor): boolean {
  const king = findKing(board, color);
  if (king === null) {
    return false;
  }
  const opponent: ChessColor = color === "white" ? "black" : "white";
  return isSquareAttacked(board, king.row, king.col, opponent);
}

/**
 * from→to 수를 적용한 새 보드를 반환한다(입력 board 비변형). 단순 이동/포획만(특수 규칙 없음).
 * 배열 슬롯만 새로 만들고 기물 객체는 불변이므로 참조를 공유해도 안전하다.
 */
function applyMove(board: ChessBoard, from: ChessSquare, to: ChessSquare): ChessBoard {
  const next: ChessBoard = board.map((rowCells) => rowCells.slice());
  next[to.row]![to.col] = next[from.row]![from.col]!;
  next[from.row]![from.col] = null;
  return next;
}

/**
 * (row,col) 기물의 **합법 수**: 의사합법 수 중 그 수를 둔 뒤 자기 킹이 장군이 되는 수를 제외한다.
 * 빈 칸/범위 밖이면 `[]`. 가상 보드로 판정하되 입력 board는 변형하지 않는다(순수 함수).
 */
export function legalChessMoves(board: ChessBoard, row: number, col: number): ChessSquare[] {
  const piece = pieceAt(board, row, col);
  if (piece === null) {
    return [];
  }
  const from: ChessSquare = { row, col };
  return pseudoLegalMoves(board, row, col).filter((to) => {
    const after = applyMove(board, from, to);
    return !isKingInCheck(after, piece.color);
  });
}

/**
 * 한 색이 둘 수 있는 모든 합법 수(from→to). 외통/스테일메이트 판정에 사용. board 비변형.
 */
export function colorLegalMoves(
  board: ChessBoard,
  color: ChessColor,
): { from: ChessSquare; to: ChessSquare }[] {
  const result: { from: ChessSquare; to: ChessSquare }[] = [];
  for (let row = 0; row < CHESS_SIZE; row++) {
    for (let col = 0; col < CHESS_SIZE; col++) {
      const piece = board[row]![col]!;
      if (piece === null || piece.color !== color) {
        continue;
      }
      for (const to of legalChessMoves(board, row, col)) {
        result.push({ from: { row, col }, to });
      }
    }
  }
  return result;
}

/**
 * `color`가 장군 상태이면서 합법 수가 하나도 없으면 외통(체크메이트) — true.
 */
export function isCheckmate(board: ChessBoard, color: ChessColor): boolean {
  return isKingInCheck(board, color) && colorLegalMoves(board, color).length === 0;
}

/**
 * `color`가 장군이 아니면서 합법 수가 하나도 없으면 스테일메이트(무승부) — true.
 */
export function isStalemate(board: ChessBoard, color: ChessColor): boolean {
  return !isKingInCheck(board, color) && colorLegalMoves(board, color).length === 0;
}
