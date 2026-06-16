// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 대국 결과 목록을 승점 기반 순위표(standings)로 집계한다.
// generateRoundRobinSchedule(대진표)와 rankPlayers(집계된 전적 정렬) 사이의 빠진 고리:
// 원시 대국 결과를 참가자별로 합산하고 승점을 계산해 순위표로 만든다.
// 입력만으로 결정적이다(시간·난수·식별자 생성 없음). 입력을 변형하지 않는다(불변).

import type { Pairing } from "./roundRobin";

/** 한 대국의 결과: 'a'(Pairing.a 승) | 'b'(Pairing.b 승) | 'draw'(무승부). */
export type MatchOutcome = "a" | "b" | "draw";

/** 한 대국의 대진과 그 결과. */
export interface MatchResult {
  pairing: Pairing;
  outcome: MatchOutcome;
}

/** 승/무/패에 부여하는 승점 규칙. */
export interface PointsRule {
  win: number; // 기본 3
  draw: number; // 기본 1
  loss: number; // 기본 0
}

/** 순위표 한 행(참가자별 집계). */
export interface StandingRow {
  player: string;
  played: number; // wins + draws + losses
  wins: number;
  draws: number;
  losses: number;
  points: number; // wins*rule.win + draws*rule.draw + losses*rule.loss
  rank: number; // 1부터, 동점자는 같은 순위 공유(표준 경쟁식: 1,2,2,4)
}

const DEFAULT_RULE: PointsRule = { win: 3, draw: 1, loss: 0 };

/** 정렬키(points, wins)가 동일하면 같은 rank를 공유한다(라벨 차이는 동점으로 보지 않음). */
function sameRankKey(a: StandingRow, b: StandingRow): boolean {
  return a.points === b.points && a.wins === b.wins;
}

/**
 * 대국 결과 목록을 승점 기반 순위표로 집계한다(불변, 결정적).
 * - 결과에 등장하는 모든 참가자(Pairing.a, Pairing.b)를 자동 수집한다.
 * - rule 미지정 시 기본값 { win: 3, draw: 1, loss: 0 }을 사용한다.
 * - 정렬 기준(우선순위): points 내림차순 → wins 내림차순 → player 라벨 사전순 오름차순.
 * - 동일 정렬키(points, wins)면 같은 rank를 공유한다(표준 경쟁식 순위).
 * - results가 빈 배열이면 빈 배열([])을 반환한다.
 * - 입력 results / rule 을 변형하지 않는다.
 */
export function computeStandings(results: MatchResult[], rule?: PointsRule): StandingRow[] {
  const points: PointsRule = rule ?? DEFAULT_RULE;

  // 참가자별 누적 집계. 등장 순서와 무관하게 결정적으로 동작한다.
  const rows = new Map<string, StandingRow>();

  const rowOf = (player: string): StandingRow => {
    let row = rows.get(player);
    if (row === undefined) {
      row = { player, played: 0, wins: 0, draws: 0, losses: 0, points: 0, rank: 0 };
      rows.set(player, row);
    }
    return row;
  };

  for (const result of results) {
    const { a, b } = result.pairing;
    const rowA = rowOf(a);
    const rowB = rowOf(b);

    rowA.played += 1;
    rowB.played += 1;

    if (result.outcome === "a") {
      rowA.wins += 1;
      rowA.points += points.win;
      rowB.losses += 1;
      rowB.points += points.loss;
    } else if (result.outcome === "b") {
      rowB.wins += 1;
      rowB.points += points.win;
      rowA.losses += 1;
      rowA.points += points.loss;
    } else {
      rowA.draws += 1;
      rowA.points += points.draw;
      rowB.draws += 1;
      rowB.points += points.draw;
    }
  }

  const standings = [...rows.values()];

  standings.sort((x, y) => {
    if (x.points !== y.points) return y.points - x.points;
    if (x.wins !== y.wins) return y.wins - x.wins;
    return x.player < y.player ? -1 : x.player > y.player ? 1 : 0;
  });

  for (let i = 0; i < standings.length; i += 1) {
    const current = standings[i]!;
    const previous = standings[i - 1];
    if (previous !== undefined && sameRankKey(previous, current)) {
      current.rank = previous.rank;
    } else {
      current.rank = i + 1;
    }
  }

  return standings;
}
