// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 하노이탑(Tower of Hanoi): 기둥(peg) 사이로 디스크를 한 번에 하나씩 옮기되
// 항상 작은 디스크 위에만 큰 디스크가 올 수 없는(=큰 디스크를 작은 디스크 위에 못 놓는) 규칙으로,
// 모든 디스크를 목표 기둥으로 옮기면 클리어다.
// 난수·턴 오케스트레이션·이동 수 카운트·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 상태 반환).

/**
 * 하노이탑 상태.
 * - pegs[p]는 한 기둥의 디스크 배열로, 아래(바닥=큰 디스크)→위(작은 디스크) 순서다.
 *   즉 pegs[p][0]가 바닥, 마지막 원소가 맨 위(옮길 수 있는 디스크).
 * - diskCount는 전체 디스크 수(디스크 크기는 1..diskCount).
 */
export interface HanoiState {
  pegs: number[][];
  diskCount: number;
}

/** 한 수: from 기둥의 맨 위 디스크를 to 기둥으로 옮긴다. */
export interface HanoiMove {
  from: number;
  to: number;
}

const DEFAULT_PEG_COUNT = 3;

function clonePegs(pegs: number[][]): number[][] {
  return pegs.map((peg) => peg.slice());
}

/** 기둥 맨 위 디스크(없으면 undefined). */
function topDisk(peg: number[]): number | undefined {
  return peg[peg.length - 1];
}

/**
 * 표준 초기 배치된 새 상태를 반환한다(매 호출마다 독립 인스턴스).
 * - 모든 디스크(1..diskCount)를 0번 기둥에 큰 것이 바닥으로 쌓는다: pegs[0] = [diskCount, ..., 2, 1].
 * - pegCount 기본 3. 나머지 기둥은 빈 배열.
 * - diskCount<1 또는 pegCount<1(비정수 포함)이면 throw(한국어 사유).
 */
export function createHanoi(diskCount: number, pegCount: number = DEFAULT_PEG_COUNT): HanoiState {
  if (!Number.isInteger(diskCount) || diskCount < 1) {
    throw new Error(`하노이 잘못된 배치: 디스크 수는 1 이상의 정수여야 함(받은 값: ${diskCount})`);
  }
  if (!Number.isInteger(pegCount) || pegCount < 1) {
    throw new Error(`하노이 잘못된 배치: 기둥 수는 1 이상의 정수여야 함(받은 값: ${pegCount})`);
  }
  const pegs: number[][] = Array.from({ length: pegCount }, () => []);
  // 큰 디스크가 바닥(인덱스 0), 작은 디스크가 위로 가도록 내림차순으로 쌓는다.
  for (let disk = diskCount; disk >= 1; disk -= 1) {
    pegs[0]!.push(disk);
  }
  return { pegs, diskCount };
}

/**
 * 한 수의 합법 여부만 판정한다(throw 금지, boolean만).
 * - from/to가 범위 밖·비정수면 false.
 * - from==to면 false(제자리 이동 금지).
 * - from 기둥이 비었으면 false.
 * - to 기둥이 비어있지 않고 그 맨 위 디스크가 옮길 디스크보다 작으면 false.
 */
export function isLegalHanoiMove(state: HanoiState, move: HanoiMove): boolean {
  const { from, to } = move;
  const pegCount = state.pegs.length;
  if (!Number.isInteger(from) || from < 0 || from >= pegCount) {
    return false;
  }
  if (!Number.isInteger(to) || to < 0 || to >= pegCount) {
    return false;
  }
  if (from === to) {
    return false;
  }
  const moving = topDisk(state.pegs[from]!);
  if (moving === undefined) {
    return false;
  }
  const target = topDisk(state.pegs[to]!);
  if (target !== undefined && target < moving) {
    return false;
  }
  return true;
}

/**
 * 합법 수 전체 열거: 맨 위 디스크를 옮길 수 있는 모든 (from, to).
 * 대상 기둥이 비었거나 그 맨 위 디스크가 더 클 때만 합법.
 * 열거 순서 결정적(from 오름차순, 그 안에서 to 오름차순).
 */
export function legalHanoiMoves(state: HanoiState): HanoiMove[] {
  const moves: HanoiMove[] = [];
  const pegCount = state.pegs.length;
  for (let from = 0; from < pegCount; from += 1) {
    for (let to = 0; to < pegCount; to += 1) {
      if (isLegalHanoiMove(state, { from, to })) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}

/**
 * 한 수를 적용한 새 상태를 반환한다(입력 state 불변).
 * - 빈 기둥에서 꺼내기·더 작은 디스크 위에 큰 디스크 올리기·범위 밖 인덱스·제자리 이동은
 *   도메인 에러(한국어 사유) throw.
 */
export function applyHanoiMove(state: HanoiState, move: HanoiMove): HanoiState {
  if (!isLegalHanoiMove(state, move)) {
    throw new Error(
      `하노이 불법 수: from=${move.from} → to=${move.to} (기둥 수=${state.pegs.length}) — ` +
        "빈 기둥에서 꺼내거나 큰 디스크를 작은 디스크 위에 올릴 수 없음",
    );
  }
  const pegs = clonePegs(state.pegs);
  const disk = pegs[move.from]!.pop()!;
  pegs[move.to]!.push(disk);
  return { pegs, diskCount: state.diskCount };
}

/**
 * 클리어 판정: 모든 디스크가 목표 기둥(기본 마지막 기둥)에 올바른 순서로 모이면 true.
 * - targetPeg가 범위 밖이면 false.
 * - 목표 기둥에 diskCount개가 [diskCount, ..., 2, 1] 순(바닥→위)으로 쌓여야 한다.
 */
export function isHanoiSolved(state: HanoiState, targetPeg?: number): boolean {
  const target = targetPeg ?? state.pegs.length - 1;
  if (!Number.isInteger(target) || target < 0 || target >= state.pegs.length) {
    return false;
  }
  const peg = state.pegs[target]!;
  if (peg.length !== state.diskCount) {
    return false;
  }
  for (let i = 0; i < state.diskCount; i += 1) {
    if (peg[i] !== state.diskCount - i) {
      return false;
    }
  }
  return true;
}

/**
 * 표준 3기둥 최소 이동 수 = 2^diskCount - 1.
 * diskCount<0(비정수 포함)이면 throw(한국어 사유). diskCount=0이면 0.
 */
export function minHanoiMoves(diskCount: number): number {
  if (!Number.isInteger(diskCount) || diskCount < 0) {
    throw new Error(`하노이 잘못된 디스크 수: 0 이상의 정수여야 함(받은 값: ${diskCount})`);
  }
  return 2 ** diskCount - 1;
}
