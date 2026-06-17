// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 도트 앤 박스(Dots and Boxes, 선 긋기)의 격자 모델 + 변(edge) 긋기 + 완성 박스 판정·점수·종료/승자 판정.
// 턴 진행(연속 턴 보너스 누적)·무작위 CPU 수(application)·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 1=선(먼저 두는 쪽), 2=후. 색 비의존 — 후속 UI는 기호/레이블 병행. */
export type DotsPlayer = 1 | 2;

/**
 * 변(edge) 좌표.
 * - 수평 변("h")은 점 (row,col)–(row,col+1) 사이: row ∈ 0..rows, col ∈ 0..cols-1.
 * - 수직 변("v")은 점 (row,col)–(row+1,col) 사이: row ∈ 0..rows-1, col ∈ 0..cols.
 */
export interface DotsEdge {
  orientation: "h" | "v";
  row: number;
  col: number;
}

/** 박스 소유자(없으면 null). */
export type DotsBoxOwner = DotsPlayer | null;

/** rows×cols 박스 격자. 변은 그어졌는지(boolean), 박스는 소유자를 보관한다. */
export interface DotsBoard {
  rows: number;
  cols: number;
  /** 그어진 변. h[row][col]: row 0..rows, col 0..cols-1 / v[row][col]: row 0..rows-1, col 0..cols. */
  edges: { h: boolean[][]; v: boolean[][] };
  /** 박스 소유자. boxes[row][col]: row 0..rows-1, col 0..cols-1. */
  boxes: DotsBoxOwner[][];
}

function makeGrid<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

/** 빈 격자(모든 변 미사용·박스 무소유) 새 인스턴스를 반환한다. 매 호출마다 독립 인스턴스. */
export function createDotsAndBoxesBoard(rows: number, cols: number): DotsBoard {
  return {
    rows,
    cols,
    edges: {
      // 수평 변: (rows+1)개 행 × cols개 열.
      h: makeGrid(rows + 1, cols, false),
      // 수직 변: rows개 행 × (cols+1)개 열.
      v: makeGrid(rows, cols + 1, false),
    },
    boxes: makeGrid<DotsBoxOwner>(rows, cols, null),
  };
}

function isPlayer(value: unknown): value is DotsPlayer {
  return value === 1 || value === 2;
}

/** edge가 보드 범위 안의 유효한 변인지 여부(비정수 포함 거부). */
function isEdgeInRange(board: DotsBoard, edge: DotsEdge): boolean {
  const { orientation, row, col } = edge;
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return false;
  }
  if (orientation === "h") {
    return row >= 0 && row <= board.rows && col >= 0 && col < board.cols;
  }
  if (orientation === "v") {
    return row >= 0 && row < board.rows && col >= 0 && col <= board.cols;
  }
  return false;
}

/** 해당 변이 이미 그어졌는지 여부(범위 밖이면 false). */
function isEdgeDrawn(board: DotsBoard, edge: DotsEdge): boolean {
  if (!isEdgeInRange(board, edge)) {
    return false;
  }
  const grid = edge.orientation === "h" ? board.edges.h : board.edges.v;
  return grid[edge.row]![edge.col]!;
}

/** 아직 안 그어진 모든 변을 열거한다(수평 먼저, 행→열 오름차순; 이어서 수직). */
export function availableEdges(board: DotsBoard): DotsEdge[] {
  const result: DotsEdge[] = [];
  for (let row = 0; row <= board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (!board.edges.h[row]![col]!) {
        result.push({ orientation: "h", row, col });
      }
    }
  }
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col <= board.cols; col += 1) {
      if (!board.edges.v[row]![col]!) {
        result.push({ orientation: "v", row, col });
      }
    }
  }
  return result;
}

/** (row,col) 박스의 네 변이 next 보드 기준 모두 그어졌는지 여부. */
function isBoxComplete(edges: DotsBoard["edges"], row: number, col: number): boolean {
  return (
    edges.h[row]![col]! && // 위
    edges.h[row + 1]![col]! && // 아래
    edges.v[row]![col]! && // 왼쪽
    edges.v[row]![col + 1]! // 오른쪽
  );
}

/** 보드를 깊은 복제한다(입력 불변 보장용). */
function cloneBoard(board: DotsBoard): DotsBoard {
  return {
    rows: board.rows,
    cols: board.cols,
    edges: {
      h: board.edges.h.map((r) => r.slice()),
      v: board.edges.v.map((r) => r.slice()),
    },
    boxes: board.boxes.map((r) => r.slice()),
  };
}

/**
 * edge를 player가 긋는다. 입력 불변·새 보드 반환.
 * - 이 수로 완성된 박스 좌표 목록을 함께 돌려준다(0개면 상대 턴, 1개 이상이면 한 번 더).
 * - 이미 그어진 변/범위 밖/잘못된 player면 throw 없이 거부한다(원본 board를 그대로, completed=[]).
 */
export function drawEdge(
  board: DotsBoard,
  edge: DotsEdge,
  player: DotsPlayer,
): { board: DotsBoard; completed: { row: number; col: number }[] } {
  if (!isPlayer(player) || !isEdgeInRange(board, edge) || isEdgeDrawn(board, edge)) {
    return { board, completed: [] };
  }

  const next = cloneBoard(board);
  const grid = edge.orientation === "h" ? next.edges.h : next.edges.v;
  grid[edge.row]![edge.col] = true;

  // 이 변에 인접한 박스(최대 2개)만 검사하면 충분하다.
  const candidates: { row: number; col: number }[] = [];
  if (edge.orientation === "h") {
    candidates.push({ row: edge.row - 1, col: edge.col }); // 위쪽 박스
    candidates.push({ row: edge.row, col: edge.col }); // 아래쪽 박스
  } else {
    candidates.push({ row: edge.row, col: edge.col - 1 }); // 왼쪽 박스
    candidates.push({ row: edge.row, col: edge.col }); // 오른쪽 박스
  }

  const completed: { row: number; col: number }[] = [];
  for (const { row, col } of candidates) {
    if (row < 0 || row >= next.rows || col < 0 || col >= next.cols) {
      continue;
    }
    if (next.boxes[row]![col] === null && isBoxComplete(next.edges, row, col)) {
      next.boxes[row]![col] = player;
      completed.push({ row, col });
    }
  }

  return { board: next, completed };
}

/** 모든 변이 그어졌으면 true(더 그을 변이 없음). */
export function isDotsGameOver(board: DotsBoard): boolean {
  return availableEdges(board).length === 0;
}

/** player가 소유한 박스 수. */
export function countDotsBoxes(board: DotsBoard, player: DotsPlayer): number {
  let count = 0;
  for (const row of board.boxes) {
    for (const owner of row) {
      if (owner === player) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 종료 시 박스가 더 많은 승자(1|2), 동수면 null(무승부), 진행 중이면 undefined.
 */
export function findDotsWinner(board: DotsBoard): DotsPlayer | null | undefined {
  if (!isDotsGameOver(board)) {
    return undefined;
  }
  const p1 = countDotsBoxes(board, 1);
  const p2 = countDotsBoxes(board, 2);
  if (p1 === p2) {
    return null;
  }
  return p1 > p2 ? 1 : 2;
}
