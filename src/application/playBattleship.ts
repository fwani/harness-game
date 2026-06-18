// Application layer: 배틀십(Battleship·해전) 무작위 함대 배치 + CPU 사격 좌표 선택 + 한 발 진행 헬퍼.
// 도메인 규칙(battleship)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playNim.ts / playMancala.ts / playTicTacToe.ts와 동일한 패턴:
// 도메인의 배치 검증·사격·격침·전 함대 격침 판정을 재사용하고 난수는 주입받는다(규칙 재구현 금지).
//
// 후속 짝 이슈(필요): src/ui/games/Battleship.tsx UI 연동 —
// 사격 격자 클릭·명중/빗나감/격침 피드백·CPU 자동 사격·승패·전적 저장.
// UI 이슈는 docs/agent-harness/UX_GUIDELINES.md의 "새 게임 화면 UI/UX 체크리스트"를 완료 조건에 포함한다.
import type { BattleshipBoard, Ship } from "../domain/battleship";
import {
  STANDARD_FLEET,
  fireShot,
  isFleetDestroyed,
  isHit,
  isShipSunk,
  isValidPlacement,
} from "../domain/battleship";
import type { RandomSource } from "./dealCards";

/**
 * fleet(함선 길이 목록, 기본 STANDARD_FLEET)의 각 함선을 size×size 격자 안에
 * 수평/수직 무작위 배치한다. 배치 후보(위치·방향)는 도메인 isValidPlacement로
 * 겹침·범위를 검증하며 유효한 배치만 채택한다(규칙 재구현 금지).
 * - 각 함선마다 한 후보씩 누적 검증한다(이미 둔 함선들과 함께 isValidPlacement).
 * - 함선당 무작위 시도가 상한(칸 수에 비례)을 넘겨도 유효 배치를 못 찾으면 throw(무한 루프 방지).
 * - 반환된 Ship[]은 createBattleshipBoard(size, ships)에 그대로 넣어 유효하다.
 * - rng 호출 순서는 함선마다 시도당 orientation→row→col로 결정적이다.
 * - 입력 fleet을 변형하지 않는다(난수 외 결정적).
 */
export function placeFleetRandomly(
  size: number,
  fleet: ReadonlyArray<number> = STANDARD_FLEET,
  rng: RandomSource,
): Ship[] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`배틀십 잘못된 보드 크기: 1 이상의 정수여야 함(받은 값: ${size})`);
  }
  // 함선당 시도 상한: 칸 수에 비례(빈 보드라도 충분히 시도하도록 여유 계수).
  const maxAttemptsPerShip = size * size * 20 + 100;
  const placed: Ship[] = [];
  for (let i = 0; i < fleet.length; i += 1) {
    const shipSize = fleet[i]!;
    let accepted: Ship | null = null;
    for (let attempt = 0; attempt < maxAttemptsPerShip; attempt += 1) {
      const orientation: "h" | "v" = rng.nextInt(2) === 0 ? "h" : "v";
      const row = rng.nextInt(size);
      const col = rng.nextInt(size);
      const candidate: Ship = { id: `ship-${i}`, row, col, size: shipSize, orientation };
      if (isValidPlacement(size, [...placed, candidate])) {
        accepted = candidate;
        break;
      }
    }
    if (accepted === null) {
      throw new Error(
        `배틀십 무작위 배치 실패: 함선 #${i}(길이 ${shipSize})를 ${maxAttemptsPerShip}번 시도해도 배치 불가`,
      );
    }
    placed.push(accepted);
  }
  return placed;
}

/**
 * 아직 사격하지 않은 칸(hit === false) 중 하나를 rng.nextInt로 균등 선택해 반환한다.
 * - 후보 열거 순서는 행→열(row-major)로 결정적이다.
 * - 사격할 칸이 없으면 null.
 * - idx = rng.nextInt(candidates.length). 범위를 벗어난 인덱스를 주면 throw(방어적, chooseRandomNimMove 관례).
 * - 입력 board를 변형하지 않는다(읽기만, 난수 외 결정적).
 */
