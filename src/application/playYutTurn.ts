// Application layer: orchestrates a single Yut turn for one piece. Depends on domain only.
import { evaluateYutThrow, type YutThrow } from "../domain/yut";
import { advanceYutPiece, type YutPiecePosition } from "../domain/yutMove";
import type { RandomSource } from "./dealCards";

export interface YutTurnResult {
  /** 이 턴에 나온 던짐들(윷/모면 추가 던짐이 순서대로 이어진다). */
  throws: YutThrow[];
  /** 턴 종료 후 말의 위치. */
  position: YutPiecePosition;
}

/**
 * 윷가락 4개를 rng로 던져 한 턴을 진행한다(불변, 결정적).
 * - 각 가락은 rng.nextInt(2) === 1 이면 배(true), 아니면 등(false). evaluateYutThrow로 판정한다.
 * - 윷·모(extraThrow)가 나오면 한 번 더 던지고, 모든 던짐을 throws에 순서대로 모은다.
 * - 모은 던짐들의 steps를 순서대로 advanceYutPiece로 적용해 말을 전진시킨다.
 * - 도중에 완주(finished)하면 남은 던짐은 적용하지 않고 위치를 고정한다.
 * - traveled 검증(0..20 정수 외/이미 완주 시 throw)은 도메인(advanceYutPiece)에 맡긴다.
 * - 입력값을 변형하지 않는다.
 */
export function playYutTurn(traveled: number, rng: RandomSource): YutTurnResult {
  const throwOnce = (): YutThrow => {
    const sticks: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const face = rng.nextInt(2);
      if (face !== 0 && face !== 1) {
        throw new Error(`RandomSource produced out-of-range stick face: ${face}`);
      }
      sticks.push(face === 1);
    }
    return evaluateYutThrow(sticks);
  };

  const throws: YutThrow[] = [];
  let current = throwOnce();
  throws.push(current);
  while (current.extraThrow) {
    current = throwOnce();
    throws.push(current);
  }

  let position: YutPiecePosition = { traveled, finished: false };
  for (const t of throws) {
    if (position.finished) {
      break;
    }
    position = advanceYutPiece(position.traveled, t.steps);
  }

  return { throws, position };
}
