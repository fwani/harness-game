// Presentation helpers for the 스도쿠(Sudoku) 난이도 선택 시작 폼. Pure functions only —
// 난이도(초급/중급/고급) 선택지·기본값·라벨·임의 입력 정규화(검증)를 React/DOM에서 분리해
// 단위 테스트 가능하게 한다. 게임 규칙은 다루지 않으며(난이도→퍼즐 선택은 application의
// startSudokuGame(random, difficulty) 경로 재사용), 부수효과·난수·시간 없는 표시/검증용
// 변환만 둔다(입력 불변). 동형 선례: minesweeperStartOptionsView/reversiStartOptionsView.
import type { SudokuDifficulty } from "../../application/playSudoku";

/** 난이도 선택지(라벨 포함). 색 비의존: 한국어 텍스트 + 단서 수 안내로 구분한다. */
export interface SudokuDifficultyOption {
  id: SudokuDifficulty;
  label: string;
}

/**
 * 난이도 선택지 목록. 표시 순서는 쉬움→어려움(초급→중급→고급).
 * 라벨은 위키 관례(고정 단서 수)를 함께 안내한다(단서가 적을수록 어렵다).
 */
export const SUDOKU_DIFFICULTY_OPTIONS: readonly SudokuDifficultyOption[] = [
  { id: "easy", label: "초급 (단서 많음)" },
  { id: "medium", label: "중급 (단서 보통)" },
  { id: "hard", label: "고급 (단서 적음)" },
] as const;

/** 기본 난이도(중급) — 기존 무작위 풀과 가까운 표준 난이도. */
export const DEFAULT_SUDOKU_DIFFICULTY: SudokuDifficulty = "medium";

/** 난이도 → 한국어 라벨(초급/중급/고급). 미지원 값은 기본 난이도 라벨로 폴백. */
export function sudokuDifficultyLabel(d: SudokuDifficulty): string {
  return (
    SUDOKU_DIFFICULTY_OPTIONS.find((o) => o.id === d) ??
    SUDOKU_DIFFICULTY_OPTIONS.find((o) => o.id === DEFAULT_SUDOKU_DIFFICULTY)!
  ).label;
}

/**
 * 임의 입력(id 문자열)을 안전한 난이도로 정규화한다(순수·결정적, 입력 불변).
 * - 지원하는 id(easy/medium/hard)면 그 값을, 아니면 기본 난이도(중급)로 폴백.
 */
export function normalizeSudokuDifficulty(id?: string): SudokuDifficulty {
  return (
    SUDOKU_DIFFICULTY_OPTIONS.find((o) => o.id === id)?.id ??
    DEFAULT_SUDOKU_DIFFICULTY
  );
}
