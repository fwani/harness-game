// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 장기(Janggi)의 토대가 되는 보드 모델과 표준 초기 배치. 기물 이동/포획/장군·외통
// 판정·상마 교체(차림) 변형 배치는 이 모듈 범위 밖이다(별도 이슈).

export type Side = "cho" | "han";

export type PieceType =
  | "general"
  | "guard"
  | "elephant"
  | "horse"
  | "chariot"
  | "cannon"
  | "soldier";

export interface Piece {
  side: Side;
  type: PieceType;
}

export type Cell = Piece | null;

/** 행 우선(row-major) 보드. board[y][x]. y: 0..9, x: 0..8. */
export type Board = Cell[][];

/** 장기 보드 너비(가로 9칸). */
export const WIDTH = 9;
/** 장기 보드 높이(세로 10칸). */
export const HEIGHT = 10;

/**
 * 좌표 규약:
 * - `han` 진영은 위쪽(y가 작은 쪽)에 둔다. 1선(back rank)은 y=0, 궁성은 y=0..2, 장은 (4,1).
 * - `cho` 진영은 아래쪽(y가 큰 쪽)에 둔다. 1선(back rank)은 y=9, 궁성은 y=7..9, 장은 (4,8).
 * - 두 진영은 보드 중앙선(y=4.5)을 기준으로 상하 대칭으로 배치된다.
 */

/** 9×10 빈 보드(모든 칸 null)를 만든다. */
export function createEmptyBoard(): Board {
  return Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => null as Cell),
  );
}

// 1선(back rank)의 x=0..8 기물 배치. 차/마/상/사/(장은 궁성)/사/상/마/차.
// x=4 자리는 비운다(장은 궁성 중앙에 따로 배치).
const BACK_RANK: ReadonlyArray<PieceType | null> = [
  "chariot",
  "horse",
  "elephant",
  "guard",
  null,
  "guard",
  "elephant",
  "horse",
  "chariot",
];

// 졸·병이 놓이는 열(x=0,2,4,6,8).
const SOLDIER_COLUMNS: ReadonlyArray<number> = [0, 2, 4, 6, 8];

// 포(cannon)가 놓이는 열(x=1,7).
const CANNON_COLUMNS: ReadonlyArray<number> = [1, 7];

// 한 진영의 기물을 보드에 배치한다(입력 보드를 직접 갱신; 호출부에서 복제본을 넘긴다).
// backRankY: 1선 y, generalY: 장 y, cannonY: 포 y, soldierY: 졸·병 y.
function placeSide(
  board: Board,
  side: Side,
  backRankY: number,
  generalY: number,
  cannonY: number,
  soldierY: number,
): void {
  BACK_RANK.forEach((type, x) => {
    if (type !== null) {
      board[backRankY]![x] = { side, type };
    }
  });
  board[generalY]![4] = { side, type: "general" };
  for (const x of CANNON_COLUMNS) {
    board[cannonY]![x] = { side, type: "cannon" };
  }
  for (const x of SOLDIER_COLUMNS) {
    board[soldierY]![x] = { side, type: "soldier" };
  }
}

/**
 * 표준 차림으로 모든 기물이 배치된 새 보드를 반환한다(불변).
 * 진영당 16개(장1·사2·상2·마2·차2·포2·졸5), 합 32개.
 * - han(위): 1선 y=0, 장 (4,1), 포 y=2, 병 y=3.
 * - cho(아래): 1선 y=9, 장 (4,8), 포 y=7, 졸 y=6.
 * (상마 교체 등 변형 차림은 이 이슈 범위 밖 — 한 가지 표준 배치만 구현한다.)
 */
export function createInitialBoard(): Board {
  const board = createEmptyBoard();
  // han: 위쪽. 1선 y=0, 궁성 y=0..2 중앙 장 (4,1), 포 y=2, 병 y=3.
  placeSide(board, "han", 0, 1, 2, 3);
  // cho: 아래쪽. 1선 y=9, 궁성 y=7..9 중앙 장 (4,8), 포 y=7, 졸 y=6.
  placeSide(board, "cho", 9, 8, 7, 6);
  return board;
}

/** (x,y)가 보드 범위(0<=x<9, 0<=y<10) 안인지. */
export function inBounds(board: Board, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < (board[y]?.length ?? 0);
}

/** 범위 밖이면 null, 아니면 해당 칸의 기물(또는 null)을 반환한다(throw하지 않는다). */
export function pieceAt(board: Board, x: number, y: number): Cell {
  if (!inBounds(board, x, y)) {
    return null;
  }
  return board[y]![x]!;
}

