// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 페그 솔리테어(Peg Solitaire / 못 빼기): 표준 33칸 English 십자형 보드에서
// 못(peg)이 인접한 못을 상하좌우로 정확히 2칸 뛰어넘어 빈 구멍에 안착하면
// 가운데(뛰어넘긴) 못이 제거된다. 더 둘 수 없을 때 남은 못이 1개면 클리어,
// 그 1개가 중앙이면 완벽 클리어다. 난수 없는 결정적 1인 퍼즐이다.
// UI 연동·턴 오케스트레이션은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 상태 반환).

/** 보드 좌표(0-indexed). row=행, col=열. */
export interface Position {
  row: number;
  col: number;
}

/** 한 수: from의 못이 over의 못을 뛰어넘어 to(빈 칸)로 이동한다. */
export interface PegMove {
  from: Position;
  over: Position;
  to: Position;
}

/**
 * 불변 상태.
 * - size: 보드 한 변 길이(표준 English = 7).
 * - valid: 보드 안의 칸 좌표 키("row,col") 집합(코너 2×2는 보드 밖이라 제외).
 * - pegs: 못이 있는 칸 좌표 키("row,col") 집합(valid의 부분집합).
 */
export interface PegSolitaireState {
  readonly size: number;
  readonly valid: ReadonlySet<string>;
  readonly pegs: ReadonlySet<string>;
}

const STANDARD_SIZE = 7;
// 십자형에서 못이 들어가는 "팔(arm)" 두께. 7×7에서 네 모서리 2×2를 제외한다.
const ARM = 2;

/** 좌표를 집합 키로 변환한다. */
function key(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

/** 표준 English 십자형에서 (row,col)이 보드 안인지 판정한다(코너 2×2 제외). */
function isInsideCross(row: number, col: number, size: number): boolean {
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return false;
  }
  const inHorizontalArm = col >= ARM && col < size - ARM; // 가운데 세로 띠
  const inVerticalArm = row >= ARM && row < size - ARM; // 가운데 가로 띠
  return inHorizontalArm || inVerticalArm;
}

/**
 * 표준 English 십자 시작 상태를 생성한다(매 호출마다 독립 인스턴스).
 * - 7×7에서 네 모서리 2×2 코너를 제외한 33칸이 보드 안(valid).
 * - 중앙(3,3)만 비고 나머지 32칸 모두 못이 있다.
 */
export function createPegSolitaire(): PegSolitaireState {
  const size = STANDARD_SIZE;
  const valid = new Set<string>();
  const pegs = new Set<string>();
  const center: Position = { row: Math.floor(size / 2), col: Math.floor(size / 2) };
  const centerKey = key(center);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!isInsideCross(row, col, size)) {
        continue;
      }
      const k = key({ row, col });
      valid.add(k);
      if (k !== centerKey) {
        pegs.add(k);
      }
    }
  }
  return { size, valid, pegs };
}

/** 두 좌표가 같은 행 또는 같은 열에서 정확히 2칸 떨어졌고, over가 정확히 그 중점인지. */
function isStraightJumpGeometry(move: PegMove): boolean {
  const { from, over, to } = move;
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  // 같은 행(세로 이동 0)에서 가로 2칸, 또는 같은 열(가로 이동 0)에서 세로 2칸.
  const horizontal = rowDelta === 0 && Math.abs(colDelta) === 2;
  const vertical = colDelta === 0 && Math.abs(rowDelta) === 2;
  if (!horizontal && !vertical) {
    return false;
  }
  // over는 from과 to의 정확한 중점이어야 한다(대각선·어긋남 배제).
  return over.row === from.row + rowDelta / 2 && over.col === from.col + colDelta / 2;
}

/**
 * 한 수가 합법인지 판정한다(throw 금지, boolean만).
 * - from·over·to 모두 보드 안 칸이어야 한다(코너·보드 밖이면 불법).
 * - from·over에 못이 있고, to는 빈 칸이어야 한다.
 * - from→to는 같은 행/열에서 정확히 2칸, over가 그 중점이어야 한다(대각선 불가).
 */
export function isLegalPegMove(state: PegSolitaireState, move: PegMove): boolean {
  const { from, over, to } = move;
  const fromKey = key(from);
  const overKey = key(over);
  const toKey = key(to);
  if (!state.valid.has(fromKey) || !state.valid.has(overKey) || !state.valid.has(toKey)) {
    return false;
  }
  if (!isStraightJumpGeometry(move)) {
    return false;
  }
  if (!state.pegs.has(fromKey) || !state.pegs.has(overKey)) {
    return false;
  }
  if (state.pegs.has(toKey)) {
    return false;
  }
  return true;
}

// 상하좌우 4방향(결정적 열거 순서: 위→아래→왼쪽→오른쪽).
const DIRECTIONS: ReadonlyArray<{ dr: number; dc: number }> = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

/**
 * 현재 상태의 모든 합법 점프를 열거한다.
 * 못이 있는 칸을 행→열 오름차순으로 훑고, 각 칸에서 위→아래→왼쪽→오른쪽 순으로 점검한다.
 */
export function legalPegMoves(state: PegSolitaireState): PegMove[] {
  const moves: PegMove[] = [];
  const pegPositions: Position[] = [];
  for (const k of state.pegs) {
    const [row, col] = k.split(",").map(Number) as [number, number];
    pegPositions.push({ row, col });
  }
  pegPositions.sort((a, b) => (a.row - b.row !== 0 ? a.row - b.row : a.col - b.col));
  for (const from of pegPositions) {
    for (const { dr, dc } of DIRECTIONS) {
      const move: PegMove = {
        from,
        over: { row: from.row + dr, col: from.col + dc },
        to: { row: from.row + dr * 2, col: from.col + dc * 2 },
      };
      if (isLegalPegMove(state, move)) {
        moves.push(move);
      }
    }
  }
  return moves;
}

/**
 * 점프를 적용한 새 상태를 반환한다(입력 state 불변).
 * to에 못이 생기고 from·over의 못이 제거된다. 불법 수면 도메인 에러(한국어 사유) throw.
 */
export function applyPegMove(state: PegSolitaireState, move: PegMove): PegSolitaireState {
  if (!isLegalPegMove(state, move)) {
    throw new Error(
      `페그 솔리테어 불법 수: from=(${move.from.row},${move.from.col}) ` +
        `over=(${move.over.row},${move.over.col}) to=(${move.to.row},${move.to.col}) — ` +
        "from·over에 못이 있고 to가 보드 안 빈 칸이며 직선 2칸 점프여야 함",
    );
  }
  const pegs = new Set(state.pegs);
  pegs.delete(key(move.from));
  pegs.delete(key(move.over));
  pegs.add(key(move.to));
  return { size: state.size, valid: state.valid, pegs };
}

/** 남은 못 수. */
export function pegCount(state: PegSolitaireState): number {
  return state.pegs.size;
}

/** 더 둘 수 없는 종국 여부(합법 수가 0개). */
export function isPegSolitaireFinished(state: PegSolitaireState): boolean {
  return legalPegMoves(state).length === 0;
}

/**
 * 클리어 판정: 남은 못이 정확히 1개면 true.
 * requireCenter=true면 그 1개가 중앙 칸일 때만 true(완벽 클리어).
 */
export function isPegSolitaireSolved(state: PegSolitaireState, requireCenter = false): boolean {
  if (state.pegs.size !== 1) {
    return false;
  }
  if (!requireCenter) {
    return true;
  }
  const center = Math.floor(state.size / 2);
  return state.pegs.has(key({ row: center, col: center }));
}
