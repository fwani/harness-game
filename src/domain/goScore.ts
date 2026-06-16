// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 바둑(Go)의 영역(area) 계가 — 종료된 보드를 받아 흑/백 점수와 승자를 계산한다.
// go.ts는 계가를 명시적으로 범위 밖에 두므로(주석 참조) 별도 모듈로 분리한다.
// 사석(죽은 돌) 판정·패(ko)는 범위 밖: 보드 위 모든 돌은 살아있다고 가정한다.

import type { Board, Stone } from "./go";

export interface GoScore {
  black: number; // 흑 영역 점수(돌 + 집)
  white: number; // 백 영역 점수(돌 + 집 + 덤)
  /** 빈 칸 분류 집계 */
  territory: { black: number; white: number; neutral: number };
  /** 점수 높은 쪽. 동점이면 null(무승부) */
  winner: Stone | null;
}

// 상하좌우 4방향 인접(대각선 제외). go.ts와 동일한 인접 정의.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < board.length;
}

/**
 * 영역(area) 계가로 흑/백 점수와 승자를 계산한다(입력 board는 변형하지 않는다).
 *
 * 각 색의 점수 = (보드 위 자기 돌 수) + (자기 집으로 인정되는 빈 칸 수).
 * 빈 칸 영역을 4방향 flood-fill로 묶고, 경계(인접 돌)가 한 색으로만 이뤄지면
 * 그 색의 집, 두 색 모두에 닿거나(공배) 경계 돌이 없으면 중립이다.
 *
 * @param komi 백 점수에 더할 덤. 기본 0(동점=무승부 가능).
 * @returns black/white 점수, territory 분류, winner(동점이면 null).
 */
export function scoreArea(board: Board, komi = 0): GoScore {
  const size = board.length;

  let blackStones = 0;
  let whiteStones = 0;
  const territory = { black: 0, white: 0, neutral: 0 };

  // 방문한 빈 칸을 표시해 같은 영역을 두 번 세지 않는다.
  const visited = new Set<string>();

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = board[y]![x]!;
      if (cell === "black") {
        blackStones += 1;
        continue;
      }
      if (cell === "white") {
        whiteStones += 1;
        continue;
      }
      // 빈 칸: 아직 방문하지 않았다면 영역 전체를 flood-fill로 분류한다.
      const key = `${x},${y}`;
      if (visited.has(key)) {
        continue;
      }
      const region = floodFillEmpty(board, x, y, visited);
      if (region.touchesBlack && !region.touchesWhite) {
        territory.black += region.size;
      } else if (region.touchesWhite && !region.touchesBlack) {
        territory.white += region.size;
      } else {
        territory.neutral += region.size;
      }
    }
  }

  const black = blackStones + territory.black;
  const white = whiteStones + territory.white + komi;

  let winner: Stone | null;
  if (black > white) {
    winner = "black";
  } else if (white > black) {
    winner = "white";
  } else {
    winner = null;
  }

  return { black, white, territory, winner };
}

// (x,y)에서 시작하는 빈 칸 영역을 4방향으로 묶고, 경계가 어느 색에 닿는지와
// 영역 크기를 반환한다. 방문한 빈 칸은 visited에 기록한다.
function floodFillEmpty(
  board: Board,
  x: number,
  y: number,
  visited: Set<string>,
): { size: number; touchesBlack: boolean; touchesWhite: boolean } {
  let size = 0;
  let touchesBlack = false;
  let touchesWhite = false;

  const stack: Array<[number, number]> = [[x, y]];
  visited.add(`${x},${y}`);

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    size += 1;
    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(board, nx, ny)) {
        continue;
      }
      const cell = board[ny]![nx]!;
      if (cell === "black") {
        touchesBlack = true;
      } else if (cell === "white") {
        touchesWhite = true;
      } else {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          stack.push([nx, ny]);
        }
      }
    }
  }

  return { size, touchesBlack, touchesWhite };
}
