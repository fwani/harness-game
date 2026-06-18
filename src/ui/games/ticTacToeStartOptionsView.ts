// Presentation helpers for the Tic-Tac-Toe (틱택토) vs CPU 시작 옵션 폼. Pure functions only —
// 선공/후공(X/O) 선택지·기본값·임의 입력 정규화(검증)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 틱택토 보드는 표준 3×3 고정이라 크기 옵션은 없고, vs CPU에서 사람이 X(선공)/O(후공) 중 어느
// 진영을 잡을지(humanFirst)만 둔다. 게임 규칙은 다루지 않으며(보드는 기존 createTicTacToeBoard()
// 재사용), 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변). reversiStartOptionsView.ts와 동형.

/** 사람이 고를 수 있는 시작 옵션. humanFirst=true면 사람이 X(선공). */
export interface TicTacToeStartOptions {
  humanFirst: boolean;
}

/** vs CPU에서 사람이 X(선공)인지의 기본값(기존 동작과 동일하게 사람=X 선공). */
export const DEFAULT_TICTACTOE_HUMAN_FIRST = true;

/**
 * 선공/후공 선택 옵션(라벨 포함). 색 비의존: 기호(X/O) + "선공/후공" 텍스트로 구분한다.
 * 표시 순서는 X(선공) → O(후공).
 */
export function ticTacToeFirstPlayerOptions(): { value: boolean; label: string }[] {
  return [
    { value: true, label: "사람 X 선공" },
    { value: false, label: "사람 O 후공" },
  ];
}

/**
 * 임의 입력을 안전한 시작 옵션으로 정규화한다(순수·결정적, 입력 불변).
 * - humanFirst가 boolean이 아니면 DEFAULT_TICTACTOE_HUMAN_FIRST로 대체.
 */
export function normalizeTicTacToeStartOptions(
  input: Partial<TicTacToeStartOptions>,
): TicTacToeStartOptions {
  return {
    humanFirst:
      typeof input.humanFirst === "boolean"
        ? input.humanFirst
        : DEFAULT_TICTACTOE_HUMAN_FIRST,
  };
}
