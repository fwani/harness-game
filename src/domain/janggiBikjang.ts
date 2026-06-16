// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 장기(Janggi)의 무승부 트리거인 빅장(bikjang, 장군 마주보기) 국면 판정.
// 보드/기물 모델은 ./janggi에서 재사용한다(재정의 금지).
// 종국/턴 오케스트레이션·무승부 제안/수락 절차는 이 모듈 범위 밖이다(별도 이슈).

import type { Board, Side } from "./janggi";
import { pieceAt } from "./janggi";

// 두 진영의 장(general) 위치를 보드 스캔으로 찾는다(janggi.ts의 findGeneral은 비공개이므로 자체 스캔).
// 첫 번째로 발견한 장의 위치만 기록한다(표준 보드에는 진영별 장이 하나뿐이다).
function findGeneral(board: Board, side: Side): { x: number; y: number } | null {
  for (let y = 0; y < board.length; y++) {
    const row = board[y]!;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]!;
      if (cell !== null && cell.side === side && cell.type === "general") {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * 빅장(장군 마주보기) 국면 여부.
 * 초(cho)·한(han) 두 장(general)이 모두 보드에 존재하고,
 * 같은 세로줄(동일 x)에 있으며, 그 사이의 모든 칸이 비어 있으면 true.
 * 어느 한쪽 장이 없거나, 세로줄이 다르거나, 사이에 기물이 하나라도 있으면 false.
 * 보드를 변형하지 않는다(불변).
 */
export function isBikjang(board: Board): boolean {
  const cho = findGeneral(board, "cho");
  const han = findGeneral(board, "han");
  if (cho === null || han === null) {
    return false;
  }
  if (cho.x !== han.x) {
    return false;
  }

  const x = cho.x;
  const minY = Math.min(cho.y, han.y);
  const maxY = Math.max(cho.y, han.y);
  // 두 장 사이(양 끝 제외) 칸이 모두 비어 있어야 한다. 인접(사이 칸 없음)이면 자연히 true.
  for (let y = minY + 1; y < maxY; y++) {
    if (pieceAt(board, x, y) !== null) {
      return false;
    }
  }
  return true;
}
