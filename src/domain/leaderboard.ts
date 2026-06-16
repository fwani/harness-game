// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 플레이어별 누적 전적(PlayerStats[])을 승수·승률 기준으로 정렬해 순위를 매긴다.
// 입력만으로 결정적이다(시간·난수·식별자 생성 없음).

import type { PlayerStats } from "./gameRecord";

export interface RankedPlayer extends PlayerStats {
  /** 1부터 시작하는 순위. 동점자는 같은 순위를 공유한다(표준 경쟁식: 1,2,2,4). */
  rank: number;
  /** wins + losses + draws. */
  gamesPlayed: number;
  /** 승률 = wins / gamesPlayed. gamesPlayed === 0 이면 0. (소수, 반올림하지 않음) */
  winRate: number;
}

function gamesPlayedOf(stats: PlayerStats): number {
  return stats.wins + stats.losses + stats.draws;
}

function winRateOf(stats: PlayerStats): number {
  const played = gamesPlayedOf(stats);
  return played === 0 ? 0 : stats.wins / played;
}

/** 정렬키(1~3)가 동일하면 같은 rank를 공유한다(라벨 차이는 동점으로 보지 않음). */
function sameRankKey(a: RankedPlayer, b: RankedPlayer): boolean {
  return a.wins === b.wins && a.winRate === b.winRate && a.losses === b.losses;
}

/**
 * 플레이어별 누적 전적을 순위가 매겨진 리더보드로 변환한다(불변: 입력을 변경하지 않는다).
 * 정렬 기준(우선순위 순):
 *   1) wins 내림차순
 *   2) winRate 내림차순
 *   3) losses 오름차순
 *   4) player 라벨 사전순 오름차순(완전 결정적 동점 처리)
 * 동일 정렬키(1~3)를 가진 플레이어는 같은 rank를 공유한다(표준 경쟁식 순위).
 */
export function rankPlayers(stats: PlayerStats[]): RankedPlayer[] {
  const ranked: RankedPlayer[] = stats.map((s) => ({
    player: s.player,
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    gamesPlayed: gamesPlayedOf(s),
    winRate: winRateOf(s),
    rank: 0,
  }));

  ranked.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.winRate !== b.winRate) return b.winRate - a.winRate;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.player < b.player ? -1 : a.player > b.player ? 1 : 0;
  });

  for (let i = 0; i < ranked.length; i += 1) {
    const current = ranked[i]!;
    const previous = ranked[i - 1];
    if (previous !== undefined && sameRankKey(previous, current)) {
      current.rank = previous.rank;
    } else {
      current.rank = i + 1;
    }
  }

  return ranked;
}
