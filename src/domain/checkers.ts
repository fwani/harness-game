// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 체커(Checkers / 서양 장기, Draughts)의 보드 모델 + 표준 초기 배치 + 기초 조회 헬퍼.
// 행 우선(row-major) 보드 컨벤션은 gomoku.ts/reversi.ts/connectFour.ts와 동일하다
// (board[row][col], row 0 = 최상단). 이동·점프(포획)·승급·합법 수 열거·턴 진행은
// 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 체커 진영 색. 색만으로 구분하지 않도록 후속 UI는 기호+레이블 병행(UX_GUIDELINES 참고). */
export type CheckersColor = "dark" | "light";

/** 보드 위 기물. king이면 양방향 이동/점프 가능. */
export interface CheckersPiece {
  color: CheckersColor;
  king: boolean;
}

/** 한 칸: 기물 또는 빈 칸. */
export type CheckersCell = CheckersPiece | null;

/** 8×8 보드, board[row][col]. */
export type CheckersBoard = CheckersCell[][];

/** 표준 영국식 체커 보드 크기(8×8). */
const CHECKERS_SIZE = 8;

/**
 * (row+col)%2===1 이면 어두운 칸(기물이 놓이는 칸). 순수 산술 — 범위 검증은 하지 않는다.
 */
export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

/**
 * 표준 초기 배치된 새 보드를 반환한다(매 호출마다 새 인스턴스, 기물 객체도 공유 금지).
 * - 위쪽 3개 행(row 0~2)의 어두운 칸: light, 아래쪽 3개 행(row 5~7)의 어두운 칸: dark.
 * - 가운데 두 행(row 3~4)은 빈 칸. 각 색 정확히 12개. 모든 기물 king=false.
 */
export function createCheckersBoard(): CheckersBoard {
  const board: CheckersBoard = Array.from({ length: CHECKERS_SIZE }, () =>
    Array.from({ length: CHECKERS_SIZE }, () => null),
  );
  for (let row = 0; row < CHECKERS_SIZE; row++) {
    for (let col = 0; col < CHECKERS_SIZE; col++) {
      if (!isDarkSquare(row, col)) {
        continue;
      }
      if (row <= 2) {
        board[row]![col] = { color: "light", king: false };
      } else if (row >= 5) {
        board[row]![col] = { color: "dark", king: false };
      }
    }
  }
  return board;
}

function inBounds(board: CheckersBoard, row: number, col: number): boolean {
  return row >= 0 && row < board.length && col >= 0 && col < (board[row]?.length ?? 0);
}

/**
 * 범위 밖이면 null, 아니면 해당 칸 값을 반환한다(throw 금지 — reversi.cellAt 결과 맞춤).
 */
export function pieceAt(board: CheckersBoard, row: number, col: number): CheckersCell {
  if (!inBounds(board, row, col)) {
    return null;
  }
  return board[row]![col]!;
}

/** 보드 위 주어진 색 기물 개수를 센다(king 포함). */
export function countCheckersPieces(board: CheckersBoard, color: CheckersColor): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.color === color) {
        count++;
      }
    }
  }
  return count;
}

/** 보드 위 한 칸의 좌표. */
export interface CheckersCoord {
  row: number;
  col: number;
}

/** 한 수: from→to 이동. 점프(포획)면 captured에 포획 좌표가 있다. */
export interface CheckersMove {
  from: CheckersCoord;
  to: CheckersCoord;
  captured?: CheckersCoord; // 점프면 포획 좌표, 단순 이동이면 없음
}

/** 대각선 열 방향(좌/우). */
const COL_DIRS: readonly number[] = [-1, 1];

/**
 * 기물이 이동/점프할 수 있는 행 방향 목록.
 * - 일반 기물: 자기 진영에서 멀어지는 전진 방향만(light=+1 아래로, dark=-1 위로).
 *   `createCheckersBoard` 초기 배치 기준(light는 위쪽 row 0~2, dark는 아래쪽 row 5~7).
 * - king: 전진/후진 양 방향.
 */
function rowDirs(piece: CheckersPiece): number[] {
  const forward = piece.color === "light" ? 1 : -1;
  return piece.king ? [forward, -forward] : [forward];
}

/** 일반 기물이 승급(king)하는 행: light는 마지막 행, dark는 0행. */
function promotionRow(board: CheckersBoard, color: CheckersColor): number {
  return color === "light" ? board.length - 1 : 0;
}

/** 입력 보드를 변형하지 않도록 보드와 기물 객체를 모두 깊은 복사한다. */
function cloneCheckersBoard(board: CheckersBoard): CheckersBoard {
  return board.map((row) => row.map((cell) => (cell === null ? null : { ...cell })));
}

