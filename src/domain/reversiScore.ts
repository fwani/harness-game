// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 오델로(Reversi)의 종료 판정 + 계가(디스크 집계·승자 판정). 보드/뒤집힘/합법성·합법 수
// 열거 규칙은 reversi.ts / reversiMoves.ts를 재사용하며 재정의하지 않는다.
// goScore.ts / janggiScore.ts의 계가 컨벤션(흑/백 집계 + winner, 동점 null)과 결을 맞춘다.
// 턴 진행·패스 누적은 application 범위 밖이다.

import type { Board, Stone } from "./reversi";
import { hasLegalReversiMove } from "./reversiMoves";

export interface ReversiScore {
  black: number; // 보드 위 흑 디스크 수
  white: number; // 보드 위 백 디스크 수
  empty: number; // 빈 칸 수
  winner: Stone | null; // 디스크가 많은 쪽. 동수면 null(무승부)
}

/**
 * 보드 위 흑/백 디스크와 빈 칸을 집계하고 승자를 판정한다(입력 board는 변형하지 않는다).
 * winner는 black>white면 "black", white>black이면 "white", 같으면 null(무승부).
 */
export function countReversiDiscs(board: Board): ReversiScore {
  let black = 0;
  let white = 0;
  let empty = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") {
        black += 1;
      } else if (cell === "white") {
        white += 1;
      } else {
        empty += 1;
      }
    }
  }

  let winner: Stone | null;
  if (black > white) {
    winner = "black";
  } else if (white > black) {
    winner = "white";
  } else {
    winner = null;
  }

  return { black, white, empty, winner };
}

/**
 * 게임 종료 여부 = 흑·백 누구도 둘 수 있는 합법 수가 없음.
 * hasLegalReversiMove(reversiMoves)를 재사용한다(입력 board는 변형하지 않는다, throw 없음).
 */
export function isReversiGameOver(board: Board): boolean {
  return !hasLegalReversiMove(board, "black") && !hasLegalReversiMove(board, "white");
}
