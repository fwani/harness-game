// Presentation helper for the 전적(Records) "게임별 전적" 섹션. Pure function only —
// keeps the React component thin and unit-testable. 집계는 domain/summarizeByGame을 재사용하며
// 여기서 승/패/무 셈 로직을 재구현하지 않는다(부수효과·난수·시간 없음, 입력 불변).
import type { GameId, GameRecord } from "../../domain/gameRecord";
import { summarizeByGame } from "../../domain/gameRecord";

/** 화면에 그릴 게임별 전적 한 행. */
export interface RecordsByGameRow {
  game: GameId;
  /** 한국어 라벨(예: "오목"). */
  gameLabel: string;
  /** 해당 게임 총 판수. */
  totalGames: number;
  players: { player: string; wins: number; losses: number; draws: number }[];
}

/**
 * 누적 기록을 게임별 전적 표시 행으로 변환한다(순수·결정적, 입력 불변).
 * - 집계는 도메인 summarizeByGame을 재사용한다(승/패/무 재구현 금지).
 * - 게임/플레이어 순서는 summarizeByGame이 정한 결정적 순서를 그대로 따른다.
 * - totalGames는 해당 게임의 2인 판수(= 플레이어별 wins+losses+draws의 합 / 2)이다.
 *   2인 기록만 다루므로 모든 플레이어 outcome 합을 2로 나눈다.
 * - label은 GameId → 한국어 라벨 매핑 함수(화면의 GAME_LABEL 재사용).
 * - 빈 입력 → 빈 배열.
 */
export function buildRecordsByGameRows(
  records: GameRecord[],
  label: (game: GameId) => string,
): RecordsByGameRow[] {
  return summarizeByGame(records).map(({ game, stats }) => {
    const outcomeTotal = stats.reduce(
      (sum, s) => sum + s.wins + s.losses + s.draws,
      0,
    );
    return {
      game,
      gameLabel: label(game),
      totalGames: outcomeTotal / 2,
      players: stats.map((s) => ({
        player: s.player,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
      })),
    };
  });
}
