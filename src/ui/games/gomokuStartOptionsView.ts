// Presentation helpers for the Gomoku (오목) 시작 옵션 폼. Pure functions only — 보드 크기
// 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 게임 규칙은 다루지 않으며(도메인/애플리케이션은 기존 startGame(size) config 경로 재사용),
// 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).

/** 사람이 고를 수 있는 시작 옵션. size=보드 한 변, humanFirst=vs CPU에서 사람이 흑(선)인지. */
export interface GomokuStartOptions {
  size: number;
  humanFirst: boolean;
}

/** 선택 가능한 보드 크기(오목 표준 19×19 + 흔한 변형 15/13/9). */
export const GOMOKU_BOARD_SIZES = [9, 13, 15, 19] as const;

/** 기본 보드 크기(표준 15×15). */
export const DEFAULT_GOMOKU_SIZE = 15;

/** vs CPU에서 사람이 선공(흑)인지의 기본값. */
export const DEFAULT_GOMOKU_HUMAN_FIRST = true;

/** 선택 가능한 보드 크기 옵션(라벨 포함). 표시 순서는 GOMOKU_BOARD_SIZES를 따른다. */
export function gomokuBoardSizeOptions(): { value: number; label: string }[] {
  return GOMOKU_BOARD_SIZES.map((value) => ({ value, label: `${value}×${value}` }));
}

/** size가 선택 가능한 보드 크기 중 하나인지(정수·허용 목록) 여부. */
function isAllowedSize(size: unknown): size is number {
  return (
    typeof size === "number" &&
    Number.isInteger(size) &&
    (GOMOKU_BOARD_SIZES as readonly number[]).includes(size)
  );
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - size가 정수가 아니거나 허용 크기(9/13/15/19) 밖이면 DEFAULT_GOMOKU_SIZE로 대체.
 * - humanFirst가 boolean이 아니면 DEFAULT_GOMOKU_HUMAN_FIRST로 대체.
 */
export function normalizeGomokuStartOptions(
  input: Partial<GomokuStartOptions>,
): GomokuStartOptions {
  return {
    size: isAllowedSize(input.size) ? input.size : DEFAULT_GOMOKU_SIZE,
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_GOMOKU_HUMAN_FIRST,
  };
}
