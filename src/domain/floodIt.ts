// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 플러드 잇(Flood-It): NxN 색 격자에서 좌상단(0,0)을 기준으로, 매 턴 한 색을 골라
// 좌상단과 4방 인접으로 연결된 동일 색 영역(flood region)을 그 색으로 칠한다. 칠할 때마다
// 영역이 인접한 같은 새 색 칸으로 확장되고, 보드 전체가 한 색이 되면 클리어한다.
// 결정적 순수 규칙만 이 모듈 범위다. 무작위 시작 보드 생성(application의 RandomSource 주입)·
// UI 연동은 이 모듈 밖이다(후속 짝 이슈).
// 모든 함수는 결정적 순수 함수이며 입력(board/state)을 변형하지 않는다(새 상태 반환).

/** 색 인덱스(0..colorCount-1). 색상값이 아니라 인덱스로 다뤄 UI에서 색 비의존 렌더가 가능하다. */
export type Color = number;

/** 보드 좌표(0-indexed). row=행, col=열. */
export interface Position {
  row: number;
  col: number;
}

/**
 * 불변 상태.
 * - size: 정사각 보드 한 변 길이.
 * - colorCount: 사용 색 개수(각 칸은 0..colorCount-1).
 * - board: 행 우선(row-major) 색 격자. board[row][col].
 */
export interface FloodItState {
  readonly size: number;
  readonly colorCount: number;
  readonly board: ReadonlyArray<ReadonlyArray<Color>>;
}

// 4방 인접(상/하/좌/우). 대각선은 포함하지 않는다.
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * 주어진 격자로 상태를 생성한다(입력을 깊은 복사해 외부 변형과 격리).
 * - board가 비어 있지 않은 정사각(각 행 길이 = 행 수)이어야 함.
 * - colorCount가 1 이상의 정수여야 함.
 * - 각 칸이 0..colorCount-1 범위의 정수여야 함.
 * 위반 시 throw(한국어 사유).
 */
export function createFloodIt(board: Color[][], colorCount: number): FloodItState {
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new Error(`플러드 잇 잘못된 색 개수: colorCount는 1 이상의 정수여야 함(받은 값: ${colorCount})`);
  }
  const size = board.length;
  if (size < 1) {
    throw new Error("플러드 잇 잘못된 보드: 최소 1×1 격자여야 함(빈 보드 불가)");
  }
  for (let row = 0; row < size; row += 1) {
    const cells = board[row];
    if (!Array.isArray(cells) || cells.length !== size) {
      throw new Error(
        `플러드 잇 정사각이 아님: row ${row} 길이=${cells?.length ?? 0}, 기대=${size}`,
      );
    }
    for (let col = 0; col < size; col += 1) {
      const color = cells[col];
      if (typeof color !== "number" || !Number.isInteger(color) || color < 0 || color >= colorCount) {
        throw new Error(
          `플러드 잇 색 범위 밖: (row=${row}, col=${col})=${color}는 0..${colorCount - 1} 밖`,
        );
      }
    }
  }
  return {
    size,
    colorCount,
    board: board.map((cells) => cells.slice()),
  };
}

/** 좌상단(0,0)의 현재 색. createFloodIt가 비어 있지 않은 정사각을 보장한다. */
export function topLeftColor(state: FloodItState): Color {
  return state.board[0]![0]!;
}

/**
 * 좌상단(0,0)과 4방 인접으로 연결된 동일 색 영역(flood region)의 좌표 목록을 반환한다.
 * 연결 성분만(대각선 제외). 반환 순서는 BFS 순서로 결정적이다.
 */
export function currentRegion(state: FloodItState): Position[] {
  const { size, board } = state;
  const target = topLeftColor(state);
  const visited = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const region: Position[] = [];
  const queue: Position[] = [{ row: 0, col: 0 }];
  visited[0]![0] = true;
  while (queue.length > 0) {
    const pos = queue.shift() as Position;
    region.push(pos);
    for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
      const row = pos.row + dRow;
      const col = pos.col + dCol;
      if (
        row >= 0 &&
        row < size &&
        col >= 0 &&
        col < size &&
        !visited[row]![col] &&
        board[row]![col] === target
      ) {
        visited[row]![col] = true;
        queue.push({ row, col });
      }
    }
  }
  return region;
}

/**
 * color가 현재 둘 수 있는 합법 수인지 판정한다.
 * - 0..colorCount-1 범위의 정수이며, 현재 좌상단 색과 다른 색이어야 의미 있는 수.
 * - 같은 색 선택은 보드 불변이라 불법/무의미로 정의한다.
 */
export function isLegalFloodMove(state: FloodItState, color: Color): boolean {
  if (!Number.isInteger(color) || color < 0 || color >= state.colorCount) {
    return false;
  }
  return color !== topLeftColor(state);
}

/** 현재 둘 수 있는(좌상단 색과 다른) 색 목록을 오름차순으로 반환한다. */
export function legalFloodMoves(state: FloodItState): Color[] {
  const moves: Color[] = [];
  for (let color = 0; color < state.colorCount; color += 1) {
    if (isLegalFloodMove(state, color)) {
      moves.push(color);
    }
  }
  return moves;
}

/**
 * flood region을 color로 칠한 새 상태를 반환한다(입력 불변, BFS flood fill).
 * 불법 수(같은 색·범위 밖)는 조용히 무시하지 않고 throw한다.
 */
export function applyFloodMove(state: FloodItState, color: Color): FloodItState {
  if (!Number.isInteger(color) || color < 0 || color >= state.colorCount) {
    throw new Error(
      `플러드 잇 색 범위 밖: ${color}는 0..${state.colorCount - 1} 밖`,
    );
  }
  if (color === topLeftColor(state)) {
    throw new Error(`플러드 잇 불법 수: 현재 좌상단 색(${color})과 같은 색은 둘 수 없음`);
  }
  const region = currentRegion(state);
  const next = state.board.map((cells) => cells.slice());
  for (const { row, col } of region) {
    next[row]![col] = color;
  }
  return {
    size: state.size,
    colorCount: state.colorCount,
    board: next,
  };
}

/** 보드 전체가 단일 색이면 true(클리어). */
export function isFloodItSolved(state: FloodItState): boolean {
  const target = topLeftColor(state);
  for (const cells of state.board) {
    for (const color of cells) {
      if (color !== target) {
        return false;
      }
    }
  }
  return true;
}
