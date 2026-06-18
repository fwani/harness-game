// Application layer: game-agnostic Match + Player + 턴 소유권 진행.
// "엔진 어댑터(GameEngine<S,M>) + 두 플레이어(p1/p2) + 수순 기록"을 묶어, 누가 어느
// side인지·지금 누구 차례인지를 명시적으로 검증하며 한 수씩 진행하는 매치(세션)
// 토대다. domain 및 기존 application(gameEngine)에만 의존하고 infrastructure는 import
// 하지 않는다. 불변·결정적이며, 엔진/도메인/UI 코드는 수정하지 않고 파생만 한다.
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import {
  createGameRecord,
  type GameId,
  type GameRecord,
  type PlayerOutcome,
} from "../domain/gameRecord";

/** 매치 참가자. id/label은 호출자 주입 문자열(민감정보 아님). */
export interface Player {
  /** 플레이어 식별자(호출자 주입). */
  id: string;
  /** 진영. "p1" | "p2". */
  side: Side;
  kind: "human" | "ai";
  /** 표시 이름. */
  label: string;
}

/** 수순 기록의 한 항목: 누가(by) 어떤 수(move)를 뒀는지. */
export interface MatchMoveLogEntry<M> {
  by: Side;
  move: M;
}

/**
 * 매치 상태(불변). 엔진 어댑터 + 엔진 상태 + 두 플레이어(p1/p2 한 쌍) + 수순 기록을 묶는다.
 * 엔진을 함께 보관해 currentTurn/matchStatus/applyMatchMove가 엔진 계약에 위임할 수 있게 한다.
 */
export interface MatchState<S, M> {
  engine: GameEngine<S, M>;
  /** 엔진 상태. */
  state: S;
  players: readonly [Player, Player];
  log: ReadonlyArray<MatchMoveLogEntry<M>>;
}

/** applyMatchMove 거부 사유의 안정적 식별자(UI가 한국어 사유로 매핑할 수 있게 유지). */
export type MatchMoveRejectionCode =
  | "match_over" // 이미 종료된 매치
  | "not_on_turn" // 지금 차례가 아닌 side
  | "illegal_move"; // 엔진이 불법으로 판정한 수

/**
 * 한 수 적용 거부를 나타내는 에러. `code`는 안정적 식별자라 UI가 언어에 독립적으로 분기/번역할 수 있다.
 */
export class MatchMoveError extends Error {
  readonly code: MatchMoveRejectionCode;
  constructor(code: MatchMoveRejectionCode, message: string) {
    super(message);
    this.name = "MatchMoveError";
    this.code = code;
  }
}

/** players 두 원소의 side가 정확히 {p1, p2} 한 쌍인지 검증한다(중복/누락 거부). */
function assertPlayerPair(players: readonly [Player, Player]): void {
  const [a, b] = players;
  if (a.side === b.side) {
    throw new Error(
      `createMatch: players must cover exactly {p1, p2} (got duplicate side "${a.side}")`,
    );
  }
  const sides = new Set<Side>([a.side, b.side]);
  if (!sides.has("p1") || !sides.has("p2")) {
    throw new Error("createMatch: players must cover exactly {p1, p2}");
  }
}

/**
 * 매치를 생성한다(불변). state = engine.init(config), log=[].
 * players의 side는 정확히 {p1, p2} 한 쌍이어야 한다(중복/누락 시 throw).
 * 입력 players를 변형하지 않고 자체 튜플로 복제해 보관한다.
 */
export function createMatch<S, M>(
  engine: GameEngine<S, M>,
  players: readonly [Player, Player],
  config?: unknown,
): MatchState<S, M> {
  assertPlayerPair(players);
  return {
    engine,
    state: engine.init(config),
    players: [players[0], players[1]],
    log: [],
  };
}

/** 현재 둘 차례(engine.turn 위임). */
export function currentTurn<S, M>(match: MatchState<S, M>): Side {
  return match.engine.turn(match.state);
}

/** 현재 차례인 플레이어. */
export function playerOnTurn<S, M>(match: MatchState<S, M>): Player {
  const side = currentTurn(match);
  // players는 {p1, p2} 한 쌍이 보장되므로 항상 찾는다.
  return match.players.find((p) => p.side === side)!;
}

/** 매치 종료/승부 상태(engine.status 위임). */
export function matchStatus<S, M>(match: MatchState<S, M>): GameStatus {
  return match.engine.status(match.state);
}

/**
 * 둔 사람(by)이 현재 차례인지 검증하고 한 수를 적용한 새 MatchState를 반환한다(불변).
 * 검증 순서(실패 시 MatchMoveError throw, code로 사유 식별):
 *   ① 이미 종료(status.over)면 거부("match_over").
 *   ② by !== engine.turn(state)(차례 아님)면 거부("not_on_turn").
 *   ③ engine.isLegal(state, move, by)가 false면 거부("illegal_move").
 * 입력 match/move/engine을 변형하지 않으며, 동일 입력이면 항상 동일 결과(결정적).
 */
export function applyMatchMove<S, M>(
  match: MatchState<S, M>,
  by: Side,
  move: M,
): MatchState<S, M> {
  const { engine, state } = match;
  if (engine.status(state).over) {
    throw new MatchMoveError("match_over", "이미 종료된 매치에는 둘 수 없다");
  }
  if (by !== engine.turn(state)) {
    throw new MatchMoveError("not_on_turn", `${by}의 차례가 아니다`);
  }
  if (!engine.isLegal(state, move, by)) {
    throw new MatchMoveError("illegal_move", "둘 수 없는(불법) 수다");
  }
  return {
    engine,
    state: engine.apply(state, move, by),
    players: match.players,
    log: [...match.log, { by, move }],
  };
}

/** side로 해당 플레이어를 찾는다(보장된 {p1,p2} 쌍). */
function playerOf<S, M>(match: MatchState<S, M>, side: Side): Player {
  return match.players.find((p) => p.side === side)!;
}

/**
 * 매치가 종료됐다면 domain의 createGameRecord로 2인 기록을 만든다(미종료면 null).
 * 승자/무승부는 matchStatus의 winner/draw를 해당 Player의 라벨로 매핑한다.
 * 시간 등 비결정값은 직접 만들지 않고 포트(deps.now)로 주입받는다(테스트 결정성). 다만 현재
 * GameRecord 모델은 시각을 보관하지 않으므로 호출만 하고 결과는 사용하지 않는다(향후 확장 대비).
 */
export function buildMatchRecord<S, M>(
  match: MatchState<S, M>,
  gameId: GameId,
  deps: { now: () => number },
): GameRecord | null {
  const status = matchStatus(match);
  if (!status.over) {
    return null;
  }
  // 시각 포트를 직접 Date.now()로 만들지 않고 주입받아 호출한다(결정성·포트 일관).
  void deps.now();

  const p1 = playerOf(match, "p1");
  const p2 = playerOf(match, "p2");

  let outcomes: [PlayerOutcome, PlayerOutcome];
  if (status.draw) {
    outcomes = [
      { player: p1.label, result: "draw" },
      { player: p2.label, result: "draw" },
    ];
  } else {
    const winnerSide = status.winner;
    outcomes = [
      { player: p1.label, result: winnerSide === "p1" ? "win" : "loss" },
      { player: p2.label, result: winnerSide === "p2" ? "win" : "loss" },
    ];
  }
  return createGameRecord(gameId, outcomes);
}
