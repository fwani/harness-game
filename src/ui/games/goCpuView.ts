// Presentation helper for the 바둑 (Go) vs CPU 모드. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 합법 수 열거/착수 규칙은
// domain(legalGoMoves/placeStone)·application(chooseRandomGoMove)을 재사용하며 여기서
// 재구현하지 않는다. gomokuCpuView.ts와 동일한 패턴.
import type { Board, Stone } from "../../domain/go";
import { legalGoMoves } from "../../domain/goMoves";
import type { RandomSource } from "../../application/dealCards";
import { chooseRandomGoMove } from "../../application/goAi";

/**
 * vs CPU 모드에서 CPU(stone)가 둘 한 수를 고른다.
 * - 둘 곳이 없으면(패스 대상) null을 반환한다(throw 하지 않는다). `chooseRandomGoMove`는
 *   합법 수가 없으면 throw 하므로, 먼저 `legalGoMoves`로 둘 곳이 있는지 확인한다.
 * - 둘 곳이 있으면 `chooseRandomGoMove`로 합법 좌표 하나를 균등 선택해 반환한다.
 * - ko용 previousBoard는 `playGo`/`GoState`가 추적하지 않으므로 생략한다(orchestrator 범위 밖).
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuGoMove(
  board: Board,
  stone: Stone,
  rng: RandomSource,
): { x: number; y: number } | null {
  if (legalGoMoves(board, stone).length === 0) {
    return null;
  }
  return chooseRandomGoMove(board, stone, rng);
}
