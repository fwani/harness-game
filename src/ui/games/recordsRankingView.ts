// Presentation helper for the 전적(Records) 승수·승률 순위표. Pure function only — keeps the
// React component thin and unit-testable. 정렬·동점 rank 규칙은 domain/rankPlayers를 재사용하며
// 여기서 재구현하지 않는다(부수효과 없는 표시용 변환).
import type { PlayerStats } from "../../domain/gameRecord";
import { rankPlayers, type RankedPlayer } from "../../domain/leaderboard";

/**
 * 플레이어별 누적 전적을 승수·승률 순위표 행으로 변환한다(순수·결정적).
 * - 빈 입력 → 빈 배열.
 * - 입력 배열·요소를 변형하지 않는다.
 * - 정렬·동점 rank 규칙은 domain/rankPlayers에 위임한다(UI에서 재정렬/재구현 금지).
 */
export function toWinRankingRows(stats: PlayerStats[]): RankedPlayer[] {
  return rankPlayers(stats);
}
