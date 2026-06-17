// Presentation helpers for the Sudoku screen. Pure functions only — 상태 메시지·충돌 키 집합·
// 접근성 라벨·진행 요약을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 규칙(채우기/지우기·충돌·클리어)은 domain(sudoku)/application(playSudoku)에 위임하고 여기서
// 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import { isSudokuGiven, type SudokuPos, type SudokuState } from "../../domain/sudoku";
import type { SudokuStatus } from "../../application/playSudoku";

/** 진행 상태를 플레이어용 한국어 메시지로 변환(순수·결정적). */
export function sudokuStatusMessage(status: SudokuStatus): string {
  return status === "solved"
    ? "클리어! 모든 칸을 충돌 없이 채웠습니다"
    : "진행 중";
}

/** 좌표를 셀 비교용 키 `${row},${col}`로 변환(순수). */
export function cellKey(pos: SudokuPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * 충돌 좌표 목록을 `${row},${col}` 키 집합으로 변환한다(셀 강조용, 순수·입력 불변).
 * UI는 셀마다 이 집합으로 O(1) 조회해 충돌 여부를 색 비의존 라벨/표시에 반영한다.
 */
export function conflictKeySet(conflicts: SudokuPos[]): Set<string> {
  const keys = new Set<string>();
  for (const pos of conflicts) {
    keys.add(cellKey(pos));
  }
  return keys;
}

/**
 * 한 칸의 접근성 라벨(색 비의존: 고정 단서/입력/충돌을 텍스트로도 노출).
 * - 고정 단서: "3행 5열, 고정 단서 7"
 * - 빈 칸:     "3행 5열, 빈 칸"
 * - 입력:      "3행 5열, 입력 4" (충돌이면 "…, 입력 4, 충돌")
 * 충돌 여부는 전체 보드 기준이라 호출부가 conflictKeySet으로 산출해 넘긴다.
 */
export function sudokuCellLabel(
  state: SudokuState,
  pos: SudokuPos,
  conflicted = false,
): string {
  const coord = `${pos.row + 1}행 ${pos.col + 1}열`;
  const value = state.cells[pos.row]?.[pos.col] ?? null;
  if (value === null) {
    return `${coord}, 빈 칸`;
  }
  if (isSudokuGiven(state, pos)) {
    return `${coord}, 고정 단서 ${value}`;
  }
  return conflicted ? `${coord}, 입력 ${value}, 충돌` : `${coord}, 입력 ${value}`;
}

/**
 * 채운 칸·남은 칸·현재 충돌 수를 한 줄로 요약한다(진행 상태 항상 표시용, 순수·결정적).
 * 예: "채운 칸 30 · 남은 칸 51 · 충돌 2".
 */
export function sudokuProgressLabel(
  state: SudokuState,
  conflictCount: number,
): string {
  let filled = 0;
  let total = 0;
  for (const rowCells of state.cells) {
    for (const value of rowCells) {
      total += 1;
      if (value !== null) {
        filled += 1;
      }
    }
  }
  return `채운 칸 ${filled} · 남은 칸 ${total - filled} · 충돌 ${conflictCount}`;
}
