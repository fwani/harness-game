// Application layer: game-agnostic engine lookup/registry.
// Depends on domain (GameId) and existing application engine adapters only — no infrastructure.
//
// 멀티플레이(방 기반) 단계 4 서버는 들어온 메시지의 gameType(=GameId)만 보고
// "게임이 무엇인지 몰라도" 올바른 GameEngine<S,M> 어댑터를 만들어야 한다.
// 기존 createXEngine() 팩토리는 11개 흩어져 있을 뿐 단일 진입점이 없으므로,
// 여기서 gameType → 엔진을 게임 무관하게 해소하는 조회 계층을 제공한다.
// 새 게임·새 규칙은 도입하지 않는다(이미 존재하는 엔진 어댑터를 묶는 파생 조회만).
import type { GameId } from "../domain/gameRecord";
import type { GameEngine } from "./gameEngine";
import { createGomokuEngine } from "./gameEngine";
import { createGoEngine } from "./goEngine";
import { createMancalaEngine } from "./mancalaEngine";
import { createDotsAndBoxesEngine } from "./dotsAndBoxesEngine";
import { createBattleshipEngine } from "./battleshipEngine";
import { createCheckersEngine } from "./checkersEngine";
import { createChessEngine } from "./chessEngine";
import { createConnectFourEngine } from "./connectFourEngine";
import { createJanggiEngine } from "./janggiEngine";
import { createNimEngine } from "./nimEngine";
import { createReversiEngine } from "./reversiEngine";
import { createTicTacToeEngine } from "./ticTacToeEngine";

/**
 * GameEngine<S,M> 어댑터가 이미 존재해 멀티플레이가 가능한 게임 화이트리스트(현재 11종).
 * 순서는 안정적이며, 여기에 없는 GameId는 멀티 비대상이다.
 */
export const MULTIPLAYER_GAME_IDS: readonly GameId[] = [
  "battleship",
  "checkers",
  "chess",
  "connectfour",
  "gomoku",
  "go",
  "janggi",
  "mancala",
  "nim",
  "reversi",
  "tictactoe",
  "dotsandboxes",
] as const;

const MULTIPLAYER_GAME_ID_SET: ReadonlySet<GameId> = new Set(MULTIPLAYER_GAME_IDS);

/** 해당 GameId가 멀티플레이(엔진 어댑터 보유) 대상인지. */
export function isMultiplayerGame(id: GameId): boolean {
  return MULTIPLAYER_GAME_ID_SET.has(id);
}

/**
 * 미지원 gameType 거부 시 던지는 에러.
 * UI/서버가 언어 독립적으로 분기할 수 있도록 안정적 식별 `code`를 노출한다.
 */
export const UNSUPPORTED_GAME_TYPE = "UNSUPPORTED_GAME_TYPE" as const;

export class UnsupportedGameTypeError extends Error {
  /** 안정적 식별 코드(메시지 텍스트와 무관하게 분기용). */
  readonly code = UNSUPPORTED_GAME_TYPE;
  /** 거부된 gameType(진단용). */
  readonly gameType: GameId;

  constructor(gameType: GameId) {
    super(`Unsupported multiplayer gameType: ${gameType}`);
    this.name = "UnsupportedGameTypeError";
    this.gameType = gameType;
  }
}

/** config가 객체이고 key가 number면 그 값을 추출한다. */
function numberFromConfig(config: unknown, key: string): number | undefined {
  if (typeof config === "object" && config !== null && key in config) {
    const value = (config as Record<string, unknown>)[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}

/**
 * gameType으로 GameEngine 어댑터를 만드는 게임 무관 팩토리.
 * 화이트리스트에 있으면 해당 createXEngine(config?)에 위임하고,
 * 없으면 UnsupportedGameTypeError(code=UNSUPPORTED_GAME_TYPE)로 거부한다.
 *
 * 엔진별 config 옵션은 기존 시그니처를 그대로 위임 호출한다(새 규칙 도입 없음):
 * - go: 덤(komi)은 팩토리 인자이므로 config.komi를 추출해 전달한다.
 * - gomoku/go/mancala/dotsandboxes: 보드 크기 등은 각 엔진의 init(config)가
 *   동일 config를 받아 처리하므로 여기서 별도 전달이 필요 없다.
 *
 * @param gameType 해소할 게임 종류(GameId).
 * @param config 엔진에 전달할 옵션(엔진별 형태는 각 어댑터 규약을 따른다).
 */
export function createEngineFor(
  gameType: GameId,
  config?: unknown,
): GameEngine<unknown, unknown> {
  switch (gameType) {
    case "battleship":
      return createBattleshipEngine() as GameEngine<unknown, unknown>;
    case "checkers":
      return createCheckersEngine() as GameEngine<unknown, unknown>;
    case "chess":
      return createChessEngine() as GameEngine<unknown, unknown>;
    case "connectfour":
      return createConnectFourEngine() as GameEngine<unknown, unknown>;
    case "gomoku":
      return createGomokuEngine() as GameEngine<unknown, unknown>;
    case "go":
      return createGoEngine(numberFromConfig(config, "komi")) as GameEngine<
        unknown,
        unknown
      >;
    case "janggi":
      return createJanggiEngine() as GameEngine<unknown, unknown>;
    case "mancala":
      return createMancalaEngine() as GameEngine<unknown, unknown>;
    case "nim":
      return createNimEngine() as GameEngine<unknown, unknown>;
    case "reversi":
      return createReversiEngine() as GameEngine<unknown, unknown>;
    case "tictactoe":
      return createTicTacToeEngine() as GameEngine<unknown, unknown>;
    case "dotsandboxes":
      return createDotsAndBoxesEngine() as GameEngine<unknown, unknown>;
    default:
      throw new UnsupportedGameTypeError(gameType);
  }
}
