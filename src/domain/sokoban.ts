// Domain layer: pure game rules. No outward dependency (no application/infrastructure/ui).
// 창고지기(소코반, Sokoban): 플레이어가 상하좌우로 움직이며 상자를 밀어 모든 목표 칸에 올려놓으면
// 클리어하는 결정적 격자 퍼즐. 기존 퍼즐 패밀리(hanoi/slidePuzzle/lightsOut)와 같은 결의 결정적
// 순수 함수로, 입력 상태를 변형하지 않고 매 수마다 새 상태를 반환한다(불변). 난수·부수효과 없음.
// UI 연동(레벨 표시·키보드 이동·전적 저장)은 이 모듈 범위 밖이다(후속 짝 이슈).

/** 이동 방향(대각선 없음). */
export type Direction = "up" | "down" | "left" | "right";

/** 격자 위 한 칸 좌표. row = 행, col = 열. */
export interface Position {
  row: number;
  col: number;
}

/**
 * 소코반 한 판의 불변 상태.
 * - walls/targets/boxes는 "row,col" 키 집합으로 표현한다.
 * - 바닥(floor)은 벽이 아닌 모든 칸으로 암묵 정의된다(별도 집합 없음).
 */
export interface SokobanState {
  readonly width: number;
  readonly height: number;
  readonly walls: ReadonlySet<string>; // "row,col"
  readonly targets: ReadonlySet<string>; // "row,col"
  readonly boxes: ReadonlySet<string>; // "row,col"
  readonly player: Position;
}

/** "row,col" 키. */
function key(row: number, col: number): string {
  return `${row},${col}`;
}

// 방향별 단위 벡터. [dRow, dCol].
const DELTAS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

/**
 * 표준 ASCII 레이아웃에서 초기 상태를 만든다(불완전/모순 레이아웃은 한국어 사유로 throw).
 * 관례: `#`=벽, `@`=플레이어, `+`=목표 위 플레이어, `$`=상자, `*`=목표 위 상자, `.`=목표, 공백=바닥.
 * - 후행 개행은 무시한다. width는 가장 긴 행 기준, 짧은 행은 바닥으로 채워진다.
 * - 플레이어가 정확히 1명이 아니면 throw.
 * - 상자 수가 0이거나 목표 수가 0이면 throw.
 * - 상자 수와 목표 수가 다르면 throw(풀 수 없는 레이아웃).
 */
export function parseSokobanLevel(layout: string): SokobanState {
  if (typeof layout !== "string" || layout.length === 0) {
    throw new Error("소코반 레이아웃 오류: 빈 레이아웃은 파싱할 수 없음");
  }
  // 후행 개행만 제거(앞쪽/중간 빈 줄은 유지해 좌표를 보존).
  const lines = layout.replace(/\n+$/, "").split("\n");
  const height = lines.length;
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
  if (width === 0) {
    throw new Error("소코반 레이아웃 오류: 내용이 없는 레이아웃");
  }

  const walls = new Set<string>();
  const targets = new Set<string>();
  const boxes = new Set<string>();
  const players: Position[] = [];

  for (let row = 0; row < height; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      const k = key(row, col);
      switch (ch) {
        case "#":
          walls.add(k);
          break;
        case "@":
          players.push({ row, col });
          break;
        case "+":
          players.push({ row, col });
          targets.add(k);
          break;
        case "$":
          boxes.add(k);
          break;
        case "*":
          boxes.add(k);
          targets.add(k);
          break;
        case ".":
          targets.add(k);
          break;
        case " ":
          break; // 바닥
        default:
          throw new Error(
            `소코반 레이아웃 오류: 알 수 없는 문자 '${ch}' (row=${row}, col=${col})`,
          );
      }
    }
  }

  if (players.length !== 1) {
    throw new Error(
      `소코반 레이아웃 오류: 플레이어(@/+)는 정확히 1명이어야 함(받은 수: ${players.length})`,
    );
  }
  if (boxes.size === 0) {
    throw new Error("소코반 레이아웃 오류: 상자($/*)가 최소 1개 있어야 함");
  }
  if (targets.size === 0) {
    throw new Error("소코반 레이아웃 오류: 목표(./+/*)가 최소 1개 있어야 함");
  }
  if (boxes.size !== targets.size) {
    throw new Error(
      `소코반 레이아웃 오류: 상자 수(${boxes.size})와 목표 수(${targets.size})가 일치해야 함`,
    );
  }

  return {
    width,
    height,
    walls,
    targets,
    boxes,
    player: players[0]!,
  };
}

