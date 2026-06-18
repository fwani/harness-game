// Application layer: 지뢰찾기(Minesweeper) 한 판/한 수 진행. domain(minesweeper)과 RandomSource 포트에만 의존한다.
// infrastructure(Math.random) 직접 사용 금지 — 무작위는 반드시 RandomSource로 주입한다.
import { createMinefield, revealCell, isLoss, isWin, type Board } from "../domain/minesweeper";
import type { RandomSource } from "./dealCards";

/**
 * 서로 다른(중복 없는) 지뢰 좌표 mineCount개를 결정적으로 뽑는다(불변).
 * - rows/cols는 정수 >= 1, mineCount는 정수 >= 0 이어야 한다. 아니면 throw(사유 포함).
 * - exclude가 주어지면 그 칸은 후보에서 제외한다(첫 클릭 안전지대용).
 * - mineCount <= rows*cols - (exclude ? 1 : 0) 여야 한다. 초과하면 throw.
 * - 남은 후보 풀에서 rng.nextInt로 하나씩 뽑고 제거하므로 중복이 생기지 않는다(결정적).
 * - rng.nextInt가 범위 밖 인덱스를 반환하면 throw(방어 — shuffle/generateLadderRungs 패턴과 동일).
 */
export function generateMineCoordinates(
  rows: number,
  cols: number,
  mineCount: number,
  rng: RandomSource,
  exclude?: readonly [number, number],
): [number, number][] {
  if (!Number.isInteger(rows) || rows < 1) {
    throw new Error(`generateMineCoordinates requires integer rows >= 1, got ${rows}`);
  }
  if (!Number.isInteger(cols) || cols < 1) {
    throw new Error(`generateMineCoordinates requires integer cols >= 1, got ${cols}`);
  }
  if (!Number.isInteger(mineCount) || mineCount < 0) {
    throw new Error(`generateMineCoordinates requires integer mineCount >= 0, got ${mineCount}`);
  }
  const maxMines = rows * cols - (exclude ? 1 : 0);
  if (mineCount > maxMines) {
    throw new Error(
      `generateMineCoordinates: mineCount ${mineCount} exceeds available cells ${maxMines}`,
    );
  }

  // 후보 풀: exclude 칸을 뺀 모든 좌표. 뽑을 때마다 제거해 중복을 막는다.
  const pool: [number, number][] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (exclude && r === exclude[0] && c === exclude[1]) {
        continue;
      }
      pool.push([r, c]);
    }
  }

  const result: [number, number][] = [];
  for (let k = 0; k < mineCount; k += 1) {
    const idx = rng.nextInt(pool.length);
    if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length) {
      throw new Error(`RandomSource returned out-of-range index: ${idx}`);
    }
    result.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return result;
}

/**
 * 무작위 지뢰 배치로 새 게임 보드를 만든다(불변, 결정적).
 * generateMineCoordinates 결과를 createMinefield에 넘겨 모든 칸 미공개·adjacent 채워진 보드를 반환한다.
 */
export function startMinesweeperGame(
  rows: number,
  cols: number,
  mineCount: number,
  rng: RandomSource,
  exclude?: readonly [number, number],
): Board {
  const mines = generateMineCoordinates(rows, cols, mineCount, rng, exclude);
  return createMinefield(rows, cols, mines);
}

export interface MinesweeperTurnResult {
  board: Board;
  status: "win" | "loss" | "playing";
}

/**
 * (row,col) 칸을 한 번 연다(입력 보드 불변 — revealCell이 새 보드를 반환).
 * - 지뢰 칸이 공개되면 "loss".
 * - 그 외 지뢰 아닌 모든 칸이 공개됐으면 "win".
 * - 둘 다 아니면 "playing".
 * 깃발(flag) 토글은 이 범위 밖이다(도메인 Cell에 flagged 필드 없음 — 후속 짝 이슈).
 */
export function playMinesweeperTurn(
  board: Board,
  row: number,
  col: number,
): MinesweeperTurnResult {
  const next = revealCell(board, row, col);
  if (isLoss(next)) {
    return { board: next, status: "loss" };
  }
  if (isWin(next)) {
    return { board: next, status: "win" };
  }
  return { board: next, status: "playing" };
}
