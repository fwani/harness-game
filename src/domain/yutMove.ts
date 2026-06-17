// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export interface YutPiecePosition {
  traveled: number; // 출발점(0)에서 이동한 칸 수, 0..20
  finished: boolean; // 완주(골인) 여부
}

const FINISH = 20; // 윷판 외곽 한 바퀴 완주 지점

/**
 * 말을 steps 칸 전진시킨다(순수, 외곽 경로 한정).
 * - traveled: 현재 위치 0..20 정수. steps: 1..5 정수(YutThrow.steps 범위).
 * - 새 위치 = traveled + steps. 20 이상이면 완주(traveled=20, finished=true) — 오버슈트 허용(정확히 안 떨어져도 통과 시 골인).
 * - 그 외에는 { traveled: traveled+steps, finished: false }.
 * - traveled가 0..20 범위를 벗어나거나 정수가 아니면 throw.
 * - steps가 1..5 범위를 벗어나거나 정수가 아니면 throw.
 * - 이미 완주한 말(traveled === 20)을 다시 전진시키면 throw.
 * - 입력값을 변형하지 않는다.
 */
export function advanceYutPiece(traveled: number, steps: number): YutPiecePosition {
  if (!Number.isInteger(traveled) || traveled < 0 || traveled > FINISH) {
    throw new Error("advanceYutPiece requires integer traveled in 0..20");
  }
  if (!Number.isInteger(steps) || steps < 1 || steps > 5) {
    throw new Error("advanceYutPiece requires integer steps in 1..5");
  }
  if (traveled === FINISH) {
    throw new Error("advanceYutPiece cannot advance an already finished piece");
  }
  const next = traveled + steps;
  if (next >= FINISH) {
    return { traveled: FINISH, finished: true };
  }
  return { traveled: next, finished: false };
}
