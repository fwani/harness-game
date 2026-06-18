// Presentation helper for the 배틀십(Battleship) vs CPU 화면. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 보드 모델·사격·격침·전 함대
// 격침 판정 규칙은 domain(battleship)·application(playBattleship)을 재사용하며 여기서 재구현하지
// 않는다(표시용 변환, 입력 불변). minesweeperView/mukjjippaView와 동일 패턴.
import type { BattleshipBoard, Cell, Ship } from "../../domain/battleship";
import { isShipSunk, isValidPlacement, shipCellsAt } from "../../domain/battleship";
import {
  chooseRandomShot,
  chooseSmartShot,
  playBattleshipShot,
  type BattleshipShotResult,
} from "../../application/playBattleship";
import type { RandomSource } from "../../application/dealCards";
import type { WinSide } from "../records";

// vs CPU 고정 배정: 사람=a, CPU=b. 색만이 아니라 기호/라벨로 칸 상태를 구분한다.
export const HUMAN: WinSide = "a";
export const CPU: WinSide = "b";

/** CPU 사격 난이도: 쉬움=순수 무작위, 어려움=헌트/타깃 추적. */
export type CpuDifficulty = "easy" | "hard";

/** 난이도 → 사람이 읽는 한국어 라벨(컨트롤·안내 표시용). */
export function difficultyLabel(difficulty: CpuDifficulty): string {
  return difficulty === "hard" ? "어려움 (추적)" : "쉬움 (무작위)";
}

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

/**
 * 사격 보드 칸이 클릭 불가(비활성)인지: 보드가 잠겼거나(게임 종료 또는 CPU 차례 진행 중)
 * 이미 사격한 칸. 호출부는 이 값을 네이티브 `disabled`가 아니라 `aria-disabled`로 표시하고
 * (컨벤션 #227: 키보드 포커스로 건너갈 수 있어야 로빙 탭인덱스가 동작하고,
 * `.cell[aria-disabled="true"]`가 cursor:default 예외를 받아 잘못된 클릭 어포던스가 사라진다),
 * true면 onClick을 무시한다.
 */
export function fireCellDisabled(locked: boolean, fired: boolean): boolean {
  return locked || fired;
}

/**
 * 길이별 표준 함종명 풀. 표준 함대는 **길이 3이 2척(순양함·잠수함)**이라 길이만으로는 구별할 수 없으므로
 * 같은 길이가 여러 척이면 등장 순서대로 다른 이름을 배정한다(`fleetShipNames`). 풀에 없는 길이나
 * 풀을 초과한 같은 길이 함선은 size 기반 일반명(`shipName`)으로 떨어진다.
 * 출처: `docs/games/battleship.md` 1절 — 항공모함5·전함4·순양함3·잠수함3·구축함2.
 */
const SHIP_NAMES_BY_SIZE: Readonly<Record<number, ReadonlyArray<string>>> = {
  5: ["항공모함"],
  4: ["전함"],
  3: ["순양함", "잠수함"],
  2: ["구축함"],
};

/** 함선 길이 → 한국어 함종명(색 비의존 표시·격침 안내용). 같은 길이 함선 구별이 필요하면 `fleetShipNames`. */
export function shipName(size: number): string {
  // 같은 길이가 2척 이상(예: 길이3=순양함·잠수함)이면 길이만으로는 결정 불가 → 첫 이름으로 떨어진다.
  // 두 척을 구별하려면 `fleetShipNames`/`shipNameOnBoard`를 쓴다.
  const pool = SHIP_NAMES_BY_SIZE[size];
  return pool && pool.length > 0 ? pool[0]! : `길이 ${size} 함선`;
}

/**
 * 함대(길이 목록)의 각 위치에 표시할 함종명을 계산한다(순수·결정적, 입력 불변).
 * 같은 길이가 여러 척이면(표준 함대의 길이3=순양함·잠수함) 등장 순서대로 풀에서 다른 이름을 배정해
 * 화면에서 두 척이 구분되게 한다. 풀에 없는 길이나 초과분은 size 기반 일반명으로 떨어진다.
 */
export function fleetShipNames(fleet: ReadonlyArray<number>): string[] {
  const usedBySize: Record<number, number> = {};
  return fleet.map((size) => {
    const pool = SHIP_NAMES_BY_SIZE[size] ?? [];
    const used = usedBySize[size] ?? 0;
    usedBySize[size] = used + 1;
    return pool[used] ?? shipName(size);
  });
}

