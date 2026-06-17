// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 만칼라(Mancala / Kalah, 6·4 표준)의 보드 모델 + 씨 뿌리기(sow) + 자기 곳간 한 번 더(extra turn)
// + 반대편 포획(capture) + 종료/쓸어담기 + 승자 판정.
// 난수·턴 오케스트레이션·CPU 수 선택·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).

/** 1=선(먼저 두는 쪽), 2=후. 색 비의존 — 후속 UI는 기호/레이블 병행. */
export type MancalaPlayer = 1 | 2;

/**
 * 만칼라 보드.
 * - pits[p]는 길이 pitsPerSide의 구덩이 배열(인덱스 0..pitsPerSide-1, 씨 뿌리기 진행 순서).
 * - stores[p]는 곳간(store/kalah) 씨앗 수.
 * - 맞은편(포획) 관계: player의 구덩이 i ↔ 상대의 구덩이 (pitsPerSide-1-i).
 */
export interface MancalaBoard {
  pitsPerSide: number;
  pits: { 1: number[]; 2: number[] };
  stores: { 1: number; 2: number };
}

/** 이 수로 새로 반영된 결과. */
export interface MancalaMoveResult {
  /** 씨 뿌리기·포획·(종료 시)쓸어담기까지 반영한 새 보드(입력 불변). */
  board: MancalaBoard;
  /** 마지막 씨앗이 자기 곳간에 떨어져 한 번 더 두면 true. */
  again: boolean;
  /** 이 수로 포획해 곳간에 더해진 씨앗 수(없으면 0). */
  captured: number;
}

const DEFAULT_PITS_PER_SIDE = 6;
const DEFAULT_SEEDS_PER_PIT = 4;

function otherPlayer(player: MancalaPlayer): MancalaPlayer {
  return player === 1 ? 2 : 1;
}

function cloneBoard(board: MancalaBoard): MancalaBoard {
  return {
    pitsPerSide: board.pitsPerSide,
    pits: { 1: [...board.pits[1]], 2: [...board.pits[2]] },
    stores: { 1: board.stores[1], 2: board.stores[2] },
  };
}

/**
 * 표준 초기 배치된 새 보드를 반환한다(매 호출마다 독립 인스턴스).
 * - 각 구덩이 seedsPerPit개(기본 4), 곳간 0. 구덩이 pitsPerSide개(기본 6).
 */
export function createMancalaBoard(
  pitsPerSide: number = DEFAULT_PITS_PER_SIDE,
  seedsPerPit: number = DEFAULT_SEEDS_PER_PIT,
): MancalaBoard {
  const side = (): number[] => Array.from({ length: pitsPerSide }, () => seedsPerPit);
  return {
    pitsPerSide,
    pits: { 1: side(), 2: side() },
    stores: { 1: 0, 2: 0 },
  };
}

/** player의 어느 한쪽 구덩이도 씨앗이 없으면(=그쪽이 전부 빔) true. */
function sideEmpty(board: MancalaBoard, player: MancalaPlayer): boolean {
  return board.pits[player].every((seeds) => seeds === 0);
}

/** 어느 한쪽 구덩이가 전부 비었는지(종료 조건). */
export function isMancalaGameOver(board: MancalaBoard): boolean {
  return sideEmpty(board, 1) || sideEmpty(board, 2);
}

/** player의 둘 수 있는 구덩이 인덱스(씨앗>0). 종료면 빈 배열. */
export function legalMancalaMoves(board: MancalaBoard, player: MancalaPlayer): number[] {
  if (isMancalaGameOver(board)) {
    return [];
  }
  const moves: number[] = [];
  for (let i = 0; i < board.pitsPerSide; i += 1) {
    if (board.pits[player][i]! > 0) {
      moves.push(i);
    }
  }
  return moves;
}

/** 종료 가정 시 곳간 비교 승자. 동점이면 null(무승부). */
export function findMancalaWinner(board: MancalaBoard): MancalaPlayer | null {
  if (board.stores[1] > board.stores[2]) {
    return 1;
  }
  if (board.stores[2] > board.stores[1]) {
    return 2;
  }
  return null;
}

