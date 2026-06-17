// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 뱀과 사다리(Snakes and Ladders / Chutes and Ladders): 2인 교대 외길 경주.
// - 1→size 외길 보드 위에서 주사위(1~6)를 굴려 말을 전진시킨다.
// - 사다리 바닥(link.from, to>from)에 닿으면 위로 오르고, 뱀 머리(to<from)에 닿으면 아래로 미끄러진다.
// - 골(size)에 먼저 정확히 도달하면 승리한다. 초과 이동은 제자리에 머문다.
// 난수 주사위·CPU 행동·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력 state를 변형하지 않는다(새 객체 반환).

/** 플레이어 식별. 색 비의존 — 후속 UI는 기호/레이블 병행. */
export type SnakesAndLaddersPlayer = "a" | "b";

/** 사다리/뱀 링크: from 칸에 닿으면 즉시 to 칸으로 이동한다. to>from이면 사다리(상승), to<from이면 뱀(하강). */
export interface SnakesAndLaddersLink {
  from: number;
  to: number;
}

export interface SnakesAndLaddersState {
  /** 마지막 칸 번호(=골). 기본 100. 양의 정수. */
  size: number;
  /** from→to 즉시 이동 링크 목록. */
  links: SnakesAndLaddersLink[];
  /** 각 플레이어 위치(0=출발 전, 1..size). */
  positions: { a: number; b: number };
  /** 현재 차례. */
  turn: SnakesAndLaddersPlayer;
  /** 종료 시 승자(진행 중이면 null). */
  winner: SnakesAndLaddersPlayer | null;
}

export interface SnakesAndLaddersOptions {
  size?: number;
  links?: SnakesAndLaddersLink[];
}

const DEFAULT_SIZE = 100;

/** 표준 100칸 보드의 기본 링크 세트(사다리·뱀 다수). from은 출발칸/골이 아니고 중복 없음. */
const DEFAULT_LINKS: readonly SnakesAndLaddersLink[] = [
  // 사다리(상승)
  { from: 4, to: 14 },
  { from: 9, to: 31 },
  { from: 21, to: 42 },
  { from: 28, to: 84 },
  { from: 36, to: 44 },
  { from: 51, to: 67 },
  { from: 71, to: 91 },
  { from: 80, to: 99 },
  // 뱀(하강)
  { from: 16, to: 6 },
  { from: 47, to: 26 },
  { from: 49, to: 11 },
  { from: 56, to: 53 },
  { from: 62, to: 19 },
  { from: 64, to: 60 },
  { from: 87, to: 24 },
  { from: 93, to: 73 },
  { from: 95, to: 75 },
  { from: 98, to: 78 },
];

/** 차례 상대를 반환한다. */
function opponent(player: SnakesAndLaddersPlayer): SnakesAndLaddersPlayer {
  return player === "a" ? "b" : "a";
}

/** 링크 목록을 검증하고 깊은 복사본을 반환한다(입력 공유 방지). */
function validateLinks(
  links: readonly SnakesAndLaddersLink[],
  size: number,
): SnakesAndLaddersLink[] {
  const seenFrom = new Set<number>();
  const copy: SnakesAndLaddersLink[] = [];
  for (const link of links) {
    const { from, to } = link;
    if (!Number.isInteger(from) || from < 1 || from > size) {
      throw new Error(
        `뱀과 사다리 잘못된 링크 from: 1..${size} 범위의 정수여야 함(받은 값: ${from})`,
      );
    }
    if (!Number.isInteger(to) || to < 1 || to > size) {
      throw new Error(
        `뱀과 사다리 잘못된 링크 to: 1..${size} 범위의 정수여야 함(받은 값: ${to})`,
      );
    }
    if (from === to) {
      throw new Error(`뱀과 사다리 잘못된 링크: from과 to가 같을 수 없음(${from})`);
    }
    if (from === 1 || from === size) {
      throw new Error(
        `뱀과 사다리 잘못된 링크 from: 출발칸(1)이나 골(${size})에서 시작할 수 없음(받은 값: ${from})`,
      );
    }
    if (seenFrom.has(from)) {
      throw new Error(`뱀과 사다리 잘못된 링크: from이 중복됨(${from})`);
    }
    seenFrom.add(from);
    copy.push({ from, to });
  }
  return copy;
}

