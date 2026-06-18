// Application layer: 전송 비종속 move 페이로드 검증 코덱(신뢰 경계 가드).
// 멀티플레이 방 런타임(#526 reduceRoom)이 네트워크에서 받은 검증되지 않은
// makeMove.move(unknown)를 엔진(GameEngine.isLegal/apply)에 넘기기 전에, 게임별
// Move "형태(shape)"가 타입상 안전한지만 좁혀 거른다.
//
// 책임 경계:
// - 여기서는 형태(shape)만 본다 — "엔진에 넘겨도 타입상 안전한 형태인가".
// - 경계값·합법성(보드 범위·차례 등)은 검증하지 않는다 — 그건 엔진 isLegal의 책임이다.
// - 새 규칙·새 Move 타입을 도입하지 않는다 — 엔진이 이미 받아들이는 Move 형태를
//   재사용(import type)해 그대로 검증할 뿐이다.
//
// 순수·결정적(난수/시간/IO 없음). domain만 import하고 infrastructure는 import하지 않는다.
// parseEngineMove는 입력(raw)을 변형하지 않는다(통과 시 동일 참조를 그대로 돌려준다).
import type { GameId } from "../domain/gameRecord";
import type { CheckersMove } from "../domain/checkers";
import type { DotsEdge } from "../domain/dotsAndBoxes";
import type { NimMove } from "../domain/nim";
import type { GomokuMove } from "./gameEngine";
import type { GoMove } from "./goEngine";
import type { ConnectFourMove } from "./connectFourEngine";
import type { ChessMove } from "./chessEngine";
import type { JanggiMove } from "./janggiEngine";
import type { ReversiMove } from "./reversiEngine";
import type { TicTacToeMove } from "./ticTacToeEngine";

/**
 * 게임 무관 move 파싱 결과(throw 금지, 판별 Result).
 * - ok:true  → 형태 검증 통과(엔진 Move로 안전). move는 입력 raw와 동일 참조.
 * - ok:false → 거부 사유 code. 언어 독립 식별 코드다.
 *   - "unsupported_game": gameType이 멀티 지원 목록에 없음.
 *   - "malformed_move": raw가 해당 게임 Move 형태가 아님.
 *
 * 이 code는 #526의 MatchMoveError.code(illegal_move 등 "규칙 거부")와 구분된다(이건 "형태 거부").
 */
export type ParseMoveResult =
  | { ok: true; move: unknown }
  | { ok: false; code: "unsupported_game" | "malformed_move" };

function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** { x: number; y: number } 형태인가(go/gomoku/reversi/janggi 좌표). */
function isXY(v: unknown): v is { x: number; y: number } {
  return isObject(v) && isNumber(v.x) && isNumber(v.y);
}

/** { row: number; col: number } 형태인가(tictactoe/chess/checkers 좌표). */
function isRowCol(v: unknown): v is { row: number; col: number } {
  return isObject(v) && isNumber(v.row) && isNumber(v.col);
}

function isGomokuMove(raw: unknown): raw is GomokuMove {
  return isXY(raw);
}

function isReversiMove(raw: unknown): raw is ReversiMove {
  return isXY(raw);
}

function isGoMove(raw: unknown): raw is GoMove {
  return raw === "pass" || isXY(raw);
}

function isTicTacToeMove(raw: unknown): raw is TicTacToeMove {
  return isRowCol(raw);
}

function isConnectFourMove(raw: unknown): raw is ConnectFourMove {
  return isObject(raw) && isNumber(raw.col);
}

function isChessMove(raw: unknown): raw is ChessMove {
  return isObject(raw) && isRowCol(raw.from) && isRowCol(raw.to);
}

function isJanggiMove(raw: unknown): raw is JanggiMove {
  return isObject(raw) && isXY(raw.from) && isXY(raw.to);
}

function isCheckersMove(raw: unknown): raw is CheckersMove {
  // captured는 선택 필드 — 있으면 좌표 형태여야 하고, 없으면(undefined) 무방하다.
  return (
    isObject(raw) &&
    isRowCol(raw.from) &&
    isRowCol(raw.to) &&
    (raw.captured === undefined || isRowCol(raw.captured))
  );
}

/** mancala의 Move는 구덩이 인덱스(number). */
function isMancalaMove(raw: unknown): raw is number {
  return isNumber(raw);
}

function isNimMove(raw: unknown): raw is NimMove {
  return isObject(raw) && isNumber(raw.pile) && isNumber(raw.count);
}

function isDotsEdge(raw: unknown): raw is DotsEdge {
  return (
    isObject(raw) &&
    (raw.orientation === "h" || raw.orientation === "v") &&
    isNumber(raw.row) &&
    isNumber(raw.col)
  );
}

/**
 * 멀티 지원 게임별 형태 가드 표.
 * 키 = 멀티 지원 11종(GameId). 여기 없는 gameType은 unsupported_game으로 거부된다.
 */
const MOVE_GUARDS: Partial<Record<GameId, (raw: unknown) => boolean>> = {
  checkers: isCheckersMove,
  chess: isChessMove,
  connectfour: isConnectFourMove,
  gomoku: isGomokuMove,
  go: isGoMove,
  janggi: isJanggiMove,
  mancala: isMancalaMove,
  nim: isNimMove,
  reversi: isReversiMove,
  tictactoe: isTicTacToeMove,
  dotsandboxes: isDotsEdge,
};

/**
 * 신뢰 경계 가드: gameType에 맞는 형태로 raw(검증되지 않은 네트워크 입력)를 파싱·거부한다.
 * - gameType이 멀티 지원 목록에 없으면 unsupported_game.
 * - raw가 해당 게임 Move 형태가 아니면 malformed_move.
 * - 통과 시 입력 raw를 변형 없이 그대로(동일 참조) 돌려준다. 합법성은 검증하지 않는다.
 */
export function parseEngineMove(gameType: GameId, raw: unknown): ParseMoveResult {
  const guard = MOVE_GUARDS[gameType];
  if (guard === undefined) {
    return { ok: false, code: "unsupported_game" };
  }
  if (!guard(raw)) {
    return { ok: false, code: "malformed_move" };
  }
  return { ok: true, move: raw };
}