// 내장 기본 레벨들(결정적 시작 상태 제공). 인덱스 0부터.
const BUILT_IN_LEVELS: readonly string[] = [
  // 0: 한 줄 밀기 — 상자 하나를 오른쪽으로 밀어 목표에 올린다.
  ["#######", "#@$  .#", "#######"].join("\n"),
  // 1: 작은 방 — 상자 2개를 각 목표로 민다.
  [
    "######",
    "#  . #",
    "# $$ #",
    "# @  #",
    "#  . #",
    "######",
  ].join("\n"),
];

/**
 * 내장 기본 레벨을 반환한다(기본 0번). 결정적 시작 상태.
 * - 범위 밖 index면 throw(한국어 사유).
 */
export function createSokobanLevel(index = 0): SokobanState {
  if (!Number.isInteger(index) || index < 0 || index >= BUILT_IN_LEVELS.length) {
    throw new Error(
      `소코반 레벨 오류: index는 0..${BUILT_IN_LEVELS.length - 1} 범위의 정수여야 함(받은 값: ${index})`,
    );
  }
  return parseSokobanLevel(BUILT_IN_LEVELS[index]!);
}

/** (row,col)이 격자 경계 안이면 true. */
function inBounds(state: SokobanState, row: number, col: number): boolean {
  return row >= 0 && row < state.height && col >= 0 && col < state.width;
}

/**
 * 해당 방향 이동이 합법인지 판정한다.
 * - 향한 칸이 경계 밖/벽이면 불법.
 * - 향한 칸에 상자가 있으면, 그 너머 칸이 경계 안·벽 아님·다른 상자 아님일 때만 합법(밀기).
 *   (상자 2개 연속 밀기 불가.)
 */
export function isLegalSokobanMove(state: SokobanState, dir: Direction): boolean {
  const [dr, dc] = DELTAS[dir];
  const nr = state.player.row + dr;
  const nc = state.player.col + dc;
  if (!inBounds(state, nr, nc)) {
    return false;
  }
  const nk = key(nr, nc);
  if (state.walls.has(nk)) {
    return false;
  }
  if (state.boxes.has(nk)) {
    // 상자 너머 칸을 확인.
    const br = nr + dr;
    const bc = nc + dc;
    if (!inBounds(state, br, bc)) {
      return false;
    }
    const bk = key(br, bc);
    if (state.walls.has(bk) || state.boxes.has(bk)) {
      return false;
    }
  }
  return true;
}

/** 현재 상태에서 합법인 방향 목록(상하좌우 순). */
export function legalSokobanMoves(state: SokobanState): Direction[] {
  return DIRECTIONS.filter((dir) => isLegalSokobanMove(state, dir));
}

/**
 * 한 칸 이동한 새 상태를 반환한다(입력 불변).
 * 향한 칸에 상자가 있으면 그 상자를 한 칸 함께 민다.
 * - 불법 수면 throw(조용한 무시 금지 — 도메인 에러).
 */
export function applySokobanMove(state: SokobanState, dir: Direction): SokobanState {
  if (!isLegalSokobanMove(state, dir)) {
    throw new Error(`소코반 불법 이동: '${dir}' 방향으로 이동할 수 없음`);
  }
  const [dr, dc] = DELTAS[dir];
  const nr = state.player.row + dr;
  const nc = state.player.col + dc;
  const nk = key(nr, nc);

  let boxes: ReadonlySet<string> = state.boxes;
  if (state.boxes.has(nk)) {
    // 상자를 너머 칸으로 민다(합법성은 위에서 검증됨).
    const br = nr + dr;
    const bc = nc + dc;
    const moved = new Set(state.boxes);
    moved.delete(nk);
    moved.add(key(br, bc));
    boxes = moved;
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
