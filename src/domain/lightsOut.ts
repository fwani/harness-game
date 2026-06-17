// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 라이트 아웃(Lights Out): NxN 격자에서 한 칸을 누르면 그 칸 + 상하좌우 인접 칸의 on/off가
// 토글되고, 모든 칸을 끄면 클리어하는 단판 퍼즐. 기존 퍼즐 패밀리(hanoi/slidePuzzle/minesweeper)와
// 같은 결의 결정적 순수 함수로, 입력 보드를 변형하지 않고 새 보드를 반환한다(불변).
// 무작위 solvable 시작 보드 생성(application의 RandomSource 주입)·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 행 우선(row-major) 정사각 보드. board[row][col]. true = 켜짐(on). */
export type LightsOutBoard = boolean[][];

/** 보드 위 한 칸 좌표. row = 행, col = 열. */
export interface LightsOutPos {
  row: number;
  col: number;
}

// 누른 칸 + 상하좌우 인접 칸의 단위 방향 벡터. [dRow, dCol]. 대각선은 포함하지 않는다.
const TOGGLE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * size×size 보드를 만든다(기본 5). 모든 칸은 꺼짐(false).
 * - size가 정수가 아니거나 1 미만이면 throw(한국어 사유).
 */
export function createLightsOutBoard(size = 5): LightsOutBoard {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`라이트 아웃 잘못된 크기: size는 1 이상의 정수여야 함(받은 값: ${size})`);
  }
  return Array.from({ length: size }, () => Array.from({ length: size }, () => false));
}

/** pos가 보드 경계 안의 정수 좌표면 true. */
export function inLightsOutBounds(board: LightsOutBoard, pos: LightsOutPos): boolean {
  const { row, col } = pos;
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < board.length &&
    col >= 0 &&
    col < (board[row]?.length ?? 0)
  );
}

/**
 * (row,col)을 누른 결과 보드를 새로 반환한다(입력 불변).
 * 누른 칸 + 상하좌우 인접 칸의 on/off를 토글한다(대각선 제외). 경계 밖 인접은 무시한다.
 * - 경계 밖/비정수 좌표면 throw(조용한 무시 금지 — 도메인 에러).
 */
export function pressLight(board: LightsOutBoard, pos: LightsOutPos): LightsOutBoard {
  if (!inLightsOutBounds(board, pos)) {
    throw new Error(
      `라이트 아웃 경계 밖 좌표: (row=${pos.row}, col=${pos.col})는 보드 범위를 벗어남`,
    );
  }
  const next = board.map((rowCells) => rowCells.slice());
  for (const [dr, dc] of TOGGLE_OFFSETS) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (r >= 0 && r < next.length && c >= 0 && c < (next[r]?.length ?? 0)) {
      next[r]![c] = !next[r]![c];
    }
  }
  return next;
}

/** 모든 칸이 꺼졌으면(클리어) true. 빈 보드도 정의상 모두 꺼짐이라 true. */
export function isLightsOutSolved(board: LightsOutBoard): boolean {
  return board.every((rowCells) => rowCells.every((lit) => !lit));
}

/** 켜져 있는(on) 칸 수(진행도 표시용). */
export function countLitCells(board: LightsOutBoard): number {
  let count = 0;
  for (const rowCells of board) {
    for (const lit of rowCells) {
      if (lit) {
        count += 1;
      }
    }
  }
  return count;
}
