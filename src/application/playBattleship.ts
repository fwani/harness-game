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
