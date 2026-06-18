// Presentation helpers for the Futoshiki(후토시키·부등호 라틴방진) screen. Pure functions only —
// 셀 렌더 모델·위반 좌표 집합·접근성 라벨·부등호 제약 표시 모델·진행/상태 요약을 React/DOM에서
// 분리해 단위 테스트 가능하게 한다. 규칙(채우기/지우기·행/열 중복·부등호 제약·클리어)은
// domain(futoshiki)/application(playFutoshiki)에 위임하고 여기서 재구현하지 않는다(부수효과·난수·
// 시간 없는 표시용 변환, 입력 불변).
import {
  isFutoshikiGiven,
  type FutoshikiConstraint,
  type FutoshikiPos,
  type FutoshikiState,
  type FutoshikiValue,
} from "../../domain/futoshiki";
import type { FutoshikiStatus } from "../../application/playFutoshiki";
import type { CSSProperties } from "react";

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: FutoshikiPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 위반 좌표 목록을 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 위반 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function violationKeySet(violations: FutoshikiPos[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of violations) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function futoshikiStatusMessage(status: FutoshikiStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 규칙에 맞게 채웠습니다"
    : "진행 중";
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 고정 단서/입력/빈 칸/위반을 텍스트로도 노출).
 * - 빈 칸:      "3행 2열, 빈 칸"
 * - 고정 단서:  "3행 2열, 고정 단서 1"
 * - 입력:       "3행 2열, 입력 2" (위반이면 "…, 입력 2, 위반")
 * 위반 여부는 전체 보드 기준이라 호출부가 violationKeySet으로 산출해 넘긴다.
 */
export function futoshikiCellLabel(
  state: FutoshikiState,
  pos: FutoshikiPos,
  violated = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const value = state.grid[pos.row]?.[pos.col] ?? null;
  if (value === null) {
    return `${coord}, 빈 칸`;
  }
  const role = isFutoshikiGiven(state, pos) ? "고정 단서" : "입력";
  return violated
    ? `${coord}, ${role} ${value}, 위반`
    : `${coord}, ${role} ${value}`;
}

/** 한 칸의 렌더 모델(값·기호·라벨·고정 단서(비활성)·위반 여부). */
export interface FutoshikiCellView {
  row: number;
  col: number;
  value: FutoshikiValue;
  /** 표시 기호(값이 있으면 숫자 문자열, 빈 칸이면 ""). */
  symbol: string;
  /** 색 비의존 접근성 라벨. */
  label: string;
  /** 고정 단서면 true → 편집 불가(비활성). */
  given: boolean;
  /** 현재 위반 칸이면 true → 색 비의존 강조 대상. */
  violated: boolean;
}

/**
 * 보드 전체를 셀 렌더 모델 2차원 배열로 변환한다(순수·입력 불변).
 * 위반 좌표는 violationKeySet으로 O(1) 조회해 각 칸에 반영하고, 고정 단서 비활성 판정은
 * 도메인 isFutoshikiGiven에 위임한다(규칙 재구현 금지).
 */
export function futoshikiCellViews(
  state: FutoshikiState,
  violations: FutoshikiPos[],
): FutoshikiCellView[][] {
  const vkeys = violationKeySet(violations);
  return state.grid.map((rowCells, row) =>
    rowCells.map((value, col) => {
      const pos: FutoshikiPos = { row, col };
      const violated = vkeys.has(cellKey(pos));
      return {
        row,
        col,
        value,
        symbol: value === null ? "" : String(value),
        label: futoshikiCellLabel(state, pos, violated),
        given: isFutoshikiGiven(state, pos),
        violated,
      };
    }),
  );
}

/** 인접 칸 사이 부등호 제약의 표시 모델(가로/세로 방향·색 비의존 기호·접근성 라벨). */
export interface FutoshikiConstraintView {
  /** "h" = 가로 인접 칸 사이, "v" = 세로 인접 칸 사이. */
  orientation: "h" | "v";
  /** 표시 기호: 가로 "<"/">", 세로 "∧"/"∨"(기호의 벌어진 쪽이 더 큰 값). */
  symbol: string;
  /** 색 비의존 접근성 라벨(예: "왼쪽 칸이 더 작음"). */
  label: string;
}

/**
 * 제약의 "왼쪽/위쪽 칸 기준" 키와 표시 모델을 만든다(순수).
 * - 가로 제약(같은 행): 키 `h:${row}:${leftCol}`. lt가 왼쪽이면 "<"(왼쪽이 더 작음), 아니면 ">".
 * - 세로 제약(같은 열): 키 `v:${topRow}:${col}`. lt가 위쪽이면 "∧"(위가 더 작음), 아니면 "∨".
 */
function constraintEntry(
  constraint: FutoshikiConstraint,
): { key: string; view: FutoshikiConstraintView } {
  const { lt, gt } = constraint;
  if (lt.row === gt.row) {
    const leftCol = Math.min(lt.col, gt.col);
    const ltIsLeft = lt.col === leftCol;
    return {
      key: `h:${lt.row}:${leftCol}`,
      view: {
        orientation: "h",
        symbol: ltIsLeft ? "<" : ">",
        label: ltIsLeft ? "왼쪽 칸이 더 작음" : "왼쪽 칸이 더 큼",
      },
    };
  }
  const topRow = Math.min(lt.row, gt.row);
  const ltIsTop = lt.row === topRow;
  return {
    key: `v:${topRow}:${lt.col}`,
    view: {
      orientation: "v",
      symbol: ltIsTop ? "∧" : "∨",
      label: ltIsTop ? "위 칸이 더 작음" : "위 칸이 더 큼",
    },
  };
}

/**
 * 제약 목록을 사이-칸 키(`h:r:leftCol` / `v:topRow:col`)→표시 모델 Map으로 변환한다(순수).
 * UI는 두 칸 사이 슬롯마다 이 Map을 O(1) 조회해 부등호 기호를 색 비의존으로 렌더한다.
 */
export function constraintViewMap(
  state: FutoshikiState,
): Map<string, FutoshikiConstraintView> {
  const map = new Map<string, FutoshikiConstraintView>();
  for (const constraint of state.constraints) {
    const { key, view } = constraintEntry(constraint);
    map.set(key, view);
  }
  return map;
}

/** 확장 보드의 한 슬롯: 실제 칸 / 부등호 제약 / 빈 모서리. */
export type FutoshikiSlot =
  | { kind: "cell"; cell: FutoshikiCellView }
  | { kind: "constraint"; constraint: FutoshikiConstraintView }
  | { kind: "empty" };

/**
 * N×N 보드를 칸 사이에 부등호 슬롯을 끼운 (2N-1)×(2N-1) 확장 그리드로 변환한다(순수·입력 불변).
 * - (짝수행, 짝수열) → 실제 칸,
 * - (짝수행, 홀수열) → 가로 제약 슬롯(있으면 constraint, 없으면 empty),
 * - (홀수행, 짝수열) → 세로 제약 슬롯,
 * - (홀수행, 홀수열) → 빈 모서리.
 * 부등호 기호를 칸 사이에 명확히 보여 색에 의존하지 않고 제약 방향을 드러낸다.
 */
export function futoshikiBoardView(
  state: FutoshikiState,
  violations: FutoshikiPos[],
): FutoshikiSlot[][] {
  const cells = futoshikiCellViews(state, violations);
  const constraints = constraintViewMap(state);
  const size = state.size;
  const span = size * 2 - 1;
  const rows: FutoshikiSlot[][] = [];
  for (let dr = 0; dr < span; dr += 1) {
    const row: FutoshikiSlot[] = [];
    for (let dc = 0; dc < span; dc += 1) {
      const rowEven = dr % 2 === 0;
      const colEven = dc % 2 === 0;
      if (rowEven && colEven) {
        row.push({ kind: "cell", cell: cells[dr / 2]![dc / 2]! });
      } else if (rowEven && !colEven) {
        const view = constraints.get(`h:${dr / 2}:${(dc - 1) / 2}`);
        row.push(view ? { kind: "constraint", constraint: view } : { kind: "empty" });
      } else if (!rowEven && colEven) {
        const view = constraints.get(`v:${(dr - 1) / 2}:${dc / 2}`);
        row.push(view ? { kind: "constraint", constraint: view } : { kind: "empty" });
      } else {
        row.push({ kind: "empty" });
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * 확장 그리드(칸 + 사이 슬롯)의 트랙 크기 스타일을 만든다(순수).
 * - 칸 트랙은 `minmax(0, 1fr)`로 좁은 폭에서 줄어들고, 사이 슬롯은 고정 폭(gapPx).
 * - maxWidth는 칸 N개 + 사이 N-1개의 합으로 캡해 넓은 화면에서 기존 칸 크기를 유지한다.
 */
export function futoshikiGridStyle(
  size: number,
  cellPx = 44,
  gapPx = 20,
): CSSProperties {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`futoshikiGridStyle: size must be an integer >= 2, got ${size}`);
  }
  const cols: string[] = [];
  const rows: string[] = [];
  for (let i = 0; i < size * 2 - 1; i += 1) {
    if (i % 2 === 0) {
      cols.push("minmax(0, 1fr)");
      rows.push(`${cellPx}px`);
    } else {
      cols.push(`${gapPx}px`);
      rows.push(`${gapPx}px`);
    }
  }
  return {
    gridTemplateColumns: cols.join(" "),
    gridTemplateRows: rows.join(" "),
    maxWidth: `${size * cellPx + (size - 1) * gapPx}px`,
  };
}

/**
 * 채운 칸·남은 칸·현재 위반 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 예: "채운 칸 6 · 남은 칸 10 · 위반 1".
 */
export function futoshikiProgressLabel(
  state: FutoshikiState,
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