/**
 * 함대 인덱스 id 규약(`ship-${i}`)에서 인덱스 i를 뽑는다. 규약과 다른 id면 null.
 * (placeFleetRandomly·placeShipAt가 만든 id는 배치 순서 인덱스를 담는다.)
 */
export function fleetIndexFromShipId(shipId: string): number | null {
  const m = /^ship-(\d+)$/.exec(shipId);
  return m ? Number(m[1]) : null;
}

/**
 * 보드의 특정 함선(shipId)의 함종명을 만든다(순수·결정적, 입력 불변).
 * 보드에서 함대 구성(길이 목록)을 함대 인덱스(id `ship-${i}`) 순서로 재구성하고 `fleetShipNames`로
 * 이름을 정하므로, **같은 길이 2척(순양함·잠수함)을 등장 순서로 정확히 구분**한다.
 * id가 규약과 다르면 id 문자열 순으로 안정 정렬해(임의지만 결정적) 이름을 배정한다.
 */
export function shipNameOnBoard(board: BattleshipBoard, shipId: string): string {
  const sizes = new Map<string, number>();
  for (const row of board) {
    for (const cell of row) {
      if (cell.shipId !== null) {
        sizes.set(cell.shipId, (sizes.get(cell.shipId) ?? 0) + 1);
      }
    }
  }
  const ordered = [...sizes.keys()].sort((a, b) => {
    const ia = fleetIndexFromShipId(a);
    const ib = fleetIndexFromShipId(b);
    if (ia !== null && ib !== null) {
      return ia - ib;
    }
    if (ia !== null) {
      return -1;
    }
    if (ib !== null) {
      return 1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const names = fleetShipNames(ordered.map((id) => sizes.get(id)!));
  const idx = ordered.indexOf(shipId);
  return idx >= 0 ? names[idx]! : shipName(sizes.get(shipId) ?? 0);
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
    return `${who} 사격: ${shipNameOnBoard(board, result.sunkShipId)} 격침! 💥`;
  }
  if (result.hit) {
    return `${who} 사격: 명중! ✕`;
  }
  return `${who} 사격: 빗나감 ○`;
}

/**
 * 진행 상태 라벨: 종료면 승자, CPU 차례면 "생각 중", 아니면 "사람 차례(클릭해 사격)".
 * cpuThinking=true는 사람 사격 직후 CPU 반격을 짧게 지연하는 동안 CPU 차례를 화면에 드러낸다.
 */
export function battleshipStatusLabel(
  outcome: WinSide | null,
  cpuThinking = false,
): string {
  if (outcome === HUMAN) {
    return "🎉 사람 승리! 전 함대를 격침했습니다.";
  }
  if (outcome === CPU) {
    return "😢 CPU 승리. 우리 함대가 전멸했습니다.";
  }
  if (cpuThinking) {
    return "CPU 차례: 생각 중… 🤔";
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

// ── 함선 수동 배치 단계(사격 전 셋업) 헬퍼 ─────────────────────────────
// 사격 단계 전에 사람이 자기 함대를 한 척씩 직접 배치한다. 도메인 배치 검증(isValidPlacement)·
// 칸 계산(shipCellsAt)을 재사용하며(규칙 재구현 금지), 순수·결정적(입력 불변)이다.
// UI(Battleship.tsx)는 이 상태 전이를 호출해 배치 단계를 구성한다.

/**
 * 다음에 배치할 함선의 길이를 돌려준다(이미 배치된 수 기준). 모두 배치했으면 null.
 * fleet 순서대로 배치한다고 가정한다(placeFleetRandomly의 id 규약 `ship-${i}`와 동일 인덱스).
 */
export function nextShipSize(
  placed: ReadonlyArray<Ship>,
  fleet: ReadonlyArray<number>,
): number | null {
  return placed.length < fleet.length ? fleet[placed.length]! : null;
}

/**
 * 현재 배치 중인 함선을 후보 위치(시작 좌표·방향)에 놓는다(순수·결정적, 입력 불변).
 * - id는 배치 순서 인덱스 `next`로 `ship-${next}`(placeFleetRandomly 규약과 동일).
 * - 도메인 isValidPlacement로 기존 함선들과 함께 겹침·범위를 검증한다(규칙 재구현 금지).
 * - 유효하면 { ships: [...placed, candidate], ok: true }, 아니면 { ships: placed(그대로), ok: false }.
 */
export function placeShipAt(
  placed: ReadonlyArray<Ship>,
  next: number,
  size: number,
  row: number,
  col: number,
  orientation: "h" | "v",
  boardSize: number,
): { ships: Ship[]; ok: boolean } {
  const candidate: Ship = { id: `ship-${next}`, row, col, size, orientation };
  const ships = [...placed, candidate];
  if (isValidPlacement(boardSize, ships)) {
    return { ships, ok: true };
  }
  return { ships: [...placed], ok: false };
}

/** 모든 함선이 배치됐는지(배치 수 ≥ 함대 수). */
export function placementComplete(
  placed: ReadonlyArray<Ship>,
  fleet: ReadonlyArray<number>,
): boolean {
  return placed.length >= fleet.length;
}

/** 방향 회전 토글(수평 ↔ 수직). */
export function toggleOrientation(orientation: "h" | "v"): "h" | "v" {
  return orientation === "h" ? "v" : "h";
}

/** 배치 미리보기: 후보 함선이 놓일 칸들 + 그 위치가 유효한지(겹침/범위). */
export interface PlacementPreview {
  /** 후보 함선이 점유할 칸([row,col][]). 범위 밖 칸도 포함될 수 있다(하이라이트는 호출부에서). */
  cells: Array<[number, number]>;
  /** 이 위치에 실제로 놓을 수 있는지(isValidPlacement). */
  valid: boolean;
}

/**
 * 후보 위치의 미리보기 정보를 만든다(순수·결정적, 입력 불변).
 * - cells: shipCellsAt로 계산한 점유 예정 칸.
 * - valid: 기존 함선들과 함께 isValidPlacement(겹침/범위) 통과 여부.
 */
export function placementPreview(
  placed: ReadonlyArray<Ship>,
  next: number,
  size: number,
  row: number,
  col: number,
  orientation: "h" | "v",
  boardSize: number,
): PlacementPreview {
  const cells = shipCellsAt(row, col, size, orientation);
  const candidate: Ship = { id: `ship-${next}`, row, col, size, orientation };
  return { cells, valid: isValidPlacement(boardSize, [...placed, candidate]) };
}

/** 배치 단계 안내 라벨(다음 배치할 함종/완료 여부). */
export function placementStatusLabel(
  placed: ReadonlyArray<Ship>,
  fleet: ReadonlyArray<number>,
): string {
  const size = nextShipSize(placed, fleet);
  if (size === null) {
    return "모든 함선 배치 완료! '이 배치로 시작'을 눌러 사격을 시작하세요.";
  }
  const remaining = fleet.length - placed.length;
  // 같은 길이 2척(순양함·잠수함)을 배치 순서로 구분해 안내한다(길이만으로는 둘이 같은 이름이 됨).
  const name = fleetShipNames(fleet)[placed.length] ?? shipName(size);
  return `${name}(길이 ${size})을 배치하세요. 남은 함선 ${remaining}척. 클릭=배치 · R=회전.`;
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

/** 사람 한 발의 결과: 사격 후 CPU 보드 + 사격 결과 + (전 함대 격침 시) 승자. */
export interface HumanTurnResult {
  /** 사람이 사격한 뒤의 CPU 보드. */
  cpuBoard: BattleshipBoard;
  /** 사람의 사격 결과. */
  humanShot: BattleshipShotResult;
  /** 전 함대 격침이면 HUMAN, 아니면 null. */
  outcome: WinSide | null;
}

/**
 * 사람의 한 발만 진행한다(순수·결정적, 입력 불변).
 * - 사람은 CPU 보드를 사격한다. playBattleshipShot(application)에 위임(규칙 재구현 금지).
 * - 전 함대 격침이면 outcome=HUMAN(이후 CPU는 쏘지 않는다 — 호출부가 판단).
 * - 이미 사격한 칸·범위 밖 좌표는 도메인 에러로 전파.
 * UI는 이 결과를 먼저 화면에 반영한 뒤, 짧은 지연을 두고 playCpuTurn으로 CPU 반격을 드러낸다.
 */
export function playHumanTurn(
  cpuBoard: BattleshipBoard,
  row: number,
  col: number,
): HumanTurnResult {
  const humanShot = playBattleshipShot(cpuBoard, row, col);
  return {
    cpuBoard: humanShot.board,
    humanShot,
    outcome: humanShot.fleetDestroyed ? HUMAN : null,
  };
}

/** CPU 한 발의 결과: 사격 후 사람 보드 + 사격 좌표·결과 + (전 함대 격침 시) 승자. */
export interface CpuTurnResult {
  /** CPU가 사격한 뒤의 사람 보드(쏠 칸이 없으면 입력 그대로). */
  humanBoard: BattleshipBoard;
  /** CPU의 사격 좌표·결과(쏠 칸이 없으면 null). */
  cpuShot: { row: number; col: number; result: BattleshipShotResult } | null;
  /** 전 함대 격침이면 CPU, 아니면 null. */
  outcome: WinSide | null;
}

/**
 * CPU의 한 발만 진행한다(난수 외 결정적, 입력 불변).
 * - CPU는 사람 보드를 사격한다. 좌표는 난이도에 따라 고른다(규칙 재구현 금지):
 *   difficulty="easy"면 순수 무작위(chooseRandomShot), "hard"면 헌트/타깃 추적(chooseSmartShot).
 * - 미사격 칸이 없으면(이론상 모두 사격됨) cpuShot=null·outcome=null로 사격을 생략한다.
 */
export function playCpuTurn(
  humanBoard: BattleshipBoard,
  rng: RandomSource,
  difficulty: CpuDifficulty = "easy",
): CpuTurnResult {
  const cpuPick =
    difficulty === "hard"
      ? chooseSmartShot(humanBoard, rng)
      : chooseRandomShot(humanBoard, rng);
  if (cpuPick === null) {
    return { humanBoard, cpuShot: null, outcome: null };
  }
  const cpuResult = playBattleshipShot(humanBoard, cpuPick.row, cpuPick.col);
  return {
    humanBoard: cpuResult.board,
    cpuShot: { row: cpuPick.row, col: cpuPick.col, result: cpuResult },
    outcome: cpuResult.fleetDestroyed ? CPU : null,
  };
}

/**
 * vs CPU 한 라운드를 진행한다(사람 사격 1발 + 미종료 시 CPU 사격 1발).
 * - 사람은 CPU 보드를, CPU는 사람 보드를 사격한다(2개 보드 관리).
 * - playHumanTurn/playCpuTurn에 위임한다(규칙 재구현 금지).
 * - difficulty="easy"면 순수 무작위, "hard"면 헌트/타깃 추적으로 CPU 좌표를 고른다(playCpuTurn에 위임,
 *   기본값 "easy" — 기존 호출부 호환).
 * - 명중해도 한 발씩 교대한다(규칙 단순화). 이미 사격한 칸 지정은 도메인 에러로 전파.
 * - 사람 사격으로 전 함대 격침이면 CPU는 사격하지 않는다(outcome=a).
 * - 입력 보드를 변형하지 않는다(난수 외 결정적 — CPU 좌표만 난수).
 * 참고: UI는 CPU 차례를 화면에 드러내려고 두 턴을 단계적으로(playHumanTurn→지연→playCpuTurn)
 * 진행한다. 이 합성 함수는 한 번에 두 턴이 필요한 호출부·테스트용으로 유지한다.
 */
export function playBattleshipCpuRound(
  humanBoard: BattleshipBoard,
  cpuBoard: BattleshipBoard,
  shot: { row: number; col: number },
  rng: RandomSource,
  difficulty: CpuDifficulty = "easy",
): BattleshipRoundResult {
  const human = playHumanTurn(cpuBoard, shot.row, shot.col);
  if (human.outcome !== null) {
    return {
      cpuBoard: human.cpuBoard,
      humanBoard,
      humanShot: human.humanShot,
      cpuShot: null,
      outcome: HUMAN,
    };
  }

  const cpu = playCpuTurn(humanBoard, rng, difficulty);
  return {
    cpuBoard: human.cpuBoard,
    humanBoard: cpu.humanBoard,
    humanShot: human.humanShot,
    cpuShot: cpu.cpuShot,
    outcome: cpu.outcome,
  };
}

/** 호출부가 한 칸의 함선 격침 여부를 cellView에 넘길 때 쓰는 헬퍼(셀이 함선이면 isShipSunk). */
export function isCellSunk(board: BattleshipBoard, cell: Cell): boolean {
  return cell.hasShip && cell.shipId !== null && isShipSunk(board, cell.shipId);
}
