// Application layer: Janggi(장기) AI move helpers. Depends on domain rules and
// the RandomSource port only. No infrastructure import (randomness is injected).
// reversiAi.ts / gomokuAi.ts / goAi.ts와 동일한 패턴: 도메인의 합법 수 열거를
// 재사용하고 난수는 주입받는다.
import {
  legalMovesFrom,
  type Board,
  type Side,
  type Pos,
} from "../domain/janggi";
import type { JanggiMove } from "./janggiEngine";
import type { RandomSource } from "./dealCards";

/**
 * 현재 board에서 side 진영이 둘 수 있는 합법 수 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 합법 수는 보드 스캔 순서(y, x)로 side의 각 기물에 대해 도메인 `legalMovesFrom(board, side, from)`을
 *   호출해 열거한다(합법 수 재구현 금지). `legalMovesFrom`은 자기장군(self-check)이 되는 수를 이미
 *   제외하므로 결과 후보에는 자기 장이 잡히는 수가 포함되지 않는다(#214 합법성 규칙과 일치).
 * - 열거 순서는 보드 스캔 순서(y, x) + `legalMovesFrom` 순서로 결정적이다.
 * - idx = rng.nextInt(candidates.length)로 균등 선택한다.
 * - 후보가 하나도 없으면(외통/스테일메이트) throw 한다. 종료 판정·턴 진행은 오케스트레이터
 *   (playJanggi) 책임이며 이 헬퍼 범위 밖이다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomJanggiMove(
  board: Board,
  side: Side,
  rng: RandomSource,
): JanggiMove {
  const candidates: JanggiMove[] = [];
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === side) {
        const from: Pos = { x, y };
        for (const to of legalMovesFrom(board, side, from)) {
          candidates.push({ from, to });
        }
      }
    }
  }
  if (candidates.length === 0) {
    throw new Error("chooseRandomJanggiMove: no legal moves available");
  }
  const idx = rng.nextInt(candidates.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return candidates[idx]!;
}