export function chooseRandomShot(
  board: BattleshipBoard,
  rng: RandomSource,
): { row: number; col: number } | null {
  const candidates: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < board.length; row += 1) {
    const cols = board[row]!;
    for (let col = 0; col < cols.length; col += 1) {
      if (!cols[col]!.hit) {
        candidates.push({ row, col });
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  const idx = rng.nextInt(candidates.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return candidates[idx]!;
}

/**
 * 헌트/타깃(hunt/target) 전략으로 사격 좌표를 고른다(순수·결정적, 입력 board 불변).
 * 표준 배틀십 CPU 관례(Wikipedia "Battleship", DataGenetics "The Battleship Algorithm"):
 * - **타깃 모드**: 명중했지만 아직 격침되지 않은 함선이 있으면, 그 명중 칸들에 인접한
 *   미사격 칸을 후보로 우선한다. 두 칸 이상 일직선으로 명중했으면(같은 축 인접 명중)
 *   그 직선의 연장칸을 더 우선한다(직선 방향 추적).
 * - **헌트 모드**: 타깃 후보가 없으면 미사격 칸 중에서 고른다. 체커보드 패리티((row+col)%2===0)
 *   칸을 우선하고, 그런 칸이 없으면 남은 미사격 칸 전체에서 고른다(최소 균등 무작위).
 * - 후보가 없으면(모든 칸 사격됨) null.
 *
 * 도메인 규칙(isHit/isShipSunk)을 재사용하며 명중·격침 판정을 재구현하지 않는다.
 * 후보 열거 순서는 행→열(row-major)·방향 고정 순서로 결정적이다. 최종 선택만 rng로,
 * idx = rng.nextInt(candidates.length); 범위를 벗어난 인덱스를 주면 throw(chooseRandomShot 관례).
 */
export function chooseSmartShot(
  board: BattleshipBoard,
  rng: RandomSource,
): { row: number; col: number } | null {
  const rows = board.length;
  const unfired = (r: number, c: number): boolean =>
    r >= 0 && r < rows && c >= 0 && c < (board[r]?.length ?? 0) && !board[r]![c]!.hit;

  // 아직 격침되지 않은 함선에 속한 명중 칸(=추적 대상)을 모은다.
  // 격침 여부는 shipId별로 한 번만 계산해 재사용한다(O(n²) 반복 회피).
  const sunkCache = new Map<string, boolean>();
  const isSunkCached = (shipId: string): boolean => {
    const cached = sunkCache.get(shipId);
    if (cached !== undefined) {
      return cached;
    }
    const sunk = isShipSunk(board, shipId);
    sunkCache.set(shipId, sunk);
    return sunk;
  };
  const activeHits: Array<{ row: number; col: number }> = [];
  const isActiveHit = (r: number, c: number): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= (board[r]?.length ?? 0)) {
      return false;
    }
    if (!isHit(board, r, c)) {
      return false;
    }
    const shipId = board[r]![c]!.shipId;
    return shipId !== null && !isSunkCached(shipId);
  };
  for (let row = 0; row < rows; row += 1) {
    const cols = board[row]!;
    for (let col = 0; col < cols.length; col += 1) {
      if (isActiveHit(row, col)) {
        activeHits.push({ row, col });
      }
    }
  }

  const DIRS: ReadonlyArray<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  // 후보를 중복 없이 행→열 순서로 모으는 헬퍼.
  const collect = (): {
    push: (r: number, c: number) => void;
    list: Array<{ row: number; col: number }>;
  } => {
    const seen = new Set<string>();
    const list: Array<{ row: number; col: number }> = [];
    return {
      push(r, c) {
        const key = `${r},${c}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ row: r, col: c });
        }
      },
      list,
    };
  };

  if (activeHits.length > 0) {
    // 직선 연장 후보: 명중 칸 (r,c)에서 진행 방향 반대쪽(r-dr,c-dc)도 명중이면
    // 같은 축으로 두 칸 이상 늘어선 것 → 진행 방향 칸(r+dr,c+dc)이 미사격이면 강한 후보.
    const lineCands = collect();
    for (const { row, col } of activeHits) {
      for (const [dr, dc] of DIRS) {
        if (isActiveHit(row - dr, col - dc) && unfired(row + dr, col + dc)) {
          lineCands.push(row + dr, col + dc);
        }
      }
    }
    // 일반 인접 후보: 명중 칸의 상하좌우 미사격 칸.
    const neighborCands = collect();
    for (const { row, col } of activeHits) {
      for (const [dr, dc] of DIRS) {
        if (unfired(row + dr, col + dc)) {
          neighborCands.push(row + dr, col + dc);
        }
      }
    }
    const targets = lineCands.list.length > 0 ? lineCands.list : neighborCands.list;
    if (targets.length > 0) {
      return pickFrom(targets, rng);
    }
    // 타깃 후보가 전혀 없으면 헌트 모드로 떨어진다.
  }

  // 헌트 모드: 체커보드 패리티 칸 우선, 없으면 남은 미사격 칸 전체.
  const parity = collect();
  const allUnfired = collect();
  for (let row = 0; row < rows; row += 1) {
    const cols = board[row]!;
    for (let col = 0; col < cols.length; col += 1) {
      if (!cols[col]!.hit) {
        allUnfired.push(row, col);
        if ((row + col) % 2 === 0) {
          parity.push(row, col);
        }
      }
    }
  }
  const hunt = parity.list.length > 0 ? parity.list : allUnfired.list;
  if (hunt.length === 0) {
    return null;
  }
  return pickFrom(hunt, rng);
}

/** 후보 목록에서 rng로 하나를 고른다(범위 밖 인덱스는 throw — chooseRandomShot 관례). */
function pickFrom(
  candidates: ReadonlyArray<{ row: number; col: number }>,
  rng: RandomSource,
): { row: number; col: number } {
  const idx = rng.nextInt(candidates.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return candidates[idx]!;
}

/** 한 발 사격 진행 결과: 사격 후 보드 + 명중·격침·전 함대 격침 판정. */
export interface BattleshipShotResult {
  /** 사격 후 새 보드(입력 불변 — 도메인 fireShot가 새 보드 반환). */
  board: BattleshipBoard;
  /** 함선에 명중했는지(isHit). 빗나감이면 false. */
  hit: boolean;
  /** 명중으로 함선이 격침됐으면 그 함선 id, 아니면 null. */
  sunkShipId: string | null;
  /** 전 함대 격침(isFleetDestroyed)이면 true. */
  fleetDestroyed: boolean;
}

/**
 * (row,col)을 한 발 사격하고 명중·격침·전 함대 격침을 계산한다.
 * - fireShot(board, row, col)로 새 보드를 만든다(불법 좌표는 도메인 에러 전파, 입력 보드 불변).
 * - hit = isHit(newBoard, row, col).
 * - 명중 시 해당 칸의 shipId가 isShipSunk이면 sunkShipId로 채운다(빗나감/미격침이면 null).
 * - fleetDestroyed = isFleetDestroyed(newBoard).
 */
export function playBattleshipShot(
  board: BattleshipBoard,
  row: number,
  col: number,
): BattleshipShotResult {
  const next = fireShot(board, row, col);
  const hit = isHit(next, row, col);
  let sunkShipId: string | null = null;
  if (hit) {
    const shipId = next[row]![col]!.shipId;
    if (shipId !== null && isShipSunk(next, shipId)) {
      sunkShipId = shipId;
    }
  }
  return {
    board: next,
    hit,
    sunkShipId,
    fleetDestroyed: isFleetDestroyed(next),
  };
}
