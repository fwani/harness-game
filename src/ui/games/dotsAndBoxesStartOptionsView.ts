// Presentation helpers for the Dots and Boxes (도트 앤 박스) 시작 옵션 폼. Pure functions only —
// 보드 크기(박스 격자) 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트
// 가능하게 한다. 게임 규칙은 다루지 않으며(도메인 createDotsAndBoxesBoard·application
// playDotsAndBoxesTurn 경로 재사용), 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).
// gomokuStartOptionsView.ts/goStartOptionsView.ts와 동형.

/** 사람이 고를 수 있는 보드 크기(박스 격자). 도메인은 rows≠cols도 허용하므로 분리 유지. */
export interface DotsStartOptions {
  rows: number;
  cols: number;
}

/** 선택 가능한 보드 크기 프리셋(작은 3×3·표준 5×5·큰 7×7). 정사각으로 단순화. */
export const DOTS_BOARD_SIZES: { rows: number; cols: number; label: string }[] = [
  { rows: 3, cols: 3, label: "작은 (3×3)" },
  { rows: 5, cols: 5, label: "표준 (5×5)" },
  { rows: 7, cols: 7, label: "큰 (7×7)" },
];

/** 기본 보드 크기(표준 5×5). */
export const DEFAULT_DOTS_OPTIONS: DotsStartOptions = { rows: 5, cols: 5 };

/** 선택 가능한 크기 옵션(값 + 라벨). 표시 순서는 DOTS_BOARD_SIZES를 따른다. */
export function dotsBoardSizeOptions(): { value: DotsStartOptions; label: string }[] {
  return DOTS_BOARD_SIZES.map(({ rows, cols, label }) => ({
    value: { rows, cols },
    label,
  }));
}

/** (rows, cols)가 허용 프리셋 중 하나인지(정수·허용 목록) 여부. */
function isAllowedSize(rows: unknown, cols: unknown): boolean {
  return (
    typeof rows === "number" &&
    typeof cols === "number" &&
    Number.isInteger(rows) &&
    Number.isInteger(cols) &&
    DOTS_BOARD_SIZES.some((s) => s.rows === rows && s.cols === cols)
  );
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * rows/cols가 정수가 아니거나 허용 프리셋(3×3/5×5/7×7) 밖이면 DEFAULT_DOTS_OPTIONS로 대체.
 */
export function normalizeDotsStartOptions(
  input: Partial<DotsStartOptions>,
): DotsStartOptions {
  return isAllowedSize(input.rows, input.cols)
    ? { rows: input.rows as number, cols: input.cols as number }
    : { ...DEFAULT_DOTS_OPTIONS };
}
