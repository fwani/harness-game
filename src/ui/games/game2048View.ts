// Presentation helpers for the 2048 screen. Pure functions only — 화살표 키 매핑·상태 메시지·
// 점수 포맷·최고 타일 계산을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 슬라이드/병합·승패 판정 규칙 자체는 domain(game2048)/application(play2048)을 호출해 수행하며
// 여기서 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import type { Board, Direction } from "../../domain/game2048";

/**
 * 키 이름을 2048 이동 방향으로 변환한다(순수·결정적).
 * - ArrowLeft/Right/Up/Down → 대응 Direction.
 * - 그 외 키는 null(이동 아님).
 */
export function mapKeyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    default:
      return null;
  }
}

/** 현재 게임 진행 상태 구분(승리·게임오버·진행 중). */
export type Game2048StatusKind = "won" | "over" | "playing";

export interface Game2048Status {
  kind: Game2048StatusKind;
  message: string;
}

/**
 * 승리(목표 도달)와 게임오버(더 못 움직임), 진행 중을 명확히 구분해 플레이어용 한국어
 * 상태 메시지를 만든다(순수·결정적). 승리가 게임오버보다 우선한다(목표 도달 시 승리로 표시).
 */
export function describe2048Status(won: boolean, over: boolean): Game2048Status {
  if (won) {
    return { kind: "won", message: "🎉 목표 타일을 만들었습니다! 승리!" };
  }
  if (over) {
    return {
      kind: "over",
      message: "게임 오버 — 더 이상 움직일 수 없습니다.",
    };
  }
  return {
    kind: "playing",
    message: "화살표 키 또는 방향 버튼으로 타일을 미세요.",
  };
}

/**
 * 점수를 천 단위 구분 쉼표로 포맷한다(순수·결정적, 로캘 비의존).
 * 예: 0 → "0", 2048 → "2,048".
 */
export function formatScore(score: number): string {
  return String(score).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 보드에서 가장 큰 타일 값을 돌려준다(빈 보드/모두 0이면 0). 입력 불변.
 */
export function highestTile(board: Board): number {
  let max = 0;
  for (const row of board) {
    for (const tile of row) {
      if (tile > max) {
        max = tile;
      }
    }
  }
  return max;
}