/**
 * 새 게임 상태를 만든다. 미지정 시 size=100과 표준 링크 세트(사다리·뱀 다수)를 기본으로 둔다.
 * 검증(아니면 throw): size는 양의 정수(>=2). 각 링크의 from·to는 1..size 범위, from!=to,
 * from!=1·from!=size(출발칸·골에서 시작하는 링크 금지), 한 from 당 링크는 하나만(중복 from 금지).
 * 초기 positions={a:0,b:0}(아직 보드 밖), turn="a", winner=null.
 */
export function createSnakesAndLaddersGame(
  options?: SnakesAndLaddersOptions,
): SnakesAndLaddersState {
  const size = options?.size ?? DEFAULT_SIZE;
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`뱀과 사다리 잘못된 size: 2 이상의 정수여야 함(받은 값: ${size})`);
  }
  const links = validateLinks(options?.links ?? DEFAULT_LINKS, size);
  return {
    size,
    links,
    positions: { a: 0, b: 0 },
    turn: "a",
    winner: null,
  };
}

/** 한 칸을 입력받아 그 칸이 링크의 from이면 to를, 아니면 그대로 반환한다(사다리/뱀 1회 해소; 연쇄 금지로 단순화). */
export function resolveSnakesAndLaddersCell(
  state: SnakesAndLaddersState,
  cell: number,
): number {
  const link = state.links.find((l) => l.from === cell);
  return link ? link.to : cell;
}

/**
 * 현재 차례 플레이어가 주사위 눈 steps(1..6)만큼 이동한 새 상태를 반환한다(입력 불변).
 * - steps 검증: 1..6 정수 아니면 throw. 이미 winner가 있으면 throw.
 * - tentative = 현재 위치 + steps. tentative>size면 초과이므로 이동하지 않고 제자리(턴은 상대로 넘어간다).
 * - tentative==size면 골 도달 → 그 위치로 이동하고 winner=현재 플레이어, 종료(턴 전환 없음).
 * - tentative<size면 그 칸으로 이동 후 resolveSnakesAndLaddersCell로 사다리/뱀 1회 적용한 칸에 안착.
 *   (사다리/뱀으로 이동한 칸이 우연히 size여도 승리로 인정.)
 * - 승리하지 않았으면 turn을 상대로 전환한다.
 */
export function applyDiceMove(
  state: SnakesAndLaddersState,
  steps: number,
): SnakesAndLaddersState {
  if (state.winner !== null) {
    throw new Error("뱀과 사다리 잘못된 호출: 이미 종료된 게임에 이동 불가");
  }
  if (!Number.isInteger(steps) || steps < 1 || steps > 6) {
    throw new Error(`뱀과 사다리 잘못된 주사위 눈: 1~6 정수여야 함(받은 값: ${steps})`);
  }

  const current = state.turn;
  const positions = { a: state.positions.a, b: state.positions.b };
  const tentative = positions[current] + steps;

  // 초과: 이동하지 않고 제자리, 턴 전환.
  if (tentative > state.size) {
    return {
      size: state.size,
      links: state.links,
      positions,
      turn: opponent(current),
      winner: null,
    };
  }

  // 정확히 골 도달: 승리, 턴 미전환.
  if (tentative === state.size) {
    positions[current] = state.size;
    return {
      size: state.size,
      links: state.links,
      positions,
      turn: current,
      winner: current,
    };
  }

  // 일반 전진 후 사다리/뱀 1회 적용.
  const landed = resolveSnakesAndLaddersCell(state, tentative);
  positions[current] = landed;

  // 사다리/뱀으로 우연히 골에 도달하면 승리.
  if (landed === state.size) {
    return {
      size: state.size,
      links: state.links,
      positions,
      turn: current,
      winner: current,
    };
  }

  return {
    size: state.size,
    links: state.links,
    positions,
    turn: opponent(current),
    winner: null,
  };
}

/** 위치가 size에 도달한 플레이어를 반환, 없으면 null. (winner 필드와 일관) */
export function findSnakesAndLaddersWinner(
  state: SnakesAndLaddersState,
): SnakesAndLaddersPlayer | null {
  if (state.positions.a >= state.size) {
    return "a";
  }
  if (state.positions.b >= state.size) {
    return "b";
  }
  return null;
}

/** 승자가 정해졌으면 true. */
export function isSnakesAndLaddersOver(state: SnakesAndLaddersState): boolean {
  return state.winner !== null;
}
