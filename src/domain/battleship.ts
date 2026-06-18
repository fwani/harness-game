// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 배틀십(Battleship·해전)의 보드 모델 + 함선 배치 검증 + 좌표 사격(명중/빗나감)·격침·전 함대 격침 판정.
// 행 우선(row-major) 보드 컨벤션은 minesweeper.ts / gomoku.ts / reversi.ts와 동일하다(board[row][col]).
// 무작위 함선 배치(RandomSource 주입)·CPU 사격 좌표 선택·한 발 진행 헬퍼는 이 모듈 범위 밖이다
// (후속 짝 이슈: src/application/playBattleship.ts — placeFleetRandomly/chooseRandomShot/playBattleshipShot).
// 그 위에 src/ui/games/Battleship.tsx UI 연동(사격 격자 클릭·명중/빗나감/격침 피드백·CPU 자동 사격·승패·전적 저장)이
// 또 다른 짝 이슈로 필요하다. UI 이슈는 docs/agent-harness/UX_GUIDELINES.md의
// "새 게임 화면 UI/UX 체크리스트"를 완료 조건에 포함한다.

/** 함선 한 척: 시작 좌표(row,col)에서 orientation 방향으로 size칸 일직선. */
export interface Ship {
  id: string;
  row: number;
  col: number;
  size: number;
  orientation: "h" | "v"; // h = 수평(열 증가 방향), v = 수직(행 증가 방향)
}

/** 한 칸의 상태: 함선 점유 여부 + 함선 id + 사격 여부. */
export interface Cell {
  hasShip: boolean;
  shipId: string | null;
  hit: boolean; // 한 번이라도 사격된 칸이면 true(명중/빗나감 공통)
}

/** 행 우선(row-major) 보드. 접근은 board[row][col]. row 0 = 최상단. */
export type BattleshipBoard = Cell[][];

/** 표준 함대: 함선 길이 목록(항공모함5·전함4·순양함3·잠수함3·구축함2). */
export const STANDARD_FLEET: ReadonlyArray<number> = [5, 4, 3, 3, 2];

function inBounds(board: BattleshipBoard, row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < board.length &&
    col >= 0 &&
    col < (board[row]?.length ?? 0)
  );
}

/** 보드를 깊은 복사한다(각 셀 객체까지 새로). 입력 board를 변형하지 않기 위해 사용. */
function cloneBoard(board: BattleshipBoard): BattleshipBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * 함선이 점유하는 칸 좌표 목록을 계산한다([row,col][]).
 * 비정상 함선(정수 아님·size<1·잘못된 방향)이면 빈 배열을 반환한다(검증은 호출부가 수행).
 */
function shipCells(ship: Ship): Array<[number, number]> {
  if (
    !Number.isInteger(ship.row) ||
    !Number.isInteger(ship.col) ||
    !Number.isInteger(ship.size) ||
    ship.size < 1 ||
    (ship.orientation !== "h" && ship.orientation !== "v")
  ) {
    return [];
  }
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < ship.size; i += 1) {
    const r = ship.orientation === "v" ? ship.row + i : ship.row;
    const c = ship.orientation === "h" ? ship.col + i : ship.col;
    cells.push([r, c]);
  }
  return cells;
}

/**
 * 시작 좌표(row,col)·길이(size)·방향(orientation)으로 한 함선이 점유할 칸 목록을 계산한다.
 * 내부 `shipCells`를 재사용한다(규칙 재구현 금지). 함선 한 척을 임시 미리보기/배치 후보로
 * 그릴 때 쓴다. 비정상 입력(정수 아님·size<1·잘못된 방향)이면 빈 배열을 반환한다(검증은 호출부).
 */
export function shipCellsAt(
  row: number,
  col: number,
  size: number,
  orientation: "h" | "v",
): Array<[number, number]> {
  return shipCells({ id: "", row, col, size, orientation });
}

/**
 * 함선 배치가 유효한지 검증한다(범위·겹침만; 인접은 허용).
 * - size가 정수 >=1 이 아니거나 비정상 함선이 있으면 false.
 * - 어떤 함선 칸이 격자 밖(0..size-1)이면 false.
 * - 두 함선이 한 칸이라도 겹치면 false.
 */
