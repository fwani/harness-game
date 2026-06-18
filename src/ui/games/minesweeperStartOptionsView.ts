// Presentation helpers for the 지뢰찾기(Minesweeper) 난이도 선택 폼. Pure functions only —
// 표준 난이도 프리셋(보드 크기·지뢰 수) 목록·기본값·임의 입력 정규화(검증)를 React/DOM에서
// 분리해 단위 테스트 가능하게 한다. 게임 규칙은 다루지 않으며(도메인/애플리케이션의
// startMinesweeperGame(rows, cols, mines) config 경로 재사용), 부수효과·난수·시간 없는
// 표시/검증용 변환만 둔다(입력 불변).

/** 표준 난이도 프리셋. rows=행 수, cols=열 수, mines=지뢰 수. */
export interface MinesweeperDifficulty {
  id: "beginner" | "intermediate" | "expert";
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

/**
 * 표준 Minesweeper(Windows) 난이도 — Beginner 9×9·지뢰 10, Intermediate 16×16·지뢰 40,
 * Expert 30×16(가로 30·세로 16)·지뢰 99. 라벨은 색에 의존하지 않는 텍스트(💣=지뢰).
 */
export const MINESWEEPER_DIFFICULTIES: readonly MinesweeperDifficulty[] = [
  { id: "beginner", label: "초급 9×9·💣10", rows: 9, cols: 9, mines: 10 },
  { id: "intermediate", label: "중급 16×16·💣40", rows: 16, cols: 16, mines: 40 },
  { id: "expert", label: "고급 30×16·💣99", rows: 16, cols: 30, mines: 99 },
] as const;

/** 기본 난이도(초급). */
export const DEFAULT_MINESWEEPER_DIFFICULTY: MinesweeperDifficulty =
  MINESWEEPER_DIFFICULTIES[0]!;

/**
 * id를 안전한 난이도 프리셋으로 정규화한다(순수·결정적, 입력 불변).
 * - 지원하는 id(beginner/intermediate/expert)면 그 프리셋을 반환.
 * - 미지정·미지원 id면 기본 난이도(초급)로 폴백.
 */
export function normalizeMinesweeperDifficulty(id?: string): MinesweeperDifficulty {
  return (
    MINESWEEPER_DIFFICULTIES.find((d) => d.id === id) ??
    DEFAULT_MINESWEEPER_DIFFICULTY
  );
}
