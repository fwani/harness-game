// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 누적 기록(GameRecord[])에서 두 플레이어가 직접 맞붙은 판만 골라 상대 전적(head-to-head)을 집계한다.
// 시간·난수·식별자 생성 등 비결정적 요소 없음. 입력만으로 결정적이며 입력을 변형하지 않는다.

import type { GameRecord } from "./gameRecord";

export interface HeadToHeadRecord {
  /** 기준 플레이어 A 라벨(입력 그대로). */
  playerA: string;
  /** 상대 플레이어 B 라벨(입력 그대로). */
  playerB: string;
  /** A가 이긴 판 수. */
  winsA: number;
  /** B가 이긴 판 수. */
  winsB: number;
  /** 두 사람이 비긴 판 수. */
  draws: number;
  /** 두 사람이 직접 맞붙은 총 판 수 (winsA + winsB + draws). */
  games: number;
}

/**
 * 누적 기록에서 playerA와 playerB가 "직접 맞붙은" 판만 골라 상대 전적을 집계한다(불변, 결정적).
 * - 한 GameRecord의 두 outcomes의 player 라벨 집합이 정확히 {playerA, playerB}일 때만 집계 대상이다.
 *   (둘 중 한 명만 있거나, 제3의 플레이어가 낀 기록은 무시한다.)
 * - 결과는 항상 입력으로 받은 playerA/playerB 기준으로 정렬된다(레코드 내 outcomes 순서와 무관).
 * - 입력 records 배열·원소를 변형하지 않는다.
 *
 * @throws playerA/playerB가 공백이거나 서로 같은 라벨이면 throw.
 */
export function headToHead(
  records: GameRecord[],
  playerA: string,
  playerB: string,
): HeadToHeadRecord {
  if (typeof playerA !== "string" || playerA.trim() === "") {
    throw new Error("headToHead requires a non-empty playerA label");
  }
  if (typeof playerB !== "string" || playerB.trim() === "") {
    throw new Error("headToHead requires a non-empty playerB label");
  }
  if (playerA === playerB) {
    throw new Error("headToHead requires two distinct players");
  }

  let winsA = 0;
  let winsB = 0;
  let draws = 0;

  for (const record of records) {
    const outcomeA = record.outcomes.find((o) => o.player === playerA);
    const outcomeB = record.outcomes.find((o) => o.player === playerB);
    // 정확히 {playerA, playerB} 두 사람이 맞붙은 판만 집계 대상.
    if (outcomeA === undefined || outcomeB === undefined) {
      continue;
    }
    if (record.outcomes.length !== 2) {
      continue;
    }

    if (outcomeA.result === "win") {
      winsA += 1;
    } else if (outcomeB.result === "win") {
      winsB += 1;
    } else if (outcomeA.result === "draw" && outcomeB.result === "draw") {
      draws += 1;
    }
  }

  return {
    playerA,
    playerB,
    winsA,
    winsB,
    draws,
    games: winsA + winsB + draws,
  };
}