// ── 기물 이동/포획 합법 수(legal move) 판정 ─────────────────────────────────
// 빅장(bikjang)·차림 변형·턴 오케스트레이션은 이 모듈 범위 밖이다(별도 이슈).
// 장군(check)·외통수(checkmate) 판정은 파일 하단에 별도로 추가한다.
// 여기서는 "개별 기물의 한 수 이동/포획 합법성"만 다룬다.

/** 보드 좌표. */
export interface Pos {
  x: number;
  y: number;
}

// 궁성 가로 범위(x=3..5). 세로는 진영별로 다르다(han y=0..2, cho y=7..9).
const PALACE_X_MIN = 3;
const PALACE_X_MAX = 5;

// (x,y)가 어느 진영 궁성에 속하는지 — 속하지 않으면 null. 궁성 대각 라인은 진영
// 소유와 무관하게 그 칸의 위치로 결정되므로(차/졸의 궁성 대각) 위치 기준으로 판정한다.
function palaceCenterAt(x: number, y: number): Pos | null {
  if (x < PALACE_X_MIN || x > PALACE_X_MAX) {
    return null;
  }
  if (y >= 0 && y <= 2) {
    return { x: 4, y: 1 }; // han 궁성 중앙
  }
  if (y >= 7 && y <= 9) {
    return { x: 4, y: 8 }; // cho 궁성 중앙
  }
  return null;
}

// `side` 진영의 궁성 안인지(장·사 전용 — 자기 궁성 밖으로 못 나간다).
function inOwnPalace(side: Side, x: number, y: number): boolean {
  if (x < PALACE_X_MIN || x > PALACE_X_MAX) {
    return false;
  }
  return side === "han" ? y >= 0 && y <= 2 : y >= 7 && y <= 9;
}

// 한 칸 대각 스텝이 궁성 대각 라인 위인지: 두 칸이 같은 궁성에 있고,
// 그 중 하나가 궁성 중앙이어야 한다(중앙만 네 귀와 대각으로 연결된다).
function isPalaceDiagStep(from: Pos, to: Pos): boolean {
  const cf = palaceCenterAt(from.x, from.y);
  const ct = palaceCenterAt(to.x, to.y);
  if (cf === null || ct === null || cf.x !== ct.x || cf.y !== ct.y) {
    return false;
  }
  const fromCenter = from.x === cf.x && from.y === cf.y;
  const toCenter = to.x === ct.x && to.y === ct.y;
  return fromCenter || toCenter;
}

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

// from→to 직선/대각 경로의 "사이" 칸(양 끝 제외)이 모두 비어 있는지.
// 호출 전 |dx|,|dy|가 직선 또는 |dx|==|dy| 형태임을 보장해야 한다.
function pathClear(board: Board, from: Pos, to: Pos): boolean {
  const sx = sign(to.x - from.x);
  const sy = sign(to.y - from.y);
  let x = from.x + sx;
  let y = from.y + sy;
  while (x !== to.x || y !== to.y) {
    if (pieceAt(board, x, y) !== null) {
      return false;
    }
    x += sx;
    y += sy;
  }
  return true;
}

// 장(general)·사(guard): 궁성 안에서만 직선 1칸, 궁성 대각 라인에서는 대각 1칸.
function canMoveGeneralGuard(side: Side, from: Pos, to: Pos): boolean {
  if (!inOwnPalace(side, to.x, to.y)) {
    return false;
  }
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx + dy === 1) {
    return true; // 직선 1칸
  }
  if (dx === 1 && dy === 1) {
    return isPalaceDiagStep(from, to); // 궁성 대각 1칸
  }
  return false;
}

// 차(chariot): 직선 임의 칸(경로 막힘 없음) + 궁성 대각 라인 슬라이드.
function canMoveChariot(board: Board, from: Pos, to: Pos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 || dy === 0) {
    return pathClear(board, from, to); // 직선
  }
  if (Math.abs(dx) === Math.abs(dy)) {
    // 궁성 대각: 경로의 모든 칸(양 끝 포함)이 같은 궁성의 대각 점이어야 한다.
    // 한 스텝씩 진행하며 각 칸이 직전 칸과 궁성 대각으로 연결되는지 확인한다.
    const sx = sign(dx);
    const sy = sign(dy);
    let cx = from.x;
    let cy = from.y;
    while (cx !== to.x || cy !== to.y) {
      const next: Pos = { x: cx + sx, y: cy + sy };
      if (!isPalaceDiagStep({ x: cx, y: cy }, next)) {
        return false;
      }
      cx = next.x;
      cy = next.y;
    }
    return pathClear(board, from, to);
  }
  return false;
}

