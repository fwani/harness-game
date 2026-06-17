// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 창고지기(소코반, Sokoban): 격자에서 플레이어가 상하좌우로 움직이며 상자를 밀어
// 모든 상자를 목표 칸에 올리면 클리어하는 결정적 1인 퍼즐. 기존 퍼즐 패밀리
// (hanoi/slidePuzzle/lightsOut)와 같은 결의 결정적 순수 함수로, 입력 상태를 변형하지 않고
// 새 상태를 반환한다(불변). 무작위성·턴 진행·CPU 행동·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈).
//
// 좌표는 board[row][col] 관례(row=행, col=열)를 따른다. 벽/목표/상자/플레이어 위치는
// "row,col" 문자열 키 집합으로 모델링한다. 칸 타입은 벽/바닥/목표 셋이며, 바닥은
// 벽·목표가 아닌 모든 보드 안 칸이다(별도 저장하지 않는다).

/** 이동 방향. */
export type Direction = "up" | "down" | "left" | "right";

/** 보드 위 한 칸 좌표. row=행, col=열. */
export interface Position {
  row: number;
  col: number;
}

export interface SokobanState {
  readonly width: number;
  readonly height: number;
  /** 벽 칸 "row,col". */
  readonly walls: ReadonlySet<string>;
  /** 목표 칸 "row,col". */
  readonly targets: ReadonlySet<string>;
  /** 상자가 놓인 칸 "row,col". */
  readonly boxes: ReadonlySet<string>;
  /** 플레이어 위치. */
  readonly player: Position;
}

/** 방향별 단위 이동 벡터 [dRow, dCol]. */
const DELTAS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/** 합법 수 열거·UI 표시의 결정적 순서. */
const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

/** "row,col" 키 생성. */
function key(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * 표준 ASCII 레이아웃을 초기 상태로 파싱한다(1줄 1행).
 * 관례: `#`=벽, `@`=플레이어, `+`=목표 위 플레이어, `$`=상자, `*`=목표 위 상자, `.`=목표, 공백=바닥.
 * width는 가장 긴 줄 길이, height는 줄 수. 짧은 줄의 나머지 칸은 바닥으로 본다.
 * 다음 모순 레이아웃은 한국어 사유로 throw 한다:
 * - 빈 레이아웃, 알 수 없는 문자
 * - 플레이어가 정확히 1명이 아님
 * - 상자 수 0 또는 목표 수 0
 * - 상자 수와 목표 수가 다름(풀 수 없는 모순 배치)
 */
export function parseSokobanLevel(layout: string): SokobanState {
  if (layout.length === 0) {
    throw new Error("소코반 잘못된 레이아웃: 비어 있음");
  }
  const lines = layout.split("\n");
  const height = lines.length;
  let width = 0;
  for (const line of lines) {
    if (line.length > width) {
      width = line.length;
    }
  }
  if (width === 0) {
    throw new Error("소코반 잘못된 레이아웃: 모든 줄이 비어 있음");
  }

  const walls = new Set<string>();
  const targets = new Set<string>();
  const boxes = new Set<string>();
  let player: Position | null = null;
  let playerCount = 0;

  for (let row = 0; row < height; row += 1) {
    const line = lines[row]!;
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col]!;
      const cell = key(row, col);
      switch (ch) {
        case "#":
          walls.add(cell);
          break;
        case " ":
          break;
        case ".":
          targets.add(cell);
          break;
        case "@":
          player = { row, col };
          playerCount += 1;
          break;
        case "+":
          player = { row, col };
          playerCount += 1;
          targets.add(cell);
          break;
        case "$":
          boxes.add(cell);
          break;
        case "*":
          boxes.add(cell);
          targets.add(cell);
          break;
        default:
          throw new Error(
            `소코반 잘못된 레이아웃: 알 수 없는 문자 '${ch}' (row=${row}, col=${col})`,
          );
      }
    }
  }

  if (playerCount !== 1 || player === null) {
    throw new Error(
      `소코반 잘못된 레이아웃: 플레이어(@/+)가 정확히 1명이어야 함(받은 수: ${playerCount})`,
    );
  }
  if (boxes.size === 0) {
    throw new Error("소코반 잘못된 레이아웃: 상자($/*)가 최소 1개 있어야 함");
  }
  if (targets.size === 0) {
    throw new Error("소코반 잘못된 레이아웃: 목표(./+/*)가 최소 1개 있어야 함");
  }
  if (boxes.size !== targets.size) {
    throw new Error(
      `소코반 잘못된 레이아웃: 상자 수(${boxes.size})와 목표 수(${targets.size})가 같아야 함`,
    );
  }

  return { width, height, walls, targets, boxes, player };
}

