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
