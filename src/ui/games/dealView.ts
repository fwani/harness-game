// Presentation helpers for the 카드 딜 (Deal) screen. Pure functions only —
// 화면용 입력 검증을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 분배 규칙 자체는 application(deal)을 호출해 수행하며 여기서 재구현하지 않는다.
// 이 파일은 "플레이어용 한국어 사유 메시지" 생성만 담당한다(영어 내부 예외 노출 방지).

/** 입력 검증 결과(불변, 결정적). 정상이면 reason은 null. */
export interface DealValidation {
  ok: boolean;
  /** 잘못된 입력의 한국어 사유(정상이면 null). */
  reason: string | null;
}

/**
 * 딜 입력(인원·1인당 장수)을 덱 크기에 비추어 검증하고, 잘못된 경우
 * 플레이어용 한국어 사유를 돌려준다(불변, 결정적).
 * - 인원이 정수 1 이상이 아니면: "인원은 1명 이상이어야 합니다."
 * - 1인당 장수가 정수 0 이상이 아니면: "1인당 카드 수는 0장 이상이어야 합니다."
 * - 필요한 카드 수(인원 × 1인당)가 덱 크기를 초과하면: 카드 부족 사유.
 * application의 deal()이 같은 조건에서 영어 예외를 던지지만, 그 메시지는
 * 개발자용이라 화면에 노출하지 않고 이 함수의 한국어 사유를 쓴다.
 */
export function validateDealInput(
  players: number,
  perPlayer: number,
  deckSize: number,
): DealValidation {
  if (!Number.isInteger(players) || players < 1) {
    return { ok: false, reason: "인원은 1명 이상이어야 합니다." };
  }
  if (!Number.isInteger(perPlayer) || perPlayer < 0) {
    return { ok: false, reason: "1인당 카드 수는 0장 이상이어야 합니다." };
  }
  const needed = players * perPlayer;
  if (needed > deckSize) {
    return {
      ok: false,
      reason: `카드가 부족합니다: ${needed}장 필요, ${deckSize}장뿐입니다.`,
    };
  }
  return { ok: true, reason: null };
}

/**
 * 예기치 못한 예외(검증을 통과했는데도 deal()이 throw한 경우 등)를 위한
 * 플레이어용 한국어 폴백 메시지. 영어 내부 메시지를 그대로 노출하지 않는다.
 */
export function dealFailureMessage(): string {
  return "딜에 실패했습니다. 입력을 확인해 주세요.";
}
