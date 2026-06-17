// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 "한 판 결과"의 공통 기록 모델과 플레이어별 전적 집계.
// 시간(timestamp)·식별자 생성 등 비결정적 요소는 도메인에 두지 않는다(추후 infrastructure 포트).
// 도메인은 입력만으로 결정적이다.

/** 기록 대상 게임 종류. */
export type GameId =
  | "rps"
  | "oddEven"
  | "gomoku"
  | "go"
  | "janggi"
  | "card"
  | "reversi"
  | "dice"
  | "yut";

/** 한 판에서 한 플레이어의 결과. */
export type Outcome = "win" | "loss" | "draw";

export interface PlayerOutcome {
  /** 플레이어 식별 라벨 (예: "a", "b") — 민감정보 아님. */
  player: string;
  result: Outcome;
}

/** 어떤 게임이든 한 판의 결과를 표현하는 공통 모델. */
export interface GameRecord {
  game: GameId;
  /** 2인 기준 정확히 2개 (무승부면 둘 다 draw). */
  outcomes: PlayerOutcome[];
}

/** 플레이어별 누적 전적. */
export interface PlayerStats {
  player: string;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * 단일 판 기록을 생성한다(불변: 입력 outcomes를 복제해 보관).
 * 유효성 검증:
 * - outcomes는 정확히 2개여야 한다(2인 기준).
 * - 각 player 라벨은 공백이 아닌 문자열이어야 한다.
 * - 두 플레이어는 서로 다른 라벨이어야 한다.
 * - 승패 조합이 모순이면 throw: 유효한 조합은 (win,loss) 또는 (draw,draw) 뿐이다.
 *   즉 win이 있으면 정확히 win 1·loss 1·draw 0이어야 하고, draw면 둘 다 draw여야 한다.
 */
export function createGameRecord(game: GameId, outcomes: PlayerOutcome[]): GameRecord {
  if (outcomes.length !== 2) {
    throw new Error("createGameRecord requires exactly 2 outcomes (2-player)");
  }
  for (const o of outcomes) {
    if (typeof o.player !== "string" || o.player.trim() === "") {
      throw new Error("createGameRecord requires a non-empty player label");
    }
  }
  if (outcomes[0]!.player === outcomes[1]!.player) {
    throw new Error("createGameRecord requires two distinct players");
  }

  const wins = outcomes.filter((o) => o.result === "win").length;
  const losses = outcomes.filter((o) => o.result === "loss").length;
  const draws = outcomes.filter((o) => o.result === "draw").length;

  const decisive = wins === 1 && losses === 1 && draws === 0;
  const tie = draws === 2;
  if (!decisive && !tie) {
    throw new Error("createGameRecord requires consistent results: (win,loss) or (draw,draw)");
  }

  return {
    game,
    outcomes: outcomes.map((o) => ({ player: o.player, result: o.result })),
  };
}

/**
 * 여러 판 기록을 플레이어별 wins/losses/draws로 집계한다(불변).
 * 반환 순서는 플레이어가 처음 등장한 순서를 따른다(결정적).
 */
export function summarize(records: GameRecord[]): PlayerStats[] {
  const byPlayer = new Map<string, PlayerStats>();
  for (const record of records) {
    for (const { player, result } of record.outcomes) {
      let stats = byPlayer.get(player);
      if (stats === undefined) {
        stats = { player, wins: 0, losses: 0, draws: 0 };
        byPlayer.set(player, stats);
      }
      if (result === "win") {
        stats.wins += 1;
      } else if (result === "loss") {
        stats.losses += 1;
      } else {
        stats.draws += 1;
      }
    }
  }
  return [...byPlayer.values()];
}
