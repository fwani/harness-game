// Application layer: game-agnostic GameEngine adapter for Battleship(배틀십·해전).
// 배틀십 도메인(src/domain/battleship)과 애플리케이션 오케스트레이터(playBattleship)만 import 한다.
// 도메인 규칙(배치·사격·격침·전 함대 격침 판정)을 재구현하지 않고 그대로 재사용한다(레이어 규칙 준수).
// infrastructure/ui는 import 하지 않으며 도메인/애플리케이션 코드도 수정하지 않는다(파생 계산만).
// connectFourEngine.ts / nimEngine.ts와 동형 패턴.
//
// 범위: 순수 엔진 어댑터 + 레지스트리 등록 + 시점별 안개(fog-of-war) 가림 순수 함수
// (redactBattleshipState/redactOpponentBoard)까지. 엔진 상태는 양측 보드를 모두 들고 있고(정상),
// 멀티 전송 시 연결(side)별로 redact한 뷰를 라우팅해 상대 미사격 칸의 함선 위치 누수를 막는다.
// 함대를 숨김 단계로 주고받는 방 setup 흐름·실제 ws 바인딩(side별 라우팅)은 후속 이슈로 둔다.
import type { GameEngine, Side, GameStatus } from "./gameEngine";
import type { BattleshipBoard, Cell, Ship } from "../domain/battleship";
import {
  createBattleshipBoard,
  fireShot,
  isFleetDestroyed,
} from "../domain/battleship";

/** 표준 배틀십 격자 크기(10×10). config.size 미지정 시 기본값. */
export const DEFAULT_BATTLESHIP_SIZE = 10;

/** 상대 보드의 한 칸 사격 좌표. */
export type BattleshipMove = { row: number; col: number };

/**
 * GameEngine 상태: 양측 함대 보드 + 다음 사격할 쪽.
 * - p1Board: p1(선) 함대 — p2가 사격한다.
 * - p2Board: p2 함대 — p1이 사격한다.
 * - next: 다음에 사격할 쪽(선=p1).
 */
export interface BattleshipEngineState {
  p1Board: BattleshipBoard;
  p2Board: BattleshipBoard;
  next: Side;
}

/** 상대 쪽으로 전환한다. */
function opponent(side: Side): Side {
  return side === "p1" ? "p2" : "p1";
}

/**
 * 상대 함대 보드를 안개(fog-of-war)로 가린 새 보드를 반환한다(입력 불변).
 * - 미사격 칸(`hit === false`): `hasShip:false`·`shipId:null`로 덮어 함선 위치를 숨긴다(빈 바다처럼).
 * - 사격된 칸(`hit === true`): 그대로 둔다 — 명중(`hasShip`)·빗나감은 이미 사격으로 드러난 정보.
 * 각 칸을 새 객체로 만들어 깊은 복사하므로 입력 board의 셀을 변형하지 않는다.
 */
export function redactOpponentBoard(board: BattleshipBoard): BattleshipBoard {
  return board.map((row) =>
    row.map((cell): Cell => {
      if (cell.hit) {
        return { ...cell };
      }
      return { ...cell, hasShip: false, shipId: null };
    }),
  );
}

/** 자기 보드(viewer 소유)를 그대로 깊은 복사한다(불변 보장). */
function copyBoard(board: BattleshipBoard): BattleshipBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * viewer 시점에서 본 가려진 상태를 반환한다(입력 불변·새 객체).
 * - 자기 보드(viewer 소유)는 전부 그대로 노출한다(자기 함대는 본인이 본다).
 * - 상대 보드(viewer가 사격하는 보드: p1→p2Board, p2→p1Board)는 미사격 칸의 함선 정보를 숨긴다.
 * - `next`는 그대로 유지한다(턴 소유권은 가림 대상이 아님).
 * 이후 ws 바인딩에서 연결(side)별로 redact한 gameState를 라우팅하는 데 쓴다.
 */
export function redactBattleshipState(
  state: BattleshipEngineState,
  viewer: Side,
): BattleshipEngineState {
  if (viewer === "p1") {
    return {
      p1Board: copyBoard(state.p1Board),
      p2Board: redactOpponentBoard(state.p2Board),
      next: state.next,
    };
  }
  return {
    p1Board: redactOpponentBoard(state.p1Board),
    p2Board: copyBoard(state.p2Board),
    next: state.next,
  };
}