/** 씨 뿌리기 진행을 위한 슬롯(구덩이 또는 곳간). 상대 곳간은 슬롯에 포함하지 않아 건너뜀이 보장된다. */
type SowSlot =
  | { kind: "pit"; side: MancalaPlayer; index: number }
  | { kind: "store"; side: MancalaPlayer };

/**
 * player 기준 반시계 진행 슬롯 시퀀스를 만든다:
 * 자기 구덩이 0..n-1 → 자기 곳간 → 상대 구덩이 0..n-1 (상대 곳간은 제외 = 건너뜀).
 * 길이 2n+1. 자기 구덩이 i는 슬롯 인덱스 i와 같다.
 */
function buildSowSlots(player: MancalaPlayer, pitsPerSide: number): SowSlot[] {
  const opponent = otherPlayer(player);
  const slots: SowSlot[] = [];
  for (let i = 0; i < pitsPerSide; i += 1) {
    slots.push({ kind: "pit", side: player, index: i });
  }
  slots.push({ kind: "store", side: player });
  for (let i = 0; i < pitsPerSide; i += 1) {
    slots.push({ kind: "pit", side: opponent, index: i });
  }
  return slots;
}

/**
 * player가 pit(자기 구덩이 인덱스)에 씨 뿌리기 한 수를 둔다.
 * - 비어있거나 범위 밖 pit이면 throw(불법 수).
 * - 자기 곳간 통과·상대 곳간 건너뜀·한 번 더·포획을 모두 반영한다.
 * - 이 수로 한쪽이 모두 비면 잔여 씨앗을 각자 곳간으로 쓸어담아 반환(종료 정산 포함).
 * - 입력 board 불변(새 보드 반환).
 */
export function applyMancalaMove(
  board: MancalaBoard,
  player: MancalaPlayer,
  pit: number,
): MancalaMoveResult {
  if (!Number.isInteger(pit) || pit < 0 || pit >= board.pitsPerSide) {
    throw new Error(`만칼라 불법 수: 구덩이 인덱스 ${pit}가 범위(0..${board.pitsPerSide - 1}) 밖`);
  }
  if (board.pits[player][pit]! <= 0) {
    throw new Error(`만칼라 불법 수: 빈 구덩이(${pit})는 둘 수 없음`);
  }

  const next = cloneBoard(board);
  const opponent = otherPlayer(player);
  const slots = buildSowSlots(player, next.pitsPerSide);
  const len = slots.length;

  const seeds = next.pits[player][pit]!;
  next.pits[player][pit] = 0;

  for (let step = 1; step <= seeds; step += 1) {
    const slot = slots[(pit + step) % len]!;
    if (slot.kind === "store") {
      next.stores[slot.side] += 1;
    } else {
      const sidePits = next.pits[slot.side];
      sidePits[slot.index] = sidePits[slot.index]! + 1;
    }
  }

  const lastSlot = slots[(pit + seeds) % len]!;
  // 슬롯에는 자기 곳간만 포함되므로(상대 곳간 제외) store 슬롯이면 곧 한 번 더.
  const again = lastSlot.kind === "store";

  let captured = 0;
  // 포획: 마지막 씨앗이 자기 쪽 "비어있던" 구덩이(이제 정확히 1개)에 떨어지고 맞은편에 씨앗이 있을 때.
  if (
    !again &&
    lastSlot.kind === "pit" &&
    lastSlot.side === player &&
    next.pits[player][lastSlot.index] === 1
  ) {
    const oppositeIndex = next.pitsPerSide - 1 - lastSlot.index;
    const oppositeSeeds = next.pits[opponent][oppositeIndex]!;
    if (oppositeSeeds > 0) {
      captured = oppositeSeeds + 1;
      next.stores[player] += captured;
      next.pits[player][lastSlot.index] = 0;
      next.pits[opponent][oppositeIndex] = 0;
    }
  }

  // 종료/쓸어담기: 한쪽 구덩이가 전부 비면 양쪽 잔여 씨앗을 각자 곳간으로 정산한다.
  if (isMancalaGameOver(next)) {
    for (const side of [1, 2] as const) {
      const remaining = next.pits[side].reduce((sum, s) => sum + s, 0);
      if (remaining > 0) {
        next.stores[side] += remaining;
        next.pits[side] = next.pits[side].map(() => 0);
      }
    }
  }

  return { board: next, again, captured };
}
