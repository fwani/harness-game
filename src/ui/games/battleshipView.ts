// Presentation helper for the 배틀십(Battleship) vs CPU 화면. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 보드 모델·사격·격침·전 함대
// 격침 판정 규칙은 domain(battleship)·application(playBattleship)을 재사용하며 여기서 재구현하지
// 않는다(표시용 변환, 입력 불변). minesweeperView/mukjjippaView와 동일 패턴.
import type { BattleshipBoard, Cell } from "../../domain/battleship";
import { isShipSunk } from "../../domain/battleship";
import {
  chooseRandomShot,
  playBattleshipShot,
  type BattleshipShotResult,
} from "../../application/playBattleship";
import type { RandomSource } from "../../application/dealCards";
import type { WinSide } from "../records";

// vs CPU 고정 배정: 사람=a, CPU=b. 색만이 아니라 기호/라벨로 칸 상태를 구분한다.
export const HUMAN: WinSide = "a";
export const CPU: WinSide = "b";

/** 한 칸의 표시 종류(색 비의존: 기호+라벨로 구분). */
export type CellState = "water" | "ship" | "miss" | "hit" | "sunk";

/** 한 칸을 화면에 어떻게 그릴지(기호 + 접근성 라벨 + 분류). */
export interface CellView {
  /** 화면에 보일 기호. 색이 아니라 기호로 상태를 구분한다. */
  glyph: string;
  /** 스크린리더용 라벨(좌표 + 상태). */
  label: string;
  /** 색이 아니라 종류로 구분하기 위한 분류(스타일 클래스/판정용). */
  state: CellState;
  /** 이미 사격된 칸인지(클릭 불가·비활성 판단용). */
  fired: boolean;
}

/**
 * 좌표 라벨을 만든다(0-기반 행/열 → 사람이 읽는 "행글자+열번호", 예: (0,0)→"A1").
 * 클래식 배틀십 표기를 따른다: 행은 알파벳(A,B,...), 열은 1부터의 번호.
 */
export function coordLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

const STATE_GLYPH: Record<CellState, string> = {
  water: "",
  ship: "■",
  miss: "○",
  hit: "✕",
  sunk: "💥",
};

const STATE_TEXT: Record<CellState, string> = {
  water: "미사격",
  ship: "함선",
  miss: "빗나감",
  hit: "명중",
  sunk: "격침",
};

/**
 * 한 칸의 표시 정보를 만든다(순수·결정적, 입력 불변).
 * domain Cell에는 좌표가 없으므로(보드 위치로만 식별) row/col을 따로 받는다.
 * - revealShips=true(자기 함대 보드)면 아직 안 맞은 함선 칸을 ■로 보여준다.
 *   false(상대 보드)면 안 맞은 함선은 물(미사격)과 똑같이 가려 보인다.
 * - 사격된 칸: 함선이면 명중(✕)/격침(💥), 아니면 빗나감(○).
 * - sunk는 해당 칸의 함선이 격침됐는지(호출부가 isShipSunk로 계산해 전달).
 */
export function cellView(
  cell: Cell,
  row: number,
  col: number,
  opts: { revealShips: boolean; sunk: boolean },
): CellView {
  let state: CellState;
  if (cell.hit) {
    if (cell.hasShip) {
      state = opts.sunk ? "sunk" : "hit";
    } else {
      state = "miss";
    }
  } else if (cell.hasShip && opts.revealShips) {
    state = "ship";
  } else {
    state = "water";
  }
  return {
    glyph: STATE_GLYPH[state],
    label: `${coordLabel(row, col)} ${STATE_TEXT[state]}`,
    state,
    fired: cell.hit,
  };
}

/** 함선 길이 → 한국어 함종명(색 비의존 표시·격침 안내용). */
export function shipName(size: number): string {
  switch (size) {
    case 5:
      return "항공모함";
    case 4:
      return "전함";
    case 3:
      return "순양함";
    case 2:
      return "구축함";
    default:
      return `길이 ${size} 함선`;
  }
}

/** 보드에서 shipId가 점유한 칸 수(=함선 길이)를 센다. 없으면 0. */
function shipSize(board: BattleshipBoard, shipId: string): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.shipId === shipId) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 한 발 사격 결과를 사람이 읽는 한국어 요약으로 바꾼다(순수·결정적).
 * - 전 함대 격침이면 "전 함대 격침! ..."을 우선한다(승부 종료).
 * - 격침이면 "○○함 격침!"(함종명 포함), 명중이면 "명중!", 아니면 "빗나감".
 * - who는 누가 쏜 것인지("사람"/"CPU") 접두 라벨.
 * - board는 함종명 계산을 위해 사격 후 보드(result.board)를 넘긴다.
 */
