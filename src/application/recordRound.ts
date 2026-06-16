// Application layer: write-side helper that turns a finished round's winner into
// a validated GameRecord and appends it to the repository.
// Depends on domain only. infrastructure를 import 하지 않는다.
import type { GameId, GameRecord, PlayerOutcome } from "../domain/gameRecord";
import { createGameRecord } from "../domain/gameRecord";
import type { GameRecordRepository } from "./gameRecordStore";

/** 한 라운드의 승자. "a" = 플레이어 a 승, "b" = 플레이어 b 승, "draw" = 무승부. */
export type RoundWinner = "a" | "b" | "draw";

/**
 * 끝난 한 판의 승자를 GameRecord로 변환해 저장소에 기록한다(추가 전용).
 * - winner "a"  -> a:win,  b:loss
 * - winner "b"  -> a:loss, b:win
 * - winner "draw" -> a:draw, b:draw
 * players.a 와 players.b 는 서로 다른 비어있지 않은 라벨이어야 한다(검증은 createGameRecord에 위임).
 * 반환값은 저장된 레코드(입력을 변형하지 않음).
 */
export function recordRound(
  repo: GameRecordRepository,
  game: GameId,
  players: { a: string; b: string },
  winner: RoundWinner,
): GameRecord {
  const outcomes: PlayerOutcome[] =
    winner === "draw"
      ? [
          { player: players.a, result: "draw" },
          { player: players.b, result: "draw" },
        ]
      : winner === "a"
        ? [
            { player: players.a, result: "win" },
            { player: players.b, result: "loss" },
          ]
        : [
            { player: players.a, result: "loss" },
            { player: players.b, result: "win" },
          ];

  const record = createGameRecord(game, outcomes);
  repo.save(record);
  return record;
}
