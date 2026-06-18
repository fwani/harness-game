// Application layer: orchestrates one Yut turn for two pieces racing the same
// outer path, applying capture (잡기) rules. Depends on domain + application only.
import { resolveYutCapture } from "../domain/yutCapture";
import type { YutThrow } from "../domain/yut";
import type { RandomSource } from "./dealCards";
import { playYutTurn } from "./playYutTurn";

export interface YutCaptureTurnResult {
  /** 이번 턴에 나온 던짐들(윷/모면 추가 던짐이 순서대로 이어진다). */
  throws: YutThrow[];
  /** 턴 종료 후 내 말 위치(0..20). */
  moverTraveled: number;
  /** 상대 말 위치. 잡혔으면 출발점(0)으로 리셋, 아니면 입력값 그대로. */
  opponentTraveled: number;
  /** 상대 말을 잡았는지. */
  captured: boolean;
  /** 한 번 더 던질 권리(윷/모가 나왔거나 상대 말을 잡았으면 true). */
  extraThrow: boolean;
  /** 내 말 완주 여부. */
  moverFinished: boolean;
}

/**
 * 두 플레이어가 말 1개씩 같은 외곽 경로를 도는 한 턴을 진행한다(불변, 결정적).
 * - 현재 턴 플레이어(mover)의 말을 playYutTurn으로 한 턴 굴려 전진시킨다.
 * - 멈춘 칸에서 resolveYutCapture로 상대 말(opponentTraveled)을 잡았는지 판정한다.
 *   - 출발점(0)·완주(20) 안전 지대 규칙은 도메인(resolveYutCapture)에 위임한다.
 * - 잡았으면 상대 말 위치를 출발점(0)으로 되돌린다.
 * - extraThrow: 윷/모 추가 던짐(throws 중 extraThrow=true가 하나라도 있음)이거나
 *   상대 말을 잡았으면(한 번 더 던짐) true.
 * - traveled 검증(0..20 정수 외/이미 완주 시 throw)은 도메인에 맡긴다.
 * - 입력값을 변형하지 않는다.
 */
export function playYutCaptureTurn(
  moverTraveled: number,
  opponentTraveled: number,
  rng: RandomSource,
): YutCaptureTurnResult {
  const { throws, position } = playYutTurn(moverTraveled, rng);

  const { capturedIndices, extraThrow: captureExtraThrow } = resolveYutCapture(
    position.traveled,
    [opponentTraveled],
  );
  const captured = capturedIndices.length > 0;

  const hadBonusThrow = throws.some((t) => t.extraThrow);

  return {
    throws,
    moverTraveled: position.traveled,
    opponentTraveled: captured ? 0 : opponentTraveled,
    captured,
    extraThrow: captureExtraThrow || hadBonusThrow,
    moverFinished: position.finished,
  };
}
