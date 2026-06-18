// Presentation helpers for the Hitori(히토리) screen. Pure functions only — 셀 렌더 모델·
// 위반 좌표 집합·접근성 라벨·위반 유형 한국어 요약·진행/상태 요약·전적 win 판정을 React/DOM에서
// 분리해 단위 테스트 가능하게 한다. 규칙(칠하기/되돌리기·white 행/열 중복·인접 black·white 연결·
// 클리어)은 domain(hitori)/application(playHitori)에 위임하고 여기서 재구현하지 않는다(부수효과·
// 난수·시간 없는 표시용 변환, 입력 불변).
import {
  type HitoriMark,
  type HitoriPos,
  type HitoriState,
  type HitoriViolation,
} from "../../domain/hitori";
import type { HitoriStatus } from "../../application/playHitori";
import type { WinSide } from "../records";

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: HitoriPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 위반 목록에 등장하는 모든 칸 좌표를 평탄화한다(순수·입력 불변).
 * 세 위반 유형 모두 `cells`에 관련 좌표를 담으므로 그대로 모은다(중복 포함 가능).
 */
export function violationCells(violations: HitoriViolation[]): HitoriPos[] {
  const cells: HitoriPos[] = [];
  for (const violation of violations) {
    for (const pos of violation.cells) {
      cells.push(pos);
    }
  }
  return cells;
}

/**
 * 위반 칸 좌표를 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 위반 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function violationKeySet(violations: HitoriViolation[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of violationCells(violations)) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function hitoriStatusMessage(status: HitoriStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 규칙에 맞게 칠했습니다"
    : "진행 중";
}

/**
 * 위반 한 건을 사람이 읽는 한국어 한 줄로 요약한다(순수·결정적, 색 비의존).
 *  - duplicate-white: "2행: 칠하지 않은 숫자 5 중복" / "3열: 칠하지 않은 숫자 5 중복"
 *  - adjacent-black:  "칠한 칸 인접: 2행 3열·2행 4열"
 *  - disconnected-white: "칠하지 않은 칸 3개가 분리됨"
 */
export function hitoriViolationLabel(violation: HitoriViolation): string {
  switch (violation.type) {
    case "duplicate-white": {
      const line = violation.line === "row" ? "행" : "열";
      return `${violation.index + 1}${line}: 칠하지 않은 숫자 ${violation.value} 중복`;
    }
    case "adjacent-black": {
      const [a, b] = violation.cells;
      return `칠한 칸 인접: ${a.row + 1}행 ${a.col + 1}열·${b.row + 1}행 ${b.col + 1}열`;
    }
    case "disconnected-white":
      return `칠하지 않은 칸 ${violation.cells.length}개가 분리됨`;
  }
}

/** 위반 목록 전체를 사람이 읽는 한국어 라벨 배열로 변환한다(순수·입력 불변). */
export function hitoriViolationLabels(violations: HitoriViolation[]): string[] {
  return violations.map(hitoriViolationLabel);
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 숫자·칠함 여부·위반을 텍스트로도 노출).
 * - 안 칠함: "3행 2열, 숫자 5, 안 칠함"
 * - 칠함:    "3행 2열, 숫자 5, 칠함"
 * - 위반이면 라벨 끝에 ", 위반"을 덧붙인다.
 * 위반 여부는 전체 보드 기준이라 호출부가 violationKeySet으로 산출해 넘긴다.
 */
export function hitoriCellLabel(
  state: HitoriState,
  pos: HitoriPos,
  violated = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const value = state.numbers[pos.row]![pos.col]!;
  const mark = state.marks[pos.row]![pos.col]!;
  const markLabel = mark === "black" ? "칠함" : "안 칠함";
  const base = `${coord}, 숫자 ${value}, ${markLabel}`;
  return violated ? `${base}, 위반` : base;
}

/** 한 칸의 렌더 모델(고정 숫자·칠 상태·기호·라벨·위반 여부). */
export interface HitoriCellView {
  row: number;
  col: number;
  /** 고정 숫자(항상 표시). */
  value: number;
  /** 항상 표시하는 숫자 기호. */
  symbol: string;
  /** 현재 칠 상태(white/black). */
  mark: HitoriMark;
  /** black(칠함)이면 true → 색 비의존 채움 표식 대상. */
  marked: boolean;
  /** 색 비의존 접근성 라벨. */
  label: string;
  /** 현재 위반 칸이면 true → 색 비의존 강조 대상. */
  violated: boolean;
}

/**
 * 보드 전체를 셀 렌더 모델 2차원 배열로 변환한다(순수·입력 불변).
 * 위반 좌표는 violationKeySet으로 O(1) 조회해 각 칸에 반영한다(규칙 재구현 금지).
 */
export function hitoriCellViews(
  state: HitoriState,
  violations: HitoriViolation[],
): HitoriCellView[][] {
  const vkeys = violationKeySet(violations);
  return state.numbers.map((rowCells, row) =>
    rowCells.map((value, col) => {
      const pos: HitoriPos = { row, col };
      const mark = state.marks[row]![col]!;
      const violated = vkeys.has(cellKey(pos));
      return {
        row,
        col,
        value,
        symbol: String(value),
        mark,
        marked: mark === "black",
        label: hitoriCellLabel(state, pos, violated),
        violated,
      };
    }),
  );
}

/**
 * 칠한 칸 수·위반 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 예: "칠한 칸 2 · 위반 0".
 */
export function hitoriProgressLabel(
  state: HitoriState,
  violationCount: number,
): string {
  let marked = 0;
  for (const rowMarks of state.marks) {
    for (const mark of rowMarks) {
      if (mark === "black") {
        marked += 1;
      }
    }
  }
  return `칠한 칸 ${marked} · 위반 ${violationCount}`;
}

/**
 * 클리어 시 전적에 기록할 승부 결과를 돌려준다(순수·결정적).
 * 단일 플레이라 클리어=사람(a) 승, 진행 중이면 null(기록하지 않음).
 */
export function hitoriRecordWinSide(status: HitoriStatus): WinSide | null {
  return status === "solved" ? "a" : null;
}
