// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 누적 대국 기록(GameRecord[])을 시간 순으로 재생하며 ELO 레이팅을 갱신해 플레이어별 최종 레이팅을 산출한다.
// 난수·시간·식별자 생성 등 비결정적 요소 없음. 입력만으로 결정적이며 입력 배열/원소를 변형하지 않는다.

import { updateElo } from "./elo";
import type { GameRecord } from "./gameRecord";

export interface EloRating {
  /** 플레이어 식별 라벨(입력 그대로) — 민감정보 아님. */
  player: string;
  /** 정수 레이팅 (updateElo가 Math.round로 정수화). */
  rating: number;
  /** 이 플레이어가 참여한 집계 대상 판 수. */
  games: number;
}

export interface ComputeEloOptions {
  /** 신규 플레이어 시작 레이팅, 기본 1000. */
  initialRating?: number;
  /** updateElo로 전달, 기본 32. */
  kFactor?: number;
}

/**
 * 누적 기록을 앞에서부터(records 배열 순서대로) 재생하며 ELO를 갱신한다(불변, 결정적).
 * - 각 GameRecord는 정확히 2명(2인) 결과여야 한다. outcomes[0] 관점으로 updateElo를 호출한다
 *   (outcomes[0].result 를 outcome 인자로 사용; "win"/"loss"/"draw").
 * - 처음 등장하는 플레이어는 initialRating으로 시작한다.
 * - 반환 배열은 플레이어가 "처음 등장한 순서"를 따른다(결정적). 순위 정렬은 하지 않는다.
 *
 * @throws outcomes가 정확히 2개가 아니면 throw.
 * @throws initialRating이 유한수가 아니면 throw.
 * @throws kFactor가 유한수가 아니거나 0 이하이면 updateElo가 그대로 throw.
 */
export function computeEloRatings(
  records: GameRecord[],
  options: ComputeEloOptions = {},
): EloRating[] {
  const initialRating = options.initialRating ?? 1000;
  const kFactor = options.kFactor ?? 32;

  if (!Number.isFinite(initialRating)) {
    throw new Error("computeEloRatings requires a finite initialRating");
  }

  // 처음 등장한 순서를 보존하기 위해 Map(삽입 순서 유지)을 사용한다.
  const byPlayer = new Map<string, EloRating>();

  const ensure = (player: string): EloRating => {
    let entry = byPlayer.get(player);
    if (entry === undefined) {
      entry = { player, rating: initialRating, games: 0 };
      byPlayer.set(player, entry);
    }
    return entry;
  };

  for (const record of records) {
    if (record.outcomes.length !== 2) {
      throw new Error("computeEloRatings requires exactly 2 outcomes per record (2-player)");
    }
    const a = record.outcomes[0]!;
    const b = record.outcomes[1]!;

    const ratingA = ensure(a.player);
    const ratingB = ensure(b.player);

    const updated = updateElo(ratingA.rating, ratingB.rating, a.result, kFactor);
    ratingA.rating = updated.ratingA;
    ratingB.rating = updated.ratingB;
    ratingA.games += 1;
    ratingB.games += 1;
  }

  return [...byPlayer.values()].map((entry) => ({ ...entry }));
}
