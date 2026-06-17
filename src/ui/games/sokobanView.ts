// Presentation helpers for the 소코반(Sokoban) screen. Pure functions only — 한 칸의 표시
// (기호/접근성 라벨/종류)·남은 목표 수·진행/클리어 상태 문구·불법 수 사유·방향 키 매핑을
// React/DOM에서 분리해 단위 테스트할 수 있게 한다. 규칙(합법 수/밀기/클리어 판정)은
// domain(sokoban)을 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import {
  isLegalSokobanMove,
  isSokobanSolved,
  type Direction,
  type SokobanState,
} from "../../domain/sokoban";

// NOTE: domain(sokoban)은 칸 종류 판정용 셀 키만 노출하므로, 여기서는 표시용으로 동일한
// "row,col" 키 규약과 방향 벡터를 가볍게 재현한다(규칙 판정이 아니라 렌더/사유 메시지용).
const DELTAS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function isBlockedCell(state: SokobanState, row: number, col: number): boolean {
  const outside = row < 0 || row >= state.height || col < 0 || col >= state.width;
  return outside || state.walls.has(cellKey(row, col));
}

/** 한 칸의 종류(색 비의존: 기호 + 라벨 + 분류). */
export type SokobanCellKind =
  | "wall"
  | "floor"
  | "target"
  | "box"
  | "box-on-target"
  | "player"
  | "player-on-target";

export interface CellView {
  /** 화면에 보일 기호(색만이 아니라 기호로 구분). 바닥은 "". */
  symbol: string;
  /** 스크린리더용 라벨(좌표 + 종류). */
  ariaLabel: string;
  /** 색이 아니라 종류로 구분하기 위한 분류(스타일 클래스/판정용). */
  kind: SokobanCellKind;
}

/** 한 칸의 표시 정보를 만든다(순수·결정적, 입력 불변). */
function cellViewAt(state: SokobanState, row: number, col: number): CellView {
  const where = `${row + 1}행 ${col + 1}열`;
  const key = cellKey(row, col);
  if (state.walls.has(key)) {
    return { symbol: "#", ariaLabel: `${where} 벽`, kind: "wall" };
  }
  const isPlayer = state.player.row === row && state.player.col === col;
  const isBox = state.boxes.has(key);
  const isTarget = state.targets.has(key);
  if (isPlayer) {
    return isTarget
      ? { symbol: "@", ariaLabel: `${where} 플레이어(목표 칸 위)`, kind: "player-on-target" }
      : { symbol: "@", ariaLabel: `${where} 플레이어`, kind: "player" };
  }
  if (isBox) {
    return isTarget
      ? { symbol: "■", ariaLabel: `${where} 상자(목표 위, 완료)`, kind: "box-on-target" }
      : { symbol: "□", ariaLabel: `${where} 상자`, kind: "box" };
  }
  if (isTarget) {
    return { symbol: "◎", ariaLabel: `${where} 목표 칸`, kind: "target" };
  }
  return { symbol: "", ariaLabel: `${where} 바닥`, kind: "floor" };
}

/**
 * 전체 보드를 row-major(`views[row][col]`) 셀 뷰 격자로 변환한다(순수·결정적, 입력 불변).
 * 좌표계는 domain의 board[row][col] 관례와 일치한다.
 */
export function sokobanCellViews(state: SokobanState): CellView[][] {
  const rows: CellView[][] = [];
  for (let row = 0; row < state.height; row += 1) {
    const cols: CellView[] = [];
    for (let col = 0; col < state.width; col += 1) {
      cols.push(cellViewAt(state, row, col));
    }
    rows.push(cols);
  }
  return rows;
}

/** 아직 상자가 올라가지 않은(미완성) 목표 칸의 수(순수·결정적, 입력 불변). */
export function countRemainingTargets(state: SokobanState): number {
  let count = 0;
  for (const target of state.targets) {
    if (!state.boxes.has(target)) {
      count += 1;
    }
  }
  return count;
}

/**
 * 진행/클리어를 명확히 구분해 플레이어용 한국어 상태 문구를 만든다(순수·결정적).
 * 클리어 여부는 domain(isSokobanSolved)으로 판정한다(여기서 재판정하지 않음).
 */
export function describeSokobanStatus(state: SokobanState): string {
  if (isSokobanSolved(state)) {
    return "🎉 모든 상자를 목표 칸에 올렸습니다! 클리어!";
  }
  const remaining = countRemainingTargets(state);
  return `상자를 밀어 모든 목표를 채우세요. 남은 목표 ${remaining}개.`;
}

/**
 * 한 수의 불법 사유를 사람이 읽는 한국어로 돌려준다(합법이면 null).
 * 합법성 판정은 domain(isLegalSokobanMove)에 위임하고, 여기서는 사유 문구만 분기한다
 * (불법 수를 조용히 무시하지 않고 `.error`로 안내하기 위함).
 */
export function sokobanMoveErrorReason(state: SokobanState, dir: Direction): string | null {
  if (isLegalSokobanMove(state, dir)) {
    return null;
  }
  const [dr, dc] = DELTAS[dir];
  const nr = state.player.row + dr;
  const nc = state.player.col + dc;
  if (isBlockedCell(state, nr, nc)) {
    return "벽이나 보드 경계가 막고 있어 그 방향으로 갈 수 없습니다.";
  }
  if (state.boxes.has(cellKey(nr, nc))) {
    const br = nr + dr;
    const bc = nc + dc;
    if (isBlockedCell(state, br, bc)) {
      return "상자 너머가 벽/경계라 밀 수 없습니다.";
    }
    if (state.boxes.has(cellKey(br, bc))) {
      return "상자 두 개를 한 번에 밀 수 없습니다.";
    }
  }
  return "그 방향으로 이동할 수 없습니다.";
}

/** 화살표 키 이벤트의 key를 이동 방향으로 매핑한다(해당 키가 아니면 null). */
export function arrowKeyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    default:
      return null;
  }
}

/** 방향 조작 버튼 정의(텍스트 화살표 + 접근성 라벨). 색이 아니라 기호/라벨로 구분한다. */
export interface SokobanMoveControl {
  dir: Direction;
  symbol: string;
  label: string;
}

export const SOKOBAN_MOVE_CONTROLS: readonly SokobanMoveControl[] = [
  { dir: "up", symbol: "↑", label: "위로" },
  { dir: "left", symbol: "←", label: "왼쪽으로" },
  { dir: "down", symbol: "↓", label: "아래로" },
  { dir: "right", symbol: "→", label: "오른쪽으로" },
];