// 포(cannon): 직선으로 정확히 받침 1개를 넘어 이동/포획. 받침·대상이 포면 불가.
function canMoveCannon(board: Board, from: Pos, to: Pos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0) {
    return false; // 직선만
  }
  const sx = sign(dx);
  const sy = sign(dy);
  let x = from.x + sx;
  let y = from.y + sy;
  let screens = 0;
  while (x !== to.x || y !== to.y) {
    const cell = pieceAt(board, x, y);
    if (cell !== null) {
      if (cell.type === "cannon") {
        return false; // 포를 넘을 수 없다
      }
      screens += 1;
    }
    x += sx;
    y += sy;
  }
  if (screens !== 1) {
    return false; // 받침은 정확히 1개
  }
  const dest = pieceAt(board, to.x, to.y);
  if (dest !== null && dest.type === "cannon") {
    return false; // 포를 잡을 수 없다
  }
  return true;
}

// 마(horse): 직진 1 + 대각 1. 직진 지점(멱)이 막히면 불가.
function canMoveHorse(board: Board, from: Pos, to: Pos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (!((adx === 1 && ady === 2) || (adx === 2 && ady === 1))) {
    return false;
  }
  const leg: Pos =
    ady === 2
      ? { x: from.x, y: from.y + sign(dy) }
      : { x: from.x + sign(dx), y: from.y };
  return pieceAt(board, leg.x, leg.y) === null;
}

// 상(elephant): 직진 1 + 대각 2. 경로(직진 1 + 대각 첫 칸)가 막히면 불가.
function canMoveElephant(board: Board, from: Pos, to: Pos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (!((adx === 2 && ady === 3) || (adx === 3 && ady === 2))) {
    return false;
  }
  const sx = sign(dx);
  const sy = sign(dy);
  const step1: Pos =
    ady === 3 ? { x: from.x, y: from.y + sy } : { x: from.x + sx, y: from.y };
  const step2: Pos =
    ady === 3
      ? { x: from.x + sx, y: from.y + 2 * sy }
      : { x: from.x + 2 * sx, y: from.y + sy };
  return (
    pieceAt(board, step1.x, step1.y) === null &&
    pieceAt(board, step2.x, step2.y) === null
  );
}

// 졸·병(soldier): 전진 또는 좌우 1칸(후퇴 불가). 궁성 안에서는 전진 대각 1칸 허용.
// han은 아래쪽(+y), cho는 위쪽(-y)이 전진 방향.
function canMoveSoldier(side: Side, from: Pos, to: Pos): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const forward = side === "han" ? 1 : -1;
  if (dy === 0 && Math.abs(dx) === 1) {
    return true; // 좌우 1칸
  }
  if (dx === 0 && dy === forward) {
    return true; // 전진 1칸
  }
  if (Math.abs(dx) === 1 && dy === forward) {
    return isPalaceDiagStep(from, to); // 궁성 내 전진 대각 1칸
  }
  return false;
}

// 기물 종류별 기하 합법성(아군 위 이동 금지·보드 경계는 isLegalMove에서 선처리).
function canMovePiece(
  board: Board,
  piece: Piece,
  from: Pos,
  to: Pos,
): boolean {
  switch (piece.type) {
    case "general":
    case "guard":
      return canMoveGeneralGuard(piece.side, from, to);
    case "chariot":
      return canMoveChariot(board, from, to);
    case "cannon":
      return canMoveCannon(board, from, to);
    case "horse":
      return canMoveHorse(board, from, to);
    case "elephant":
      return canMoveElephant(board, from, to);
    case "soldier":
      return canMoveSoldier(piece.side, from, to);
  }
}

/**
 * `side` 진영의 from→to 한 수가 합법인지 판정한다(보드 변형 없음).
 * - from에 side 기물이 없으면 false.
 * - to가 보드 밖이거나 to에 자기 기물이 있으면 false(아군 위로 이동 불가).
 * - to에 상대 기물이 있으면 포획 가능(규칙상 도달 가능할 때 true).
 */
export function isLegalMove(
  board: Board,
  side: Side,
  from: Pos,
  to: Pos,
): boolean {
  const piece = pieceAt(board, from.x, from.y);
  if (piece === null || piece.side !== side) {
    return false;
  }
  if (!inBounds(board, to.x, to.y)) {
    return false;
  }
  if (from.x === to.x && from.y === to.y) {
    return false; // 제자리 이동 불가
  }
  const dest = pieceAt(board, to.x, to.y);
  if (dest !== null && dest.side === side) {
    return false; // 아군 위로 이동 불가
  }
  return canMovePiece(board, piece, from, to);
}

