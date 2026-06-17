// Application layer: 2048 한 판 진행. domain(game2048)과 RandomSource 포트에만 의존한다.
// 도메인은 새 타일 스폰을 하지 않으므로(슬라이드/병합 순수 규칙만), 빈 칸에 무작위 타일을
// 스폰하는 책임은 이 레이어가 진다. 무작위는 RandomSource 주입으로 결정적 테스트가 가능하다.
import {
  applyMove,
  canMove,
  createBoard,
  hasReachedTarget,
  DEFAULT_TARGET,
  type Board,
  type Direction,
} from "../domain/game2048";
import type { RandomSource } from "./dealCards";

/** 새 타일 값 추첨에 쓰는 범위(rng.nextInt(SPAWN_RANGE) < SPAWN_FOUR_THRESHOLD 이면 4). */
const SPAWN_RANGE = 10;
/** 임계 미만이면 값 4, 이상이면 값 2 → 4가 10%, 2가 90% 확률. */
const SPAWN_FOUR_THRESHOLD = 1;

/** 보드를 깊은 복사한다(불변성 보장용 내부 헬퍼). */
function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/** (row, col) 형태의 빈 칸(값 0) 좌표를 행 우선 순서로 모은다. */
function emptyCells(board: Board): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < board.length; r++) {
    const row = board[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 0) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/**
 * 빈 칸(값 0) 중 하나를 rng.nextInt로 균등 선택해 새 타일을 놓은 새 보드를 반환한다(입력 보드 불변).
 * - 타일 값은 2(90%) 또는 4(10%): rng.nextInt(SPAWN_RANGE) < SPAWN_FOUR_THRESHOLD 이면 4, 아니면 2.
 * - 빈 칸이 없으면 입력 보드 사본을 그대로 반환한다(스폰 없음).
 * - rng.nextInt가 빈 칸 범위를 벗어난 인덱스를 주면 throw(방어).
 * - rng 호출 순서: 먼저 nextInt(빈칸수)로 위치, 다음 nextInt(SPAWN_RANGE)로 값을 뽑는다.
 */
export function spawnTile(board: Board, rng: RandomSource): Board {
  const next = cloneBoard(board);
  const cells = emptyCells(next);
  if (cells.length === 0) {
    return next; // 빈 칸 없음 → 스폰하지 않는다.
  }
  const index = rng.nextInt(cells.length);
  if (index < 0 || index >= cells.length) {
    throw new Error(`RandomSource returned out-of-range cell index: ${index}`);
  }
  const value = rng.nextInt(SPAWN_RANGE) < SPAWN_FOUR_THRESHOLD ? 4 : 2;
  const { row, col } = cells[index]!;
  next[row]![col] = value;
  return next;
}

/**
 * 새 게임 시작 보드를 반환한다.
 * - createBoard() 후 spawnTile을 2회 적용해 초기 타일 2개를 놓는다.
 */
export function startGame(rng: RandomSource): Board {
  return spawnTile(spawnTile(createBoard(), rng), rng);
}

export interface Move2048Result {
  /** 이동(+스폰) 결과 보드. */
  board: Board;
  /** applyMove가 변화를 만들었는지. */
  moved: boolean;
  /** 이번 이동으로 얻은 점수. */
  gained: number;
  /** hasReachedTarget(board, target). */
  won: boolean;
  /** 이동 후 canMove === false. */
  over: boolean;
}

/**
 * 한 수 진행: applyMove(board, dir) → moved면 spawnTile로 새 타일 1개 추가, 아니면 보드 그대로(스폰 없음).
 * - won/over는 결과 보드 기준으로 계산한다.
 * - 입력 보드는 변형하지 않는다(불변). 슬라이드/병합 로직은 도메인 헬퍼를 재사용한다.
 */
export function play2048(
  board: Board,
  dir: Direction,
  rng: RandomSource,
  target: number = DEFAULT_TARGET,
): Move2048Result {
  const { board: movedBoard, moved, gained } = applyMove(board, dir);
  const next = moved ? spawnTile(movedBoard, rng) : movedBoard;
  return {
    board: next,
    moved,
    gained,
    won: hasReachedTarget(next, target),
    over: !canMove(next),
  };
}
