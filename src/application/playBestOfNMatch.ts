// Application layer: orchestrates a best-of-N match end-to-end — delegates the
// match decision to the domain `playMatch`, and persists the match result via
// the `recordRound` write helper when the match is decided.
// Depends on domain(`match`) and application ports/helpers only.
// infrastructure를 import 하지 않는다.
import type { RoundOutcome, MatchStatus } from "../domain/match";
import { playMatch } from "../domain/match";
import type { GameId, GameRecord } from "../domain/gameRecord";
import type { GameRecordRepository } from "./gameRecordStore";
import { recordRound } from "./recordRound";

export interface BestOfNMatchResult {
  /** playMatch 결과(winsA/winsB/draws/decided/winner). */
  status: MatchStatus;
  /** 매치가 결정됐을 때만 저장된 레코드, 아니면 null. */
  record: GameRecord | null;
}

/**
 * 라운드 결과 시퀀스로 다전제(best-of-N) 매치를 진행하고, 결정된 경우 그 결과를 기록한다.
 * - 매치 판정은 도메인 `playMatch(rounds, targetWins)`에 위임한다(중복 구현 금지).
 *   잘못된 targetWins 검증/throw도 도메인에 위임한다.
 * - status.decided가 true이고 winner가 있으면, 그 매치 승자를 `recordRound`로 한 건 기록한다
 *   ("a" -> "a", "b" -> "b" 매핑). 반환의 record에 저장된 레코드를 담는다.
 * - status.decided가 false(미결정)면 저장하지 않고 record: null을 반환한다.
 * - 입력 인자(rounds, players)를 변형하지 않는다.
 */
export function playBestOfNMatch(
  repo: GameRecordRepository,
  game: GameId,
  players: { a: string; b: string },
  rounds: RoundOutcome[],
  targetWins: number,
): BestOfNMatchResult {
  const status = playMatch(rounds, targetWins);

  if (!status.decided || status.winner === null) {
    return { status, record: null };
  }

  const record = recordRound(repo, game, players, status.winner);
  return { status, record };
}
