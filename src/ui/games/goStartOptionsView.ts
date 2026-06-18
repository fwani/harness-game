// Presentation helpers for the Go (바둑) 시작 옵션 폼. Pure functions only — 보드 크기
// 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 게임 규칙은 다루지 않으며(도메인은 기존 createBoard(size) config 경로 재사용),
// 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변). gomokuStartOptionsView와 동형.

/** 사람이 고를 수 있는 시작 옵션. size=보드 한 변, humanFirst=vs CPU에서 사람이 흑(선)인지. */
export interface GoStartOptions {
  size: number;
  humanFirst: boolean;
}

/** 선택 가능한 바둑 보드 크기(정식 19×19 + 입문/속기용 13·9). */
export const GO_BOARD_SIZES = [9, 13, 19] as const;

/** 기본 보드 크기(현행 동작 보존: 9×9). */
export const DEFAULT_GO_SIZE = 9;

/** vs CPU에서 사람이 선공(흑)인지의 기본값. */
export const DEFAULT_GO_HUMAN_FIRST = true;

/** 선택 가능한 보드 크기 목록(표시 순서는 GO_BOARD_SIZES를 따른다). */
export function goBoardSizeOptions(): readonly number[] {
  return GO_BOARD_SIZES;
}

/** size를 가장 가까운 허용 크기로 스냅한다(동률이면 더 작은 값). */
function nearestAllowedSize(size: number): number {
  let best: number = GO_BOARD_SIZES[0];
  let bestDist = Math.abs(size - best);
  for (const candidate of GO_BOARD_SIZES) {
    const dist = Math.abs(size - candidate);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - size가 정수면 가장 가까운 허용 크기(9/13/19)로 스냅, 그 외(비정수·비숫자)는 DEFAULT_GO_SIZE.
 * - humanFirst가 boolean이 아니면 DEFAULT_GO_HUMAN_FIRST로 대체.
 */
export function normalizeGoStartOptions(input: {
  size?: number;
  humanFirst?: boolean;
}): GoStartOptions {
  const size =
    typeof input.size === "number" && Number.isInteger(input.size)
      ? nearestAllowedSize(input.size)
      : DEFAULT_GO_SIZE;
  return {
    size,
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_GO_HUMAN_FIRST,
  };
}
