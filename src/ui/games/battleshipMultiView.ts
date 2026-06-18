// Presentation helper for 배틀십(Battleship) **멀티(DoD B)** 좌석 시점 화면. 순수·결정적·입력 불변
// 함수만 둔다 — 이후 온라인 UI(exec-plan `game-server-multiplayer-ai.md` 단계 5)가 그대로 소비한다.
// 전송/소켓/React 상태는 범위 밖이다(#595 ws 바인딩·#543 멀티룸 레지스트리와 독립적으로 검증 가능).
//
// 레이어 규칙: presentation(ui)은 domain/application의 순수 결과만 받아 렌더용 뷰로 매핑한다.
// 규칙 재구현·전송 의존 금지. 좌석 시점 안개(fog-of-war) 가림은 이미 application에서 끝났고
// (redactSetup #593 / redactBattleshipState #590), 본 헬퍼는 그 redact된 상태를 **신뢰**해 매핑만 한다.
// 칸 표시·좌표 라벨은 기존 vs CPU 뷰(battleshipView.ts)의 cellView/coordLabel/isCellSunk를 재사용한다.
//
// fog-of-war 주의: 좌석에 전달되는 상대 보드는 이미 redact돼 미사격 칸이 hasShip:false로 가려져 있다.
// 그래서 redact된 상대 보드만으로는 (1) 상대 함대 전멸 여부와 (2) 함선 격침 여부를 신뢰할 수 없다
// (미사격 함선 칸이 보이지 않아 isFleetDestroyed/isShipSunk가 조기에 true가 된다). 따라서 종료·승자는
// 서버가 **전체 상태**로 계산해 보내는 `GameStatus`(gameState 메시지의 status)를 권위 있는 소스로 쓰고,
// 상대 보드 칸은 격침(💥) 대신 명중(✕)/빗나감(○)까지만 표시한다(상대 미사격 칸을 함선으로 누출하지 않음).
import type { Side, GameStatus } from "../../application/gameEngine";
import type { BattleshipEngineState } from "../../application/battleshipEngine";
import type { BattleshipSetupState } from "../../application/battleshipSetup";
import { cellView, isCellSunk, type CellView } from "./battleshipView";

/** 방의 진행 단계: 비공개 배치(setup) / 사격 진행(playing) / 종료(over). */
export type BattleshipRoomPhase = "setup" | "playing" | "over";

/**
 * 좌석에 전달되는 방 페이로드(전송 비종속 표현).
 * 두 ServerMessage 변종(`setupState` / `gameState`)에 1:1로 대응한다:
 * - setup 단계: redactSetup으로 좌석 시점 가린 배치 상태.
 * - match 단계: redactBattleshipState로 가린 엔진 상태 + 서버가 전체 상태로 계산한 status/turn.
 *   (status·turn은 redact 대상이 아니므로 권위 있는 종료·차례 소스다.)
 */
export type BattleshipSeatInput =
  | { stage: "setup"; setup: BattleshipSetupState }
  | { stage: "match"; state: BattleshipEngineState; status: GameStatus };

/**
 * 좌석에 전달된 상태가 어느 단계인지 판정한다(순수·결정적).
 * - setup 단계면 "setup".
 * - match 단계면 서버 status로 over면 "over", 아니면 "playing".
 * 종료 판정은 redact된 보드가 아니라 서버 status를 신뢰한다(fog-of-war 주의 참고).
 */
export function battleshipRoomPhase(input: BattleshipSeatInput): BattleshipRoomPhase {
  if (input.stage === "setup") {
    return "setup";
  }
  return input.status.over ? "over" : "playing";
}

/** 배치(setup) 단계의 좌석 시점 뷰: 제출 현황 + 안내(상대 함대 위치 비노출). */
export interface BattleshipSetupSeatView {
  /** 내 함대를 이미 제출했는지. */
  mySubmitted: boolean;
  /** 상대가 제출했는지(제출 여부만 — 위치는 redact돼 알 수 없다). */
  opponentSubmitted: boolean;
  /** 나는 제출했고 상대를 기다리는 중인지(대기 안내·aria-live용). */
  waitingForOpponent: boolean;
  /** 진행 안내 라벨. */
  statusLabel: string;
}

/** seat 좌석이 소유한 함대(p1→p1Ships, p2→p2Ships). */
function ownSetupShips(setup: BattleshipSetupState, seat: Side) {
  return seat === "p1" ? setup.p1Ships : setup.p2Ships;
}

/** seat의 상대가 소유한 함대. */
function opponentSetupShips(setup: BattleshipSetupState, seat: Side) {
  return seat === "p1" ? setup.p2Ships : setup.p1Ships;
}

/**
 * redactSetup 결과를 좌석 시점 배치 뷰로 매핑한다(순수·결정적, 입력 불변).
 * redactSetup 규약: 미제출=null, 제출=비-null(내 함대는 실제 배열, 상대 함대는 빈 배열 `[]`).
 * 따라서 제출 여부는 `!== null`로 판정하며 상대 함선 좌표는 보지 않는다(애초에 [] 라 노출 자체가 없다).
 * p1/p2 어느 좌석이든 대칭으로 동작한다.
 */
