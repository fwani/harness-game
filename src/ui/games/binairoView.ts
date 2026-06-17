// Presentation helpers for the Binairo(비나이로·Takuzu) screen. Pure functions only — 셀 렌더 모델·
// 위반 좌표 집합·접근성 라벨·다음 값 순환·진행/상태 요약을 React/DOM에서 분리해 단위 테스트 가능하게
// 한다. 규칙(채우기/지우기·위반·클리어)은 domain(binairo)/application(playBinairo)에 위임하고 여기서
// 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import {
  isBinairoGiven,
  type BinairoPos,
  type BinairoState,
  type BinairoValue,
} from "../../domain/binairo";
import type { BinairoStatus } from "../../application/playBinairo";

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: BinairoPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 위반 좌표 목록을 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 위반 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function violationKeySet(violations: BinairoPos[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of violations) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/**
 * 한 칸을 클릭(또는 한 번 입력)했을 때의 다음 값을 계산한다(순수·결정적).
 * 빈 칸(null) → 0 → 1 → 빈 칸(null) 순환.
 */
export function nextBinairoValue(value: BinairoValue): BinairoValue {
  if (value === null) return 0;
  if (value === 0) return 1;
  return null;
}

/** 0/1/빈 칸의 표시 기호(색 비의존 텍스트). 0→"0", 1→"1", 빈 칸→"". */
export function binairoCellSymbol(value: BinairoValue): string {
  if (value === 0) return "0";
  if (value === 1) return "1";
  return "";
}

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function binairoStatusMessage(status: BinairoStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 규칙에 맞게 채웠습니다"
    : "진행 중";
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 고정 단서/입력/빈 칸/위반을 텍스트로도 노출).
 * - 빈 칸:      "3행 5열, 빈 칸"
 * - 고정 단서:  "3행 5열, 고정 단서 0"
 * - 입력:       "3행 5열, 입력 1" (위반이면 "…, 입력 1, 위반")
 * 위반 여부는 전체 보드 기준이라 호출부가 violationKeySet으로 산출해 넘긴다.
 */
export function binairoCellLabel(
  state: BinairoState,
  pos: BinairoPos,
  violated = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const value = state.grid[pos.row]?.[pos.col] ?? null;
  if (value === null) {
    return `${coord}, 빈 칸`;
  }
  const role = isBinairoGiven(state, pos) ? "고정 단서" : "입력";
  return violated
    ? `${coord}, ${role} ${value}, 위반`
    : `${coord}, ${role} ${value}`;
}

/** 한 칸의 렌더 모델(값·기호·라벨·고정 단서(비활성)·위반 여부). */
export interface BinairoCellView {
  row: number;
  col: number;
  value: BinairoValue;
  /** 표시 기호("0"/"1"/""). */
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
 * 도메인 isBinairoGiven에 위임한다(규칙 재구현 금지).
 */
export function binairoCellViews(
  state: BinairoState,
  violations: BinairoPos[],
): BinairoCellView[][] {
  const vkeys = violationKeySet(violations);
  return state.grid.map((rowCells, row) =>
    rowCells.map((value, col) => {
      const pos: BinairoPos = { row, col };
      const violated = vkeys.has(cellKey(pos));
      return {
        row,
        col,
        value,
        symbol: binairoCellSymbol(value),
        label: binairoCellLabel(state, pos, violated),
        given: isBinairoGiven(state, pos),
        violated,
      };
    }),
  );
}

/**
 * 채운 칸·남은 칸·현재 위반 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 예: "채운 칸 12 · 남은 칸 24 · 위반 2".
 */
export function binairoProgressLabel(
  state: BinairoState,
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