/** 내장 기본 레벨 레이아웃(결정적 시작 상태). */
const LEVELS: readonly string[] = [
  // 0: 한 번 밀어 클리어하는 최소 레벨.
  ["#####", "#@$.#", "#####"].join("\n"),
  // 1: 양옆 상자를 바깥 목표로 미는 좌우 대칭 레벨.
  ["#######", "#.$@$.#", "#######"].join("\n"),
];

/** 내장 기본 레벨 수. */
export const SOKOBAN_LEVEL_COUNT = LEVELS.length;

/**
 * 내장 기본 레벨의 초기 상태를 생성한다(기본 index=0).
 * - index가 정수가 아니거나 범위 밖이면 throw(한국어 사유).
 */
export function createSokobanLevel(index = 0): SokobanState {
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) {
    throw new Error(
      `소코반 잘못된 레벨 번호: 0..${LEVELS.length - 1} 범위의 정수여야 함(받은 값: ${index})`,
    );
  }
  return parseSokobanLevel(LEVELS[index]!);
}

/** (row,col)이 보드 경계 안이면 true. */
function inBounds(state: SokobanState, row: number, col: number): boolean {
  return row >= 0 && row < state.height && col >= 0 && col < state.width;
}

/** (row,col)이 보드 밖이거나 벽이면 true(이동할 수 없는 칸). */
function isBlocked(state: SokobanState, row: number, col: number): boolean {
  return !inBounds(state, row, col) || state.walls.has(key(row, col));
}

/**
 * 해당 방향 이동이 합법인지 판정한다.
 * - 향한 칸이 벽/경계 밖이면 불법.
 * - 향한 칸에 상자가 있으면, 그 너머 칸이 바닥/목표(벽·경계 밖·다른 상자 아님)일 때만 합법(밀기).
 * - 그 외(빈 바닥/목표)면 합법.
 */
export function isLegalSokobanMove(state: SokobanState, dir: Direction): boolean {
  const [dr, dc] = DELTAS[dir];
  const nr = state.player.row + dr;
  const nc = state.player.col + dc;
  if (isBlocked(state, nr, nc)) {
    return false;
  }
  if (state.boxes.has(key(nr, nc))) {
    const br = nr + dr;
    const bc = nc + dc;
    if (isBlocked(state, br, bc) || state.boxes.has(key(br, bc))) {
      return false;
    }
  }
  return true;
}

/** 현재 상태에서 합법인 방향 목록(결정적 순서: 위→아래→왼쪽→오른쪽). */
export function legalSokobanMoves(state: SokobanState): Direction[] {
  return DIRECTIONS.filter((dir) => isLegalSokobanMove(state, dir));
}

/**
 * 한 칸 이동한 새 상태를 반환한다(입력 불변). 향한 칸에 상자가 있으면 한 칸 함께 민다.
 * 불법 수(벽·경계 밖·상자 2개 연속 밀기 등)는 사유를 담아 throw 한다.
 */
export function applySokobanMove(state: SokobanState, dir: Direction): SokobanState {
  if (!isLegalSokobanMove(state, dir)) {
    throw new Error(`소코반 불법 수: 방향 '${dir}'(으)로 이동할 수 없음`);
  }
  const [dr, dc] = DELTAS[dir];
  const nr = state.player.row + dr;
  const nc = state.player.col + dc;
  const dest = key(nr, nc);

  let boxes = state.boxes;
  if (state.boxes.has(dest)) {
    const next = new Set(state.boxes);
    next.delete(dest);
    next.add(key(nr + dr, nc + dc));
    boxes = next;
  }

  return {
    width: state.width,
    height: state.height,
    walls: state.walls,
    targets: state.targets,
    boxes,
    player: { row: nr, col: nc },
  };
}

/** 모든 상자가 목표 위에 있으면(클리어) true. */
export function isSokobanSolved(state: SokobanState): boolean {
  for (const box of state.boxes) {
    if (!state.targets.has(box)) {
      return false;
    }
  }
  return true;
}
