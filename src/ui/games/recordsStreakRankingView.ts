// Presentation helper for the 전적(Records) 연승(streak) 순위표. Pure function only — keeps the
// React component thin and unit-testable(기존 recordsRankingView.ts 패턴 그대로). 연속 계산 규칙은
// domain/playerStreak를 재사용하며 여기서 재구현하지 않는다(부수효과 없는 표시용 변환).
import type { GameRecord } from "../../domain/gameRecord";
import { playerStreak, type PlayerStreak } from "../../domain/streak";

export interface StreakRankingRow extends PlayerStreak {
  /** 1부터 시작하는 순위. 동점자는 같은 순위를 공유한다(표준 경쟁식: 1,2,2,4). */
  rank: number;
}

/** 현재 "연승 중"일 때만 의미 있는 현재 연속 길이(그 외엔 0). */
function currentWinLengthOf(row: PlayerStreak): number {
  return row.currentType === "win" ? row.currentLength : 0;
}

/** 정렬키(longestWin, 현재 연승 길이)가 동일하면 같은 rank를 공유한다(라벨 차이는 동점으로 보지 않음). */
function sameRankKey(a: StreakRankingRow, b: StreakRankingRow): boolean {
  return a.longestWin === b.longestWin && currentWinLengthOf(a) === currentWinLengthOf(b);
}

/**
 * 누적 기록(GameRecord[])을 플레이어별 연승 순위표 행으로 변환한다(순수·결정적).
 * - records에 등장하는 모든 플레이어 라벨을 수집한 뒤 각 플레이어에 대해 domain/playerStreak를 호출한다.
 * - 정렬 기준(우선순위 순):
 *     1) longestWin(역대 최장 연승) 내림차순
 *     2) 현재 연승 중(currentType === "win")이면 currentLength 내림차순(아니면 0으로 취급)
 *     3) player 라벨 사전순 오름차순(완전 결정적 동점 처리)
 *   동일 정렬키(1~2)를 가진 플레이어는 같은 rank를 공유한다(표준 경쟁식 순위).
 * - 빈 입력 → 빈 배열. 입력 배열·요소를 변형하지 않는다.
 */
export function toStreakRankingRows(records: GameRecord[]): StreakRankingRow[] {
  // records에 등장하는 모든 플레이어 라벨을 처음 등장 순서로 수집(중복 제거).
  const players: string[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    for (const outcome of record.outcomes) {
      if (!seen.has(outcome.player)) {
        seen.add(outcome.player);
        players.push(outcome.player);
      }
    }
  }

  const rows: StreakRankingRow[] = players.map((player) => ({
    ...playerStreak(records, player),
    rank: 0,
  }));

  rows.sort((a, b) => {
    if (a.longestWin !== b.longestWin) return b.longestWin - a.longestWin;
    const aw = currentWinLengthOf(a);
    const bw = currentWinLengthOf(b);
    if (aw !== bw) return bw - aw;
    return a.player < b.player ? -1 : a.player > b.player ? 1 : 0;
  });

  for (let i = 0; i < rows.length; i += 1) {
    const current = rows[i]!;
    const previous = rows[i - 1];
    if (previous !== undefined && sameRankKey(previous, current)) {
      current.rank = previous.rank;
    } else {
      current.rank = i + 1;
    }
  }

  return rows;
}