/**
 * `side` 기물이 from에서 갈 수 있는 모든 합법 to 좌표 목록(순서 무관).
 *
 * 기하적으로 합법인 수 중, **둔 뒤 자기 장이 잡힐 위치에 놓이는 self-check 수는
 * 제외**한다(`leavesOwnGeneralInCheck`). 그 결과:
 * - 장군(check) 상태에서는 장군을 해소하는 수(왕 피신·중간 차단·공격 기물 포획)만 반환되고,
 * - 어떤 국면에서도 스스로 장을 노출시키는 수는 합법 수에 포함되지 않는다.
 *
 * (자기 장이 보드에 없는 합성/종료 국면에서는 self-check 개념이 없으므로 거르지 않는다.)
 * 보드를 변형하지 않는다.
 */
export function legalMovesFrom(board: Board, side: Side, from: Pos): Pos[] {
  const moves: Pos[] = [];
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const to: Pos = { x, y };
      if (
        isLegalMove(board, side, from, to) &&
        !leavesOwnGeneralInCheck(board, side, from, to)
      ) {
        moves.push(to);
      }
    }
  }
  return moves;
}

// 보드 얕은 복제(행 배열을 새로 만든다 — Cell은 불변 취급).
function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** 합법 수면 from→to를 옮긴(포획 포함) 새 보드를 반환, 불법이면 throw. */
export function applyMove(board: Board, side: Side, from: Pos, to: Pos): Board {
  if (!isLegalMove(board, side, from, to)) {
    throw new Error(
      `불법 수: ${side} (${from.x},${from.y}) -> (${to.x},${to.y})`,
    );
  }
  const next = cloneBoard(board);
  next[to.y]![to.x] = next[from.y]![from.x]!;
  next[from.y]![from.x] = null;
  return next;
}

// ── 장군(check)·외통수(checkmate) 판정 ──────────────────────────────────────
// 순수 함수. 기존 isLegalMove/legalMovesFrom/applyMove를 재사용한다.
// 빅장(bikjang, 장군 마주보기 무승부)·차림 변형·턴 오케스트레이션은 범위 밖이다.

// 상대 진영.
function opponentOf(side: Side): Side {
  return side === "han" ? "cho" : "han";
}

// side 진영 장(general)의 좌표를 찾는다. 보드에 없으면(이미 잡힘) null.
function findGeneral(board: Board, side: Side): Pos | null {
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === side && cell.type === "general") {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * `side` 진영의 장(general)이 현재 상대에게 잡힐 위치에 있는지(장군, check) 판정한다.
 * - 상대 진영의 어떤 기물이든 side의 장 위치로 가는 합법 수가 하나라도 있으면 true.
 * - side의 장이 보드에 없으면(이미 잡힘) true로 간주한다.
 * 보드를 변형하지 않는다.
 */
export function isInCheck(board: Board, side: Side): boolean {
  const general = findGeneral(board, side);
  if (general === null) {
    return true; // 장이 이미 잡힘 — 장군으로 간주
  }
  const opponent = opponentOf(side);
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === opponent) {
        if (isLegalMove(board, opponent, { x, y }, general)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * `side` 진영이 from→to(기하적으로 합법인 한 수)를 둔 뒤, 자기 장이 잡힐 위치에
 * 놓이는지(self-check) 판정한다.
 * - 자기 장이 보드에 없으면(합성/종료 국면) self-check 개념이 없으므로 false.
 * - 그 외에는 수를 둔 새 보드에서 `isInCheck(next, side)`로 판정한다.
 * 보드를 변형하지 않는다(applyMove가 새 보드를 반환한다).
 */
function leavesOwnGeneralInCheck(
  board: Board,
  side: Side,
  from: Pos,
  to: Pos,
): boolean {
  if (findGeneral(board, side) === null) {
    return false;
  }
  const next = applyMove(board, side, from, to);
  return isInCheck(next, side);
}

/**
 * `side` 진영이 외통수(checkmate)인지 판정한다.
 * - 현재 장군 상태(`isInCheck(board, side) === true`)이고,
 * - side의 어떤 합법 수를 두어도 그 수를 둔 뒤에도 여전히 장군이면 true.
 * - 장군이 아니거나, 장군을 벗어나는 합법 수가 하나라도 있으면 false.
 * 보드를 변형하지 않는다(applyMove가 새 보드를 반환한다).
 */
export function isCheckmate(board: Board, side: Side): boolean {
  if (!isInCheck(board, side)) {
    return false;
  }
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === side) {
        const from: Pos = { x, y };
        for (const to of legalMovesFrom(board, side, from)) {
          const next = applyMove(board, side, from, to);
          if (!isInCheck(next, side)) {
            return false; // 장군을 벗어나는 수가 존재
          }
        }
      }
    }
  }
  return true;
}
