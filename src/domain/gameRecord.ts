// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 "한 판 결과"의 공통 기록 모델과 플레이어별 전적 집계.
// 시간(timestamp)·식별자 생성 등 비결정적 요소는 도메인에 두지 않는다(추후 infrastructure 포트).
// 도메인은 입력만으로 결정적이다.

/** 기록 대상 게임 종류. */
export type GameId =
  | "rps"
  | "mukjjippa"
  | "oddEven"
  | "gomoku"
  | "go"
  | "janggi"
  | "connectfour"
  // 카드 게임은 각자 고유 GameId로 구분한다(하이카드/블랙잭/바카라/섯다/포커).
  | "highcard"
  | "blackjack"
  | "baccarat"
  | "sutda"
  | "poker"
  | "onecard"
  // 레거시: 위 카드 게임들이 과거 공유하던 키. 이미 영속된 기록을 읽기 위해서만 유지한다(신규 기록 미사용).
  | "card"
  | "reversi"
  | "chess"
  | "dice"
  | "yut"
  | "gostop"
  | "numberBaseball"
  | "game2048"
  | "tictactoe"
  | "minesweeper"
  | "dotsandboxes"
  | "memory"
  | "mancala"
  | "checkers"
  | "nim"
  | "battleship"
  | "hanoi"
  | "slidepuzzle"
  | "pegsolitaire"
  | "sokoban"
  | "floodit"
  | "hangman"
  | "pig"
  | "bingo"
  | "snakesandladders"
  | "wordle"
  | "mastermind"
  | "nonogram"
  | "rps-match";

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

/** 한 게임(GameId)에 한정한 플레이어별 누적 전적. */
export interface GameStats {
  game: GameId;
  /** 해당 게임만의 플레이어별 누적(기존 summarize 결과 형태). */
  stats: PlayerStats[];
}

/**
 * 게임(GameId)별로 묶어 각 게임의 PlayerStats[]를 돌려준다(불변).
 * - 기록이 있는 게임만 포함한다(판수 0인 게임은 제외).
 * - 게임 순서: 입력 records에서 처음 등장한 순서를 따른다(결정적).
 * - 각 게임 내 stats는 기존 summarize와 동일 규칙(플레이어 첫 등장 순서)을 따른다.
 * - 입력을 변형하지 않는다.
 */
export function summarizeByGame(records: GameRecord[]): GameStats[] {
  const byGame = new Map<GameId, GameRecord[]>();
  for (const record of records) {
    let group = byGame.get(record.game);
    if (group === undefined) {
      group = [];
      byGame.set(record.game, group);
    }
    group.push(record);
  }
  return [...byGame.entries()].map(([game, group]) => ({
    game,
    stats: summarize(group),
  }));
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