/** init config에서 { size?, p1Ships, p2Ships }를 추출한다. p1Ships/p2Ships는 필수. */
function parseConfig(config: unknown): {
  size: number;
  p1Ships: ReadonlyArray<Ship>;
  p2Ships: ReadonlyArray<Ship>;
} {
  if (typeof config !== "object" || config === null) {
    throw new Error(
      "createBattleshipEngine.init: config({ size?, p1Ships, p2Ships })가 필요합니다",
    );
  }
  const c = config as {
    size?: unknown;
    p1Ships?: unknown;
    p2Ships?: unknown;
  };
  const size = typeof c.size === "number" ? c.size : DEFAULT_BATTLESHIP_SIZE;
  if (!Array.isArray(c.p1Ships) || !Array.isArray(c.p2Ships)) {
    throw new Error(
      "createBattleshipEngine.init: config.p1Ships와 config.p2Ships(Ship[])가 필요합니다",
    );
  }
  return { size, p1Ships: c.p1Ships as Ship[], p2Ships: c.p2Ships as Ship[] };
}

/**
 * 배틀십 도메인을 GameEngine 인터페이스로 감싼 어댑터를 반환한다.
 * 도메인 규약(불변·사격·격침·전 함대 격침 판정)을 그대로 계승하며, 도메인/애플리케이션 코드는
 * 수정하지 않고 파생 계산만 한다.
 * - init(config): { size?, p1Ships, p2Ships }로 양측 보드를 createBattleshipBoard로 만든다. 선=p1.
 * - turn: state.next.
 * - isLegal: 종료 아님 + by===turn + 좌표가 상대 보드 범위 + 상대 보드 해당 칸 미사격일 때만 true(throw 금지).
 * - apply: by가 상대 보드에 fireShot 1발(불변 새 상태), 명중해도 한 발씩 교대, next 토글(불법수면 throw).
 * - status: 어느 한쪽 함대 전멸이면 over=true, winner=상대를 전멸시킨 쪽. 무승부 없음(draw 항상 false).
 */
export function createBattleshipEngine(): GameEngine<
  BattleshipEngineState,
  BattleshipMove
> {
  function status(state: BattleshipEngineState): GameStatus {
    // p1Board 전멸 → p1 함대가 사라짐 → p2 승리. p2Board 전멸 → p1 승리.
    // 한 발씩 교대 사격이라 양측이 동시에 전멸할 수는 없으나, 방어적으로 둘 다 검사한다.
    if (isFleetDestroyed(state.p2Board)) {
      return { over: true, winner: "p1", draw: false };
    }
    if (isFleetDestroyed(state.p1Board)) {
      return { over: true, winner: "p2", draw: false };
    }
    return { over: false, winner: null, draw: false };
  }

  function turn(state: BattleshipEngineState): Side {
    return state.next;
  }

  /** by가 사격하는 상대 보드를 반환한다(p1→p2Board, p2→p1Board). */
  function targetBoardFor(state: BattleshipEngineState, by: Side): BattleshipBoard {
    return by === "p1" ? state.p2Board : state.p1Board;
  }

  function isLegal(
    state: BattleshipEngineState,
    move: BattleshipMove,
    by: Side,
  ): boolean {
    if (status(state).over) {
      return false;
    }
    if (by !== turn(state)) {
      return false;
    }
    const board = targetBoardFor(state, by);
    const { row, col } = move;
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return false;
    }
    if (row < 0 || row >= board.length) {
      return false;
    }
    const cols = board[row]!;
    if (col < 0 || col >= cols.length) {
      return false;
    }
    // 이미 사격한 칸은 불법(미사격 칸만 사격 가능).
    return !cols[col]!.hit;
  }

  return {
    init(config?: unknown): BattleshipEngineState {
      const { size, p1Ships, p2Ships } = parseConfig(config);
      return {
        p1Board: createBattleshipBoard(size, p1Ships),
        p2Board: createBattleshipBoard(size, p2Ships),
        next: "p1",
      };
    },
    turn,
    isLegal,
    apply(
      state: BattleshipEngineState,
      move: BattleshipMove,
      by: Side,
    ): BattleshipEngineState {
      if (!isLegal(state, move, by)) {
        throw new Error("createBattleshipEngine.apply: illegal move");
      }
      const next = opponent(by);
      if (by === "p1") {
        return {
          p1Board: state.p1Board,
          p2Board: fireShot(state.p2Board, move.row, move.col),
          next,
        };
      }
      return {
        p1Board: fireShot(state.p1Board, move.row, move.col),
        p2Board: state.p2Board,
        next,
      };
    },
    status,
  };
}
