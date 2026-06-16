// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 장기(Janggi)의 점수제(계가) — 외통이 아닌 종국에서 남은 기물의 점수를 합산해
// 승부를 가린다. 보드/기물 타입은 ./janggi에서 재사용한다(재정의 금지).
// 빅장(bikjang) 무승부·종국 트리거·턴 오케스트레이션은 이 모듈 범위 밖이다(별도 이슈).

import type { Board, Side, PieceType } from "./janggi";

/**
 * 표준 한국 장기 점수. 장(general)은 0점이다.
 * 차(chariot)=13, 포(cannon)=7, 마(horse)=5, 상(elephant)=3,
 * 사(guard)=3, 졸·병(soldier)=2.
 */
export const JANGGI_PIECE_VALUES: Record<PieceType, number> = {
  general: 0,
  guard: 3,
  elephant: 3,
  horse: 5,
  chariot: 13,
  cannon: 7,
  soldier: 2,
};

/** 후수(han)에게 주는 덤(handicap). 초(cho)가 선수이므로 한에만 더한다. */
export const HAN_HANDICAP = 1.5;

export interface JanggiScore {
  cho: number;
  han: number;
}

/**
 * 보드의 남은 기물 점수를 진영별로 합산한다(han에 덤 1.5 포함).
 * - 빈 칸(null)은 건너뛴다.
 * - 9×10 가정에 의존하지 않고 row-major로 순회한다.
 * - 결정적이며 입력 보드를 변형하지 않는다.
 */
export function scoreMaterial(board: Board): JanggiScore {
  let cho = 0;
  let han = HAN_HANDICAP;

  for (const row of board) {
    for (const cell of row) {
      if (cell === null) {
        continue;
      }
      const value = JANGGI_PIECE_VALUES[cell.type];
      if (cell.side === "cho") {
        cho += value;
      } else {
        han += value;
      }
    }
  }

  return { cho, han };
}

/**
 * 점수가 높은 진영을 반환한다. 동점이면 "draw".
 * 합계는 1.5/.5 단위로 정확히 표현되는 값들이므로 동점 판정은 ===로 한다.
 * 보드를 변형하지 않는다.
 */
export function winnerByScore(board: Board): Side | "draw" {
  const { cho, han } = scoreMaterial(board);
  if (cho > han) {
    return "cho";
  }
  if (han > cho) {
    return "han";
  }
  return "draw";
}
