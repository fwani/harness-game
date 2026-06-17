// Presentation helper for the 전적(Records) ELO leaderboard. Pure function only — keeps the
// React component thin and unit-testable. ELO 계산은 domain/computeEloRatings를 재사용하며
// 여기서 재구현하지 않는다(부수효과 없는 표시용 변환).
import type { GameRecord } from "../../domain/gameRecord";
import { computeEloRatings, type EloRating } from "../../domain/eloRatings";

export interface EloLeaderboardRow extends EloRating {
  /** 1부터 시작. 동률 레이팅은 같은 순위, 다음 순위는 건너뛴다(standard competition: 1,1,3 …). */
  rank: number;
}

/**
 * 누적 기록으로 ELO를 계산해 레이팅 내림차순 리더보드 행으로 변환한다(순수·결정적).
 * - 2인이 아닌 record(computeEloRatings가 throw)는 집계에서 제외한다(throw 전파 금지).
 * - 정렬: rating 내림차순, 동률이면 입력(첫 등장) 순서 유지로 안정 정렬.
 * - 동률 레이팅은 같은 rank, 다음 순위는 건너뛴다(standard competition ranking: 1,1,3 …).
 * - 빈 입력 → 빈 배열.
 */
export function toEloLeaderboard(records: GameRecord[]): EloLeaderboardRow[] {
  // computeEloRatings는 outcomes가 정확히 2개가 아니면 throw하므로 사전 필터링한다.
  const twoPlayer = records.filter((r) => r.outcomes.length === 2);
  const ratings = computeEloRatings(twoPlayer);

  // computeEloRatings는 "첫 등장 순서"를 반환한다. Array.sort는 안정 정렬이므로
  // 동률 레이팅은 그 첫 등장 순서를 그대로 유지한다.
  const sorted = [...ratings].sort((a, b) => b.rating - a.rating);

  let lastRating: number | null = null;
  let lastRank = 0;
  return sorted.map((entry, index) => {
    // 동률(동일 rating)이면 직전 행과 같은 rank, 아니면 현재 위치(1-based).
    const rank = lastRating !== null && entry.rating === lastRating ? lastRank : index + 1;
    lastRating = entry.rating;
    lastRank = rank;
    return { ...entry, rank };
  });
}