/** (row,col) 기물이 둘 수 있는 단순(비포획) 이동 목록. 기물이 없으면 빈 배열. */
function simpleMovesFrom(board: CheckersBoard, row: number, col: number): CheckersMove[] {
  const piece = pieceAt(board, row, col);
  if (piece === null) {
    return [];
  }
  const moves: CheckersMove[] = [];
  for (const dr of rowDirs(piece)) {
    for (const dc of COL_DIRS) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (inBounds(board, toRow, toCol) && pieceAt(board, toRow, toCol) === null) {
        moves.push({ from: { row, col }, to: { row: toRow, col: toCol } });
      }
    }
  }
  return moves;
}

/** (row,col) 기물이 둘 수 있는 점프(포획) 이동 목록. 기물이 없으면 빈 배열. */
function jumpMovesFrom(board: CheckersBoard, row: number, col: number): CheckersMove[] {
  const piece = pieceAt(board, row, col);
  if (piece === null) {
    return [];
  }
  const moves: CheckersMove[] = [];
  for (const dr of rowDirs(piece)) {
    for (const dc of COL_DIRS) {
      const midRow = row + dr;
      const midCol = col + dc;
      const toRow = row + 2 * dr;
      const toCol = col + 2 * dc;
      const mid = pieceAt(board, midRow, midCol);
      if (
        mid !== null &&
        mid.color !== piece.color &&
        inBounds(board, toRow, toCol) &&
        pieceAt(board, toRow, toCol) === null
      ) {
        moves.push({
          from: { row, col },
          to: { row: toRow, col: toCol },
          captured: { row: midRow, col: midCol },
        });
      }
    }
  }
  return moves;
}

/**
 * color의 합법 수 전체를 열거한다. 점프가 하나라도 있으면 점프 수만 반환한다(강제 점프).
 * 멀티 점프는 한 점프 단위로 반환하며, 연속 가능 여부는 `canJumpAgain`으로 판단한다.
 * - 입력 board를 변형하지 않는다.
 */
export function legalCheckersMoves(board: CheckersBoard, color: CheckersColor): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const simples: CheckersMove[] = [];
  for (let row = 0; row < board.length; row++) {
    const cells = board[row] ?? [];
    for (let col = 0; col < cells.length; col++) {
      const piece = cells[col];
      if (piece === null || piece === undefined || piece.color !== color) {
        continue;
      }
      jumps.push(...jumpMovesFrom(board, row, col));
      simples.push(...simpleMovesFrom(board, row, col));
    }
  }
  return jumps.length > 0 ? jumps : simples;
}

/**
 * move를 적용한 새 보드를 반환한다(입력 board 불변).
 * 포획 기물 제거 + 일반 기물이 상대 진영 마지막 행에 도달하면 king 승급을 반영한다.
 * - from에 기물이 없으면 보드를 그대로(복사본) 반환한다(방어적 처리).
 */
export function applyCheckersMove(board: CheckersBoard, move: CheckersMove): CheckersBoard {
  const next = cloneCheckersBoard(board);
  const piece = pieceAt(next, move.from.row, move.from.col);
  if (piece === null) {
    return next;
  }
  next[move.from.row]![move.from.col] = null;
  if (move.captured !== undefined) {
    if (inBounds(next, move.captured.row, move.captured.col)) {
      next[move.captured.row]![move.captured.col] = null;
    }
  }
  const promoted = !piece.king && move.to.row === promotionRow(board, piece.color);
  next[move.to.row]![move.to.col] = { color: piece.color, king: piece.king || promoted };
  return next;
}

/**
 * 방금 점프한 기물(cell)이 이어서 또 점프할 수 있으면 true(멀티 점프 연속 판단).
 * - cell에 기물이 없으면 false.
 */
export function canJumpAgain(board: CheckersBoard, cell: CheckersCoord): boolean {
  return jumpMovesFrom(board, cell.row, cell.col).length > 0;
}

/** color에게 합법 수가 하나라도 있으면 true. */
export function hasAnyLegalMove(board: CheckersBoard, color: CheckersColor): boolean {
  return legalCheckersMoves(board, color).length > 0;
}

/**
 * 승부 판정. 한쪽이 기물이 없거나 다음 둘 색(toMove)이 둘 수가 없으면(스테일메이트) 패배.
 * 승자 색을 반환하고, 아직 진행 중이면 null.
 */
export function findCheckersWinner(
  board: CheckersBoard,
  toMove: CheckersColor,
): CheckersColor | null {
  const other: CheckersColor = toMove === "dark" ? "light" : "dark";
  if (countCheckersPieces(board, "dark") === 0) {
    return "light";
  }
  if (countCheckersPieces(board, "light") === 0) {
    return "dark";
  }
  if (!hasAnyLegalMove(board, toMove)) {
    return other;
  }
  return null;
}
