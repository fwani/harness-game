// Application layer: 사다리타기(Ghost Leg) 한 판 진행. domain(ladder)과 RandomSource 포트에만 의존한다.
import { resolveLadderAll, type LadderRung } from "../domain/ladder";
import type { RandomSource } from "./dealCards";

/**
 * 무작위 가로줄(rungs)을 생성한다(불변, 결정적).
 * - columnCount는 정수 >= 2, rowCount는 정수 >= 1 이어야 한다. 아니면 throw(사유 포함).
 * - 각 row마다 0..columnCount-2 후보 중 rng.nextInt로 가로줄을 뽑되,
 *   도메인 validateLadder 규칙(같은 row에서 인접/중복 노드 공유 금지)을 위반하지 않도록
 *   이미 점유된 left와 그 좌우(±1)를 제외한 남은 후보 중에서만 배치한다.
 * - 한 row에 0개 이상 배치될 수 있다(남은 후보가 없으면 그 row는 비운다).
 * - rng.nextInt가 범위 밖 인덱스를 반환하면 throw(방어).
 * - 반환한 rungs는 resolveLadderAll(columnCount, rungs)에서 throw 없이 순열을 만든다.
 */
export function generateLadderRungs(
  columnCount: number,
  rowCount: number,
  rng: RandomSource,
): LadderRung[] {
  if (!Number.isInteger(columnCount) || columnCount < 2) {
    throw new Error(`generateLadderRungs requires integer columnCount >= 2, got ${columnCount}`);
  }
  if (!Number.isInteger(rowCount) || rowCount < 1) {
    throw new Error(`generateLadderRungs requires integer rowCount >= 1, got ${rowCount}`);
  }

  const rungs: LadderRung[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    // 이 row에서 아직 배치 가능한 left 후보(0..columnCount-2). 배치할 때마다 그 좌우(±1)를 제거한다.
    let candidates: number[] = [];
    for (let left = 0; left <= columnCount - 2; left += 1) {
      candidates.push(left);
    }
    while (candidates.length > 0) {
      const idx = rng.nextInt(candidates.length);
      if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
        throw new Error(`RandomSource returned out-of-range index: ${idx}`);
      }
      const chosen = candidates[idx]!;
      rungs.push({ row, left: chosen });
      // 인접/중복 노드 공유 금지: chosen-1, chosen, chosen+1 후보를 제거한다.
      candidates = candidates.filter((c) => c < chosen - 1 || c > chosen + 1);
    }
  }
  return rungs;
}

export interface LadderGameResult {
  columnCount: number;
  rungs: LadderRung[];
  /** resolveLadderAll 결과(출발열 i → 도착열). 0..columnCount-1의 순열. */
  assignment: number[];
  /** players[i] → outcomes[assignment[i]] 배정. */
  pairs: { player: string; outcome: string }[];
}

/**
 * 참가자(players)와 결과(outcomes)를 무작위 사다리로 1:1 배정한다(불변, 결정적).
 * - players.length === outcomes.length 이고 >= 2 가 아니면 throw(사유 포함).
 * - columnCount = players.length로 generateLadderRungs 후 resolveLadderAll로 배정한다.
 * - 입력 배열(players/outcomes)을 변형하지 않는다.
 */
export function playLadder(
  players: readonly string[],
  outcomes: readonly string[],
  rowCount: number,
  rng: RandomSource,
): LadderGameResult {
  if (players.length !== outcomes.length) {
    throw new Error(
      `playLadder requires players and outcomes of equal length, got ${players.length} and ${outcomes.length}`,
    );
  }
  if (players.length < 2) {
    throw new Error(`playLadder requires at least 2 players, got ${players.length}`);
  }

  const columnCount = players.length;
  const rungs = generateLadderRungs(columnCount, rowCount, rng);
  const assignment = resolveLadderAll(columnCount, rungs);
  const pairs = players.map((player, i) => ({
    player,
    outcome: outcomes[assignment[i]!]!,
  }));

  return { columnCount, rungs, assignment, pairs };
}
