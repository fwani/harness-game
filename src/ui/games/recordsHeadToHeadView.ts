// Presentation helper for the 전적(Records) 상대 전적(head-to-head) 섹션. Pure function only —
// keeps the React component thin and unit-testable. 집계는 domain/headToHead를 재사용하며
// 여기서 승/패/무 셈 로직을 재구현하지 않는다(부수효과·난수·시간 없음, 입력 불변).
import type { GameRecord } from "../../domain/gameRecord";
import { headToHead, type HeadToHeadRecord } from "../../domain/headToHead";

/**
 * 누적 기록에서 "정확히 2명이 직접 맞붙은" 모든 플레이어 쌍의 상대 전적을 집계해
 * 행 목록으로 변환한다(순수·결정적, 입력 불변).
 * - outcomes가 정확히 2개인 record만 대상(그 외는 무시 — headToHead throw 전파 금지).
 * - 같은 쌍은 한 행으로 합산한다(쌍의 순서 {A,B}={B,A} 동일 취급).
 * - 각 쌍의 집계는 도메인 headToHead(records, a, b) 호출로 얻는다(승/패/무 재구현 금지).
 * - 쌍 라벨은 playerA <= playerB(로캘 무관 문자열 비교)로 정규화해 중복 행을 막는다.
 * - games(=winsA+winsB+draws)가 0인 쌍은 제외한다.
 * - 정렬: games 내림차순 → playerA 라벨 오름차순 → playerB 라벨 오름차순(결정적 안정 정렬).
 * - 빈 입력 → 빈 배열.
 */
export function toHeadToHeadList(records: GameRecord[]): HeadToHeadRecord[] {
  // 2인 record에서 등장한 "정규화된 쌍"을 중복 없이 수집한다.
  // 키는 정규화된 두 라벨을 줄바꿈(\n)으로 합친 문자열이며, 값은 정렬된 [a, b] 라벨.
  // (줄바꿈은 라벨에 등장하기 어려운 구분자라 키 충돌을 피한다.)
  const pairs = new Map<string, [string, string]>();
  for (const record of records) {
    if (record.outcomes.length !== 2) {
      continue;
    }
    const p1 = record.outcomes[0]!.player;
    const p2 = record.outcomes[1]!.player;
    if (p1 === p2) {
      continue;
    }
    // playerA <= playerB로 정규화(로캘 무관 비교)해 {A,B}와 {B,A}가 같은 키가 되게 한다.
    const [a, b] = p1 < p2 ? [p1, p2] : [p2, p1];
    pairs.set([a, b].join("\n"), [a, b]);
  }

  const rows: HeadToHeadRecord[] = [];
  for (const [a, b] of pairs.values()) {
    const record = headToHead(records, a, b);
    if (record.games === 0) {
      continue;
    }
    rows.push(record);
  }

  rows.sort((x, y) => {
    if (y.games !== x.games) {
      return y.games - x.games;
    }
    if (x.playerA !== y.playerA) {
      return x.playerA < y.playerA ? -1 : 1;
    }
    if (x.playerB !== y.playerB) {
      return x.playerB < y.playerB ? -1 : 1;
    }
    return 0;
  });

  return rows;
}