export function isValidPlacement(size: number, ships: ReadonlyArray<Ship>): boolean {
  if (!Number.isInteger(size) || size <= 0) {
    return false;
  }
  const occupied = new Set<string>();
  for (const ship of ships) {
    const cells = shipCells(ship);
    if (cells.length === 0 || cells.length !== ship.size) {
      return false; // 비정상 함선(shipCells가 빈 배열을 반환; size<1 포함).
    }
    for (const [r, c] of cells) {
      if (r < 0 || r >= size || c < 0 || c >= size) {
        return false; // 범위 밖.
      }
      const key = `${r},${c}`;
      if (occupied.has(key)) {
        return false; // 겹침.
      }
      occupied.add(key);
    }
  }
  return true;
}

/**
 * size×size 격자를 만들고 함선을 배치한다(모든 칸 미사격).
 * - size가 정수 >=1 이 아니면 throw.
 * - 함선 id가 중복되면 throw(격침 판정이 모호해짐).
 * - 함선이 격자 밖으로 나가거나 서로 겹치면 throw(isValidPlacement 위임).
 * - 매 호출마다 새 인스턴스를 반환한다(불변).
 */
export function createBattleshipBoard(size: number, ships: ReadonlyArray<Ship>): BattleshipBoard {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`배틀십 잘못된 보드 크기: 1 이상의 정수여야 함(받은 값: ${size})`);
  }
  const ids = new Set<string>();
  for (const ship of ships) {
    if (ids.has(ship.id)) {
      throw new Error(`배틀십 잘못된 배치: 함선 id 중복(${ship.id})`);
    }
    ids.add(ship.id);
  }
  if (!isValidPlacement(size, ships)) {
    throw new Error("배틀십 잘못된 배치: 함선이 범위를 벗어나거나 서로 겹침");
  }

  const board: BattleshipBoard = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ hasShip: false, shipId: null, hit: false })),
  );
  for (const ship of ships) {
    for (const [r, c] of shipCells(ship)) {
      const cell = board[r]![c]!;
      cell.hasShip = true;
      cell.shipId = ship.id;
    }
  }
  return board;
}

/**
 * (row,col)을 사격한다. 입력 보드를 변형하지 않고 새 보드를 반환한다.
 * - 범위 밖(비정수 포함)이면 throw.
 * - 이미 사격한 칸이면 변화 없이 복사본만 반환한다(멱등).
 * - 그 외에는 해당 칸을 사격 처리(hit=true)한다. 명중 여부는 isHit로 판정.
 */
export function fireShot(board: BattleshipBoard, row: number, col: number): BattleshipBoard {
  const next = cloneBoard(board);
  if (!inBounds(next, row, col)) {
    throw new Error(`배틀십 잘못된 사격 좌표: (${row}, ${col})`);
  }
  next[row]![col]!.hit = true;
  return next;
}

/** (row,col)이 함선에 명중했는지(사격됐고 함선이 있는지). 범위 밖이면 false. */
export function isHit(board: BattleshipBoard, row: number, col: number): boolean {
  if (!inBounds(board, row, col)) {
    return false;
  }
  const cell = board[row]![col]!;
  return cell.hit && cell.hasShip;
}

/**
 * 해당 id의 함선이 격침됐는지(모든 함선 칸이 hit). 그런 칸이 없으면 false(없는 함선).
 */
export function isShipSunk(board: BattleshipBoard, shipId: string): boolean {
  let found = false;
  for (const row of board) {
    for (const cell of row) {
      if (cell.shipId === shipId) {
        found = true;
        if (!cell.hit) {
          return false;
        }
      }
    }
  }
  return found;
}

/**
 * 전 함대 격침(모든 함선 칸이 hit)이면 true.
 * - 함선 칸이 하나도 없으면 false(격침할 함대가 없음).
 */
export function isFleetDestroyed(board: BattleshipBoard): boolean {
  let hasAnyShip = false;
  for (const row of board) {
    for (const cell of row) {
      if (cell.hasShip) {
        hasAnyShip = true;
        if (!cell.hit) {
          return false;
        }
      }
    }
  }
  return hasAnyShip;
}
