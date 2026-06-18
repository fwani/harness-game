// Presentation helpers for the Skyscrapers(마천루·빌딩 퍼즐) screen. Pure functions only —
// 셀 렌더 모델·위반 좌표 집합·접근성 라벨·네 변 "보이는 빌딩 수" 단서 표시 모델·진행/상태 요약을
// React/DOM에서 분리해 단위 테스트 가능하게 한다. 규칙(채우기/지우기·행/열 중복·변 가시성 단서·
// 클리어)은 domain(skyscrapers)/application(playSkyscrapers)에 위임하고 여기서 재구현하지 않는다
// (부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import {
  isSkyscraperGiven,
  type SkyscraperPos,
  type SkyscraperState,
  type SkyscraperValue,
} from "../../domain/skyscrapers";
import type { SkyscraperStatus } from "../../application/playSkyscrapers";
import type { CSSProperties } from "react";

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: SkyscraperPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 위반 좌표 목록을 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 위반 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function violationKeySet(violations: SkyscraperPos[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of violations) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function skyscraperStatusMessage(status: SkyscraperStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 규칙·변 단서에 맞게 채웠습니다"
    : "진행 중";
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 고정 단서/입력/빈 칸/위반을 텍스트로도 노출).
 * - 빈 칸:      "3행 2열, 빈 칸"
 * - 고정 단서:  "3행 2열, 고정 단서 1"
 * - 입력:       "3행 2열, 입력 2" (위반이면 "…, 입력 2, 위반")
 * 위반 여부는 전체 보드 기준이라 호출부가 violationKeySet으로 산출해 넘긴다.
 */
export function skyscraperCellLabel(
  state: SkyscraperState,
  pos: SkyscraperPos,
  violated = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const value = state.grid[pos.row]?.[pos.col] ?? null;
  if (value === null) {
    return `${coord}, 빈 칸`;
  }
  const role = isSkyscraperGiven(state, pos) ? "고정 단서" : "입력";
  return violated
    ? `${coord}, ${role} ${value}, 위반`
    : `${coord}, ${role} ${value}`;
}

/** 한 칸의 렌더 모델(값·기호·라벨·고정 단서(비활성)·위반 여부). */
export interface SkyscraperCellView {
  row: number;
  col: number;
  value: SkyscraperValue;
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
 * 보드(입력 격자)를 셀 렌더 모델 N×N 배열로 변환한다(순수·입력 불변).
 * 위반 좌표는 violationKeySet으로 O(1) 조회해 각 칸에 반영하고, 고정 단서 비활성 판정은
 * 도메인 isSkyscraperGiven에 위임한다(규칙 재구현 금지).
 */
export function skyscraperCellViews(
  state: SkyscraperState,
  violations: SkyscraperPos[],
): SkyscraperCellView[][] {
  const vkeys = violationKeySet(violations);
  return state.grid.map((rowCells, row) =>
    rowCells.map((value, col) => {
      const pos: SkyscraperPos = { row, col };
      const violated = vkeys.has(cellKey(pos));
      return {
        row,
        col,
        value,
        symbol: value === null ? "" : String(value),
        label: skyscraperCellLabel(state, pos, violated),
        given: isSkyscraperGiven(state, pos),
        violated,
      };
    }),
  );
}

/** 격자 네 변. top/bottom = 열 기준, left/right = 행 기준. */
export type SkyscraperSide = "top" | "bottom" | "left" | "right";

/** 한 변의 한 단서 표시 모델(매핑되는 행/열 인덱스 + 색 비의존 기호/라벨). */
export interface SkyscraperClueView {
  side: SkyscraperSide;
  /** 매핑되는 행(left/right) 또는 열(top/bottom) 인덱스(0..N-1). */
  index: number;
  /** 단서 값(없으면 null). */
  value: number | null;
  /** 표시 기호(없으면 ""). 색이 아니라 숫자 텍스트로 단서를 드러낸다. */
  symbol: string;
  /** 색 비의존 접근성 라벨(단서 없으면 ""). */
  label: string;
}

/** 변(side) 이름을 접근성 문구용 한국어로 변환. */
const SIDE_NAME: Record<SkyscraperSide, string> = {
  top: "위에서",
  bottom: "아래에서",
  left: "왼쪽에서",
  right: "오른쪽에서",
};

/**
 * 한 변·인덱스·값으로 색 비의존 접근성 라벨을 만든다(순수).
 * - top/bottom: "{열}열 {방향} 보이는 빌딩 {n}개"
 * - left/right: "{행}행 {방향} 보이는 빌딩 {n}개"
 * - 단서가 없으면(null) 빈 문자열.
 */
export function sideClueLabel(
  side: SkyscraperSide,
  index: number,
  value: number | null,
): string {
  if (value === null) {
    return "";
  }
  const axis = side === "left" || side === "right" ? "행" : "열";
  return `${index + 1}${axis} ${SIDE_NAME[side]} 보이는 빌딩 ${value}개`;
}

/** 한 변의 단서 배열(길이 N)을 표시 모델로 변환한다(순수·입력 불변). */
function clueLineViews(
  side: SkyscraperSide,
  line: ReadonlyArray<number | null>,
): SkyscraperClueView[] {
  return line.map((raw, index) => {
    const value = raw ?? null;
    return {
      side,
      index,
      value,
      symbol: value === null ? "" : String(value),
      label: sideClueLabel(side, index, value),
    };
  });
}

/** 네 변 단서 + 해당 행/열 매핑(top/bottom→열, left/right→행)을 도출한다(순수·입력 불변). */
export interface SkyscraperClueViews {
  top: SkyscraperClueView[];
  bottom: SkyscraperClueView[];
  left: SkyscraperClueView[];
  right: SkyscraperClueView[];
}

/**
 * 도메인 상태의 정규화된 변 단서(state.clues)를 네 변의 표시 모델로 변환한다(순수·입력 불변).
 * 각 배열 길이 = N. index는 매핑되는 행(left/right) 또는 열(top/bottom)이다.
 */
export function skyscraperClueViews(
  state: SkyscraperState,
): SkyscraperClueViews {
  const { clues } = state;
  return {
    top: clueLineViews("top", clues.top),
    bottom: clueLineViews("bottom", clues.bottom),
    left: clueLineViews("left", clues.left),
    right: clueLineViews("right", clues.right),
  };
}

/** 확장 보드의 한 슬롯: 빈 모서리 / 변 단서 / 실제 입력 칸. */
export type SkyscraperSlot =
  | { kind: "corner" }
  | { kind: "clue"; clue: SkyscraperClueView }
  | { kind: "cell"; cell: SkyscraperCellView };

/**
 * N×N 입력 격자를 네 변 단서를 두른 (N+2)×(N+2) 확장 그리드로 변환한다(순수·입력 불변).
 * - 네 모서리(0/N+1 행·열의 교차) → corner(빈 칸).
 * - 0행(맨 위)/N+1행(맨 아래)의 1..N열 → top/bottom 열 단서.
 * - 0열(맨 왼쪽)/N+1열(맨 오른쪽)의 1..N행 → left/right 행 단서.
 * - 안쪽 1..N행·1..N열 → 실제 입력 칸(SkyscraperCellView).
 * 단서를 격자 바깥 네 변에 숫자로 배치해 색에 의존하지 않고 가시성 제약을 드러낸다.
 */
export function skyscraperBoardView(
  state: SkyscraperState,
  violations: SkyscraperPos[],
): SkyscraperSlot[][] {
  const cells = skyscraperCellViews(state, violations);
  const clues = skyscraperClueViews(state);
  const size = state.size;
  const span = size + 2;
  const rows: SkyscraperSlot[][] = [];
  for (let r = 0; r < span; r += 1) {
    const row: SkyscraperSlot[] = [];
    for (let c = 0; c < span; c += 1) {
      const onTop = r === 0;
      const onBottom = r === span - 1;
      const onLeft = c === 0;
      const onRight = c === span - 1;
      if ((onTop || onBottom) && (onLeft || onRight)) {
        row.push({ kind: "corner" });
      } else if (onTop) {
        row.push({ kind: "clue", clue: clues.top[c - 1]! });
      } else if (onBottom) {
        row.push({ kind: "clue", clue: clues.bottom[c - 1]! });
      } else if (onLeft) {
        row.push({ kind: "clue", clue: clues.left[r - 1]! });
      } else if (onRight) {
        row.push({ kind: "clue", clue: clues.right[r - 1]! });
      } else {
        row.push({ kind: "cell", cell: cells[r - 1]![c - 1]! });
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * (N+2)×(N+2) 확장 그리드(단서 변 + 입력 칸)의 트랙 크기 스타일을 만든다(순수).
 * - 모든 트랙은 `minmax(0, 1fr)`(가로)·`cellPx`(세로)로 좁은 폭에서 함께 줄어든다.
 * - maxWidth는 트랙 수×cellPx로 캡해 넓은 화면에서 기존 칸 크기를 유지한다.
 */
export function skyscraperGridStyle(
  size: number,
  cellPx = 44,
): CSSProperties {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(
      `skyscraperGridStyle: size must be an integer >= 2, got ${size}`,
    );
  }
  const tracks = size + 2;
  return {
    gridTemplateColumns: `repeat(${tracks}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${tracks}, ${cellPx}px)`,
    maxWidth: `${tracks * cellPx}px`,
  };
}

/**
 * 채운 칸·남은 칸·현재 위반 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 고정 단서 칸도 "채운 칸"으로 센다(모두 채우고 위반이 없으면 클리어). 예: "채운 칸 6 · 남은 칸 10 · 위반 1".
 */
export function skyscraperProgressLabel(
  state: SkyscraperState,
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