export function shotSummary(
  who: string,
  result: BattleshipShotResult,
  board: BattleshipBoard,
): string {
  if (result.fleetDestroyed) {
    return `${who} 사격: 전 함대 격침! 🎉`;
  }
  if (result.sunkShipId !== null) {
    return `${who} 사격: ${shipName(shipSize(board, result.sunkShipId))} 격침! 💥`;
  }
  if (result.hit) {
    return `${who} 사격: 명중! ✕`;
  }
  return `${who} 사격: 빗나감 ○`;
}

/** 진행 상태 라벨: 종료면 승자, 아니면 "사람 차례(클릭해 사격)". */
export function battleshipStatusLabel(outcome: WinSide | null): string {
  if (outcome === HUMAN) {
    return "🎉 사람 승리! 전 함대를 격침했습니다.";
  }
  if (outcome === CPU) {
    return "😢 CPU 승리. 우리 함대가 전멸했습니다.";
  }
  return "사람 차례: CPU 보드의 칸을 클릭해 사격하세요.";
}

/** 남은(아직 격침되지 않은) 함선 수를 센다 — 진행 상황 표시용. */
export function remainingShips(board: BattleshipBoard): number {
  const ids = new Set<string>();
  for (const row of board) {
    for (const cell of row) {
      if (cell.shipId !== null) {
        ids.add(cell.shipId);
      }
    }
  }
  let alive = 0;
  for (const id of ids) {
    if (!isShipSunk(board, id)) {
      alive += 1;
    }
  }
  return alive;
}

/** vs CPU 한 라운드 진행 결과: 양측 보드 + 양측 사격 결과 + 승자. */
export interface BattleshipRoundResult {
  /** 사람이 사격한 뒤의 CPU 보드. */
  cpuBoard: BattleshipBoard;
  /** CPU가 사격한 뒤의 사람 보드(사람 사격으로 게임이 끝났으면 입력 그대로). */
  humanBoard: BattleshipBoard;
  /** 사람이 CPU 보드를 사격한 결과. */
  humanShot: BattleshipShotResult;
  /** CPU가 사람 보드를 사격한 결과(사람 사격으로 종료됐거나 쏠 칸이 없으면 null). */
  cpuShot: { row: number; col: number; result: BattleshipShotResult } | null;
  /** 승자(a=사람/b=CPU) 또는 미종료(null). */
  outcome: WinSide | null;
}

/**
 * vs CPU 한 라운드를 진행한다(사람 사격 1발 + 미종료 시 CPU 사격 1발).
 * - 사람은 CPU 보드를, CPU는 사람 보드를 사격한다(2개 보드 관리).
 * - playBattleshipShot/chooseRandomShot(application)에 위임한다(규칙 재구현 금지).
 * - 명중해도 한 발씩 교대한다(규칙 단순화). 이미 사격한 칸 지정은 도메인 에러로 전파.
 * - 사람 사격으로 전 함대 격침이면 CPU는 사격하지 않는다(outcome=a).
 * - 입력 보드를 변형하지 않는다(난수 외 결정적 — CPU 좌표만 난수).
 */
export function playBattleshipCpuRound(
  humanBoard: BattleshipBoard,
  cpuBoard: BattleshipBoard,
  shot: { row: number; col: number },
  rng: RandomSource,
): BattleshipRoundResult {
  const humanShot = playBattleshipShot(cpuBoard, shot.row, shot.col);
  if (humanShot.fleetDestroyed) {
    return {
      cpuBoard: humanShot.board,
      humanBoard,
      humanShot,
      cpuShot: null,
      outcome: HUMAN,
    };
  }

  const cpuPick = chooseRandomShot(humanBoard, rng);
  if (cpuPick === null) {
    // 사람 보드에 쏠 칸이 없으면(이론상 모두 사격됨) CPU는 사격을 생략한다.
    return {
      cpuBoard: humanShot.board,
      humanBoard,
      humanShot,
      cpuShot: null,
      outcome: null,
    };
  }
  const cpuResult = playBattleshipShot(humanBoard, cpuPick.row, cpuPick.col);
  return {
    cpuBoard: humanShot.board,
    humanBoard: cpuResult.board,
    humanShot,
    cpuShot: { row: cpuPick.row, col: cpuPick.col, result: cpuResult },
    outcome: cpuResult.fleetDestroyed ? CPU : null,
  };
}

/** 호출부가 한 칸의 함선 격침 여부를 cellView에 넘길 때 쓰는 헬퍼(셀이 함선이면 isShipSunk). */
export function isCellSunk(board: BattleshipBoard, cell: Cell): boolean {
  return cell.hasShip && cell.shipId !== null && isShipSunk(board, cell.shipId);
}
