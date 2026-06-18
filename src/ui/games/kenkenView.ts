// Presentation helpers for the KenKen(켄켄·Calcudoku) screen. Pure functions only —
// 셀 렌더 모델·케이지 경계/대표 칸 라벨·위반 좌표 집합·접근성 라벨·진행 요약을 React/DOM에서
// 분리해 단위 테스트 가능하게 한다. 규칙(채우기/지우기·행/열 중복·케이지 산술·클리어)은
// domain(kenken)/application(playKenKen)에 위임하고 여기서 재구현하지 않는다(부수효과·난수·
// 시간 없는 표시용 변환, 입력 불변).
import {
  type KenKenOp,
  type KenKenPos,
  type KenKenState,
  type KenKenValue,
} from "../../domain/kenken";

/** 진행 상태(클리어 여부). application은 boolean만 주므로 표시용 좁은 타입을 둔다. */
export type KenKenStatus = "playing" | "solved";

/** 케이지 연산 → 색 비의존 표시 기호(+, −, ×, ÷). */
const OP_SYMBOL: Record<KenKenOp, string> = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

/** 케이지 연산 → 접근성용 한국어 이름. */
const OP_NAME: Record<KenKenOp, string> = {
  add: "더하기",
  sub: "빼기",
  mul: "곱하기",
  div: "나누기",
};

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: KenKenPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 위반 좌표 목록을 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 위반 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function violationKeySet(violations: KenKenPos[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of violations) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function kenkenStatusMessage(status: KenKenStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 규칙·케이지에 맞게 채웠습니다"
    : "진행 중";
}

/**
 * 케이지 대표 칸(좌상단: 최소 행, 동률이면 최소 열)에 표시할 라벨을 만든다(순수).
 * - 단일 칸 케이지: 고정값만(`4`).
 * - 여러 칸 케이지: 목표값 + 연산 기호(`6×`, `3−`, `2÷`, `5+`).
 */
export function cageLabel(op: KenKenOp, target: number, cellCount: number): string {
  return cellCount === 1 ? `${target}` : `${target}${OP_SYMBOL[op]}`;
}

/** 케이지 제약을 접근성용 한국어 문구로 변환(순수). 예: "목표 6 곱하기", "고정값 4". */
export function cageClueText(op: KenKenOp, target: number, cellCount: number): string {
  return cellCount === 1 ? `고정값 ${target}` : `목표 ${target} ${OP_NAME[op]}`;
}

/** 케이지의 대표 칸(좌상단: 최소 행, 동률이면 최소 열)을 고른다(순수). */
export function cageAnchor(cells: ReadonlyArray<KenKenPos>): KenKenPos {
  let anchor = cells[0]!;
  for (const pos of cells) {
    if (pos.row < anchor.row || (pos.row === anchor.row && pos.col < anchor.col)) {
      anchor = pos;
    }
  }
  return { row: anchor.row, col: anchor.col };
}

/** 각 칸이 속한 케이지 인덱스를 담은 N×N 격자(순수). 미지정 칸은 -1. */
export function cageIndexGrid(state: KenKenState): number[][] {
  const grid: number[][] = Array.from({ length: state.size }, () =>
    Array.from({ length: state.size }, () => -1),
  );
  state.cages.forEach((cage, index) => {
    for (const pos of cage.cells) {
      grid[pos.row]![pos.col] = index;
    }
  });
  return grid;
}

/** 한 칸의 굵은 케이지 경계(이웃이 다른 케이지이거나 격자 밖이면 true). */
export interface KenKenCellBorders {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 좌표 + 케이지 목표/연산 + 값/위반을 텍스트로 노출).
 * - 빈 칸:  "3행 2열, 케이지 목표 6 곱하기, 빈 칸"
 * - 입력:   "3행 2열, 케이지 고정값 4, 입력 4" (위반이면 "…, 위반")
 * 위반 여부는 전체 보드 기준이라 호출부가 violationKeySet으로 산출해 넘긴다.
 */
export function kenkenCellLabel(
  pos: KenKenPos,
  value: KenKenValue,
  clue: string,
  violated = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const valueText = value === null ? "빈 칸" : `입력 ${value}`;
  return violated
    ? `${coord}, 케이지 ${clue}, ${valueText}, 위반`
    : `${coord}, 케이지 ${clue}, ${valueText}`;
}

/** 한 칸의 렌더 모델(값·기호·케이지 경계/대표 라벨·라벨·위반 여부). */
export interface KenKenCellView {
  row: number;
  col: number;
  value: KenKenValue;
  /** 표시 기호(값이 있으면 숫자 문자열, 빈 칸이면 ""). */
  symbol: string;
  /** 색 비의존 접근성 라벨. */
  label: string;
  /** 현재 위반 칸이면 true → 색 비의존 강조 대상. */
  violated: boolean;
  /** 굵은 케이지 경계(상/우/하/좌 이웃이 다른 케이지/격자 밖). */
  borders: KenKenCellBorders;
  /** 케이지 대표 칸이면 표시 라벨(`6×`/`4`), 아니면 "". */
  cageLabel: string;
}

/**
 * 보드 전체를 셀 렌더 모델 2차원 배열로 변환한다(순수·입력 불변).
 * - 케이지 경계: 인접 칸이 다른 케이지/격자 밖이면 그 방향에 굵은 경계.
 * - 대표 칸 라벨: 케이지 좌상단 칸에만 목표값+연산(단일 칸은 고정값).
 * - 위반 좌표는 violationKeySet으로 O(1) 조회해 각 칸에 반영한다(규칙 재구현 금지).
 */
export function kenkenCellViews(
  state: KenKenState,
  violations: KenKenPos[],
): KenKenCellView[][] {
  const vkeys = violationKeySet(violations);
  const cageOf = cageIndexGrid(state);
  // 케이지 인덱스 → (대표 칸 키, 라벨). 대표 칸에만 라벨을 그린다.
  const anchorByCage = new Map<number, string>();
  const labelByCage = new Map<number, string>();
  state.cages.forEach((cage, index) => {
    anchorByCage.set(index, cellKey(cageAnchor(cage.cells)));
    labelByCage.set(index, cageLabel(cage.op, cage.target, cage.cells.length));
  });

  const size = state.size;
  const sameCage = (r: number, c: number, cage: number): boolean =>
    r >= 0 && r < size && c >= 0 && c < size && cageOf[r]![c] === cage;

  return state.grid.map((rowCells, row) =>
    rowCells.map((value, col) => {
      const pos: KenKenPos = { row, col };
      const key = cellKey(pos);
      const violated = vkeys.has(key);
      const cage = cageOf[row]![col]!;
      const clue = cageClueText(
        state.cages[cage]!.op,
        state.cages[cage]!.target,
        state.cages[cage]!.cells.length,
      );
      return {
        row,
        col,
        value,
        symbol: value === null ? "" : String(value),
        label: kenkenCellLabel(pos, value, clue, violated),
        violated,
        borders: {
          top: !sameCage(row - 1, col, cage),
          right: !sameCage(row, col + 1, cage),
          bottom: !sameCage(row + 1, col, cage),
          left: !sameCage(row, col - 1, cage),
        },
        cageLabel: anchorByCage.get(cage) === key ? labelByCage.get(cage)! : "",
      };
    }),
  );
}

/**
 * 채운 칸·남은 칸·현재 위반 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 예: "채운 칸 6 · 남은 칸 3 · 위반 1".
 */
export function kenkenProgressLabel(
  state: KenKenState,
  violationCount: number,
): string {
  let filled = 0;
  let total = 0;
  for (const rowCells of state.grid) {
    for (const value of rowCells) {
      total += 1;
      if (value !== null) {
        filled += 1;
      }
    }
  }
  return `채운 칸 ${filled} · 남은 칸 ${total - filled} · 위반 ${violationCount}`;
}
