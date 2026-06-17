// Presentation helpers for the Tournament (라운드 로빈 토너먼트) screen. Pure functions only —
// keeps the React component thin and lets us unit-test the view logic without a DOM.
// 대진 생성/순위 집계 규칙은 domain(generateRoundRobinSchedule/computeStandings)을 재사용하며
// 여기서 재구현하지 않는다. 이 파일은 화면용 변환(평탄화·부전승 계산·결과 매핑)만 담당한다.
import type { Round } from "../../domain/roundRobin";
import type { MatchOutcome, MatchResult } from "../../domain/standings";

/** 화면 표시·결과 입력용으로 평탄화한 한 경기(라운드·라운드 내 인덱스로 안정 키 부여). */
export interface ScheduledMatch {
  /** 0부터 시작하는 라운드 인덱스. */
  round: number;
  /** 라운드 안에서의 경기 인덱스. */
  index: number;
  /** 결과 보관/리액트 key용 안정 식별자. */
  id: string;
  a: string;
  b: string;
}

/** 참가자 이름 정제·검증 결과. */
export interface PlayersValidation {
  /** 공백 제거 후 비어 있지 않은 참가자 목록. */
  players: string[];
  /** 잘못된 입력 사유(정상이면 null). */
  error: string | null;
}

/** 라운드별 경기 id 접두사. round/index 조합은 한 일정 안에서 유일하다. */
function matchId(round: number, index: number): string {
  return `r${round}-m${index}`;
}

/**
 * 입력된 원시 이름 목록을 정제·검증한다(불변, 결정적).
 * - 각 이름은 trim 후 빈 문자열이면 제외한다.
 * - 정제 후 2명 미만이면 사유 에러를 반환한다(대국 성립 불가).
 * - 중복 이름(공백 제거 기준)이 있으면 사유 에러를 반환한다.
 */
export function validatePlayers(rawNames: string[]): PlayersValidation {
  const players = rawNames.map((name) => name.trim()).filter((name) => name !== "");

  if (players.length < 2) {
    return { players, error: "참가자를 2명 이상 입력하세요." };
  }
  if (new Set(players).size !== players.length) {
    return { players, error: "참가자 이름이 중복되었습니다. 서로 다른 이름을 사용하세요." };
  }
  return { players, error: null };
}

/** 대진표(Round[])를 결과 입력·표시용 경기 목록으로 평탄화한다(불변, 결정적). */
export function flattenSchedule(schedule: Round[]): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  schedule.forEach((round, roundIndex) => {
    round.forEach((pairing, index) => {
      matches.push({
        round: roundIndex,
        index,
        id: matchId(roundIndex, index),
        a: pairing.a,
        b: pairing.b,
      });
    });
  });
  return matches;
}

/**
 * 한 라운드에서 부전승(쉬는) 참가자 목록을 구한다(불변, 결정적).
 * - 그 라운드의 어떤 Pairing에도 등장하지 않는 참가자가 부전승이다.
 * - players의 순서를 유지한다.
 */
export function byePlayersForRound(round: Round, players: string[]): string[] {
  const playing = new Set<string>();
  for (const pairing of round) {
    playing.add(pairing.a);
    playing.add(pairing.b);
  }
  return players.filter((player) => !playing.has(player));
}

/**
 * 입력된 경기별 결과를 computeStandings용 MatchResult[]로 변환한다(불변, 결정적).
 * - 아직 결과가 입력되지 않은 경기는 건너뛴다(부분 순위 집계 허용).
 */
export function toMatchResults(
  matches: ScheduledMatch[],
  outcomes: Record<string, MatchOutcome | undefined>,
): MatchResult[] {
  const results: MatchResult[] = [];
  for (const match of matches) {
    const outcome = outcomes[match.id];
    if (outcome === undefined) continue;
    results.push({ pairing: { a: match.a, b: match.b }, outcome });
  }
  return results;
}

/** 모든 경기에 결과가 입력되어 토너먼트가 종료됐는지 여부(경기가 0건이면 false). */
export function allMatchesDecided(
  matches: ScheduledMatch[],
  outcomes: Record<string, MatchOutcome | undefined>,
): boolean {
  if (matches.length === 0) return false;
  return matches.every((match) => outcomes[match.id] !== undefined);
}

/** 결과가 입력된 경기 수(진행도 표시용). */
export function decidedCount(
  matches: ScheduledMatch[],
  outcomes: Record<string, MatchOutcome | undefined>,
): number {
  return matches.filter((match) => outcomes[match.id] !== undefined).length;
}