export function battleshipSetupSeatView(
  redactedSetup: BattleshipSetupState,
  seat: Side,
): BattleshipSetupSeatView {
  const mySubmitted = ownSetupShips(redactedSetup, seat) !== null;
  const opponentSubmitted = opponentSetupShips(redactedSetup, seat) !== null;
  const waitingForOpponent = mySubmitted && !opponentSubmitted;
  let statusLabel: string;
  if (!mySubmitted) {
    statusLabel = "내 함대를 격자에 배치한 뒤 제출하세요. (상대 배치는 비공개입니다.)";
  } else if (waitingForOpponent) {
    statusLabel = "내 함대 제출 완료. 상대의 배치를 기다리는 중… ⏳";
  } else {
    statusLabel = "양측 배치 완료! 곧 사격이 시작됩니다.";
  }
  return { mySubmitted, opponentSubmitted, waitingForOpponent, statusLabel };
}

/** 사격(match) 단계의 좌석 시점 뷰: 내 함대 보드 + 상대 안개 보드 + 차례·승패(내 관점). */
export interface BattleshipMatchSeatView {
  /** 내 함대 보드(내 함선이 보이고, 피격/격침이 드러난다). */
  myBoardCells: CellView[][];
  /** 상대 보드(미사격 칸은 안개로 가려진 redact 뷰 — 함선 위치 비노출). */
  opponentBoardCells: CellView[][];
  /** 내 차례인지(종료면 false). 보드 활성/비활성·안내에 쓴다. */
  isMyTurn: boolean;
  /** 차례 안내 라벨(내 관점). */
  turnLabel: string;
  /** 진행/결과 헤드라인 라벨(내 관점). */
  statusLabel: string;
  /** 게임 종료 여부. */
  over: boolean;
  /** 내 관점 결과(승=win/패=loss), 미종료면 null. */
  outcome: "win" | "loss" | null;
}

/** seat 좌석이 소유한 보드(p1→p1Board, p2→p2Board). */
function ownBoard(state: BattleshipEngineState, seat: Side) {
  return seat === "p1" ? state.p1Board : state.p2Board;
}

/** seat가 사격하는 상대 보드(p1→p2Board, p2→p1Board). */
function opponentBoard(state: BattleshipEngineState, seat: Side) {
  return seat === "p1" ? state.p2Board : state.p1Board;
}

/**
 * 상대 차례일 때 보여줄 대기 문구를 만든다(aria-live용). 내 차례면 진행 안내를 돌려준다.
 * 순수·결정적.
 */
export function opponentTurnLabel(isMyTurn: boolean): string {
  return isMyTurn ? "내 차례: 상대 보드의 칸을 클릭해 사격하세요." : "상대 차례: 대기 중… ⏳";
}

/**
 * redactBattleshipState 결과(+ 서버 status)를 좌석 시점 사격 뷰로 매핑한다(순수·결정적, 입력 불변).
 * - myBoardCells: 내 보드를 revealShips=true로(내 함선이 보인다) 변환. 격침은 내 보드라 isCellSunk로 정확.
 * - opponentBoardCells: 상대 보드를 revealShips=false로(안개) 변환. redact된 미사격 칸(hasShip:false)을
 *   그대로 신뢰하므로 함선이 누출되지 않는다. 격침 여부는 fog 하에서 신뢰할 수 없어 sunk=false로 두어
 *   상대 함선 피격은 명중(✕)까지만 표시한다(미사격 칸을 함선으로 드러내지 않는다).
 * - isMyTurn/turnLabel: 차례 소유권은 redact 대상이 아닌 state.next로 판정한다(종료면 차례 없음).
 * - over/outcome/statusLabel: 종료·승자는 fog 보드가 아니라 서버 status를 신뢰해 **내 관점**으로 라벨링.
 * p1/p2 어느 좌석이든 대칭으로 동작한다.
 */
export function battleshipMatchSeatView(
  redactedState: BattleshipEngineState,
  seat: Side,
  status: GameStatus,
): BattleshipMatchSeatView {
  const my = ownBoard(redactedState, seat);
  const opp = opponentBoard(redactedState, seat);
  const myBoardCells = my.map((row, r) =>
    row.map((cell, c) =>
      cellView(cell, r, c, { revealShips: true, sunk: isCellSunk(my, cell) }),
    ),
  );
  const opponentBoardCells = opp.map((row, r) =>
    row.map((cell, c) =>
      cellView(cell, r, c, { revealShips: false, sunk: false }),
    ),
  );

  const over = status.over;
  const isMyTurn = !over && redactedState.next === seat;
  const outcome: "win" | "loss" | null = over
    ? status.winner === seat
      ? "win"
      : "loss"
    : null;

  let statusLabel: string;
  if (over) {
    statusLabel =
      outcome === "win"
        ? "🎉 승리! 상대 함대를 모두 격침했습니다."
        : "😢 패배. 우리 함대가 전멸했습니다.";
  } else {
    statusLabel = isMyTurn ? "내 차례입니다." : "상대 차례입니다.";
  }
  const turnLabel = over ? "게임 종료." : opponentTurnLabel(isMyTurn);

  return {
    myBoardCells,
    opponentBoardCells,
    isMyTurn,
    turnLabel,
    statusLabel,
    over,
    outcome,
  };
}
