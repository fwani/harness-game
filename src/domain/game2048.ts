// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 2048: 4×4 격자에서 한 방향으로 타일을 밀어(슬라이드) 같은 수가 만나면 합쳐지는(병합)
// 순수 규칙만 다룬다. 무작위 타일 스폰·한 판 진행·UI 연동은 이 모듈 범위 밖이다
// (application + RandomSource 주입, 후속 짝 이슈). 행 우선(row-major) 보드 컨벤션을 따른다.

export type Tile = number; // 0=빈 칸, 그 외 2의 거듭제곱(2,4,8,...)
export type Board = Tile[][]; // board[row][col], 표준 4×4
export type Direction = "left" | "right" | "up" | "down";

/** 표준 2048 보드 크기(4×4). */
export const BOARD_SIZE = 4;

/** 기본 목표 타일. */
export const DEFAULT_TARGET = 2048;

/** 모든 칸이 0인 4×4 보드를 새로 생성한다(매 호출마다 새 인스턴스). */
export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
}

/**
 * 한 줄(왼쪽 방향 기준)을 슬라이드+병합한 결과와 획득 점수를 반환한다(입력 불변).
 * - 0이 아닌 타일을 왼쪽으로 모은 뒤, 인접한 같은 값을 한 번씩만 병합한다.
 * - 한 이동에서 같은 타일이 두 번 병합되지 않는다(예: [2,2,2,2] → [4,4,0,0]).
 * - gained: 이번 줄에서 병합으로 생긴 새 타일 값들의 합.
 * - 결과 줄의 길이는 입력과 동일하며 뒤쪽을 0으로 채운다.
 */
export function slideLine(line: Tile[]): { line: Tile[]; gained: number } {
  const size = line.length;
  // 0이 아닌 타일만 순서대로 모은다.
  const compacted = line.filter((tile) => tile !== 0);
  const merged: Tile[] = [];
  let gained = 0;
  for (let i = 0; i < compacted.length; i++) {
    const current = compacted[i]!;
    const next = compacted[i + 1];
    if (next !== undefined && next === current) {
      // 같은 값 인접 쌍을 한 번 병합하고 다음 타일을 건너뛴다.
      const sum = current * 2;
      merged.push(sum);
      gained += sum;
      i++;
    } else {
      merged.push(current);
    }
  }
  // 원래 길이에 맞춰 뒤를 0으로 채운다.
  while (merged.length < size) {
    merged.push(0);
  }
  return { line: merged, gained };
}

/** 보드를 깊은 복사한다(불변성 보장용 내부 헬퍼). */
function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/** 두 보드가 동일한지 비교한다(같은 형태 가정). */
function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let r = 0; r < a.length; r++) {
    const rowA = a[r]!;
    const rowB = b[r]!;
    if (rowA.length !== rowB.length) {
      return false;
    }
    for (let c = 0; c < rowA.length; c++) {
      if (rowA[c] !== rowB[c]) {
        return false;
      }
    }
  }
  return true;
}

/** 보드를 전치(transpose)한다 — 행과 열을 맞바꾼다(직사각형 가정). */
function transpose(board: Board): Board {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const result: Board = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    for (let c = 0; c < cols; c++) {
      result[c]![r] = row[c] ?? 0;
    }
  }
  return result;
}

/** 각 행을 좌우 반전한다. */
function flipRows(board: Board): Board {
  return board.map((row) => [...row].reverse());
}

/**
 * 방향으로 전체 보드를 슬라이드+병합한 결과를 반환한다(입력 보드 불변).
 * - moved: 결과 보드가 입력과 달라졌는지(변화 없으면 false).
 * - gained: 이번 이동으로 병합되어 얻은 점수 합.
 * - 모든 방향을 좌측 슬라이드로 환원(전치/뒤집기)해 처리한다.
 * - 새 타일 스폰은 하지 않는다(application의 몫).
 * - 빈/비정상 보드는 안전하게 처리한다(변화 없는 입력 사본을 moved=false로 반환).
 */
export function applyMove(
  board: Board,
  dir: Direction,
): { board: Board; moved: boolean; gained: number } {
  if (!Array.isArray(board) || board.length === 0) {
    return { board: [], moved: false, gained: 0 };
  }

  // 좌측 슬라이드 기준으로 환원하기 위한 변환(forward)과 역변환(backward).
  // - left:  그대로
  // - right: 행 반전 → 슬라이드 → 행 반전
  // - up:    전치 → 슬라이드 → 전치
  // - down:  전치 → 행 반전 → 슬라이드 → 행 반전 → 전치
  let working: Board;
  switch (dir) {
    case "left":
      working = cloneBoard(board);
      break;
    case "right":
      working = flipRows(board);
      break;
    case "up":
      working = transpose(board);
      break;
    case "down":
      working = flipRows(transpose(board));
      break;
  }

  let gained = 0;
  const slid: Board = working.map((row) => {
    const result = slideLine(row);
    gained += result.gained;
    return result.line;
  });

  // 역변환으로 원래 방향계로 되돌린다.
  let next: Board;
  switch (dir) {
    case "left":
      next = slid;
      break;
    case "right":
      next = flipRows(slid);
      break;
    case "up":
      next = transpose(slid);
      break;
    case "down":
      next = transpose(flipRows(slid));
      break;
  }

  const moved = !boardsEqual(board, next);
  return { board: next, moved, gained };
}

/**
 * 어느 방향으로든 합법 이동(변화)이 가능한지. 모두 불가면 게임 오버(false).
 * - 빈 칸이 하나라도 있으면 즉시 true.
 * - 빈 칸이 없어도 인접(상하좌우) 같은 값 쌍이 있으면 병합 가능 → true.
 */
export function canMove(board: Board): boolean {
  if (!Array.isArray(board) || board.length === 0) {
    return false;
  }
  const rows = board.length;
  for (let r = 0; r < rows; r++) {
    const row = board[r]!;
    const cols = row.length;
    for (let c = 0; c < cols; c++) {
      const value = row[c]!;
      if (value === 0) {
        return true; // 빈 칸 → 이동 가능
      }
      // 오른쪽 이웃과 같은 값?
      if (c + 1 < cols && row[c + 1] === value) {
        return true;
      }
      // 아래 이웃과 같은 값?
      if (r + 1 < rows && board[r + 1]?.[c] === value) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 목표 타일(기본 2048) 이상이 보드에 존재하면 true.
 * - target은 기본 DEFAULT_TARGET. 양의 값이 아니면 false로 안전 처리.
 */
export function hasReachedTarget(board: Board, target: number = DEFAULT_TARGET): boolean {
  if (!Array.isArray(board) || !(target > 0)) {
    return false;
  }
  return board.some((row) => row.some((tile) => tile >= target));
}
