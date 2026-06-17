// Presentation helpers for the 바둑 (Go) screen. Pure functions only —
// 도메인/애플리케이션이 던지는 영어 내부 예외 메시지를 React/DOM에서 분리해
// "플레이어용 한국어 사유"로 매핑한다(영어 개발자용 메시지·함수 이름 노출 방지).
// 착수 규칙 자체는 application(applyMove)·domain(placeStone)을 호출해 수행하며
// 여기서 재구현하지 않는다. #197(카드 딜)과 동일한 매핑 방식.

/**
 * 무효수 등으로 발생한 예외를 플레이어용 한국어 사유로 변환한다(결정적, 순수).
 * domain `placeStone`/application `applyMove`의 영어 throw 메시지를 매핑하며,
 * 알 수 없는 예외는 일반 폴백 문구를 돌려준다. 함수 이름 등 내부 디테일은
 * 절대 노출하지 않는다.
 */
export function goErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("suicide move is not allowed")) {
    return "그 자리는 둘 수 없습니다(자살수).";
  }
  if (raw.includes("coordinate out of bounds")) {
    return "그 자리는 바둑판 밖이라 둘 수 없습니다.";
  }
  if (raw.includes("cell already occupied")) {
    return "그 자리에는 이미 돌이 있습니다.";
  }
  if (raw.includes("game already finished")) {
    return "이미 끝난 대국입니다. 새 게임을 시작하세요.";
  }
  return "그 자리에는 둘 수 없습니다.";
}
