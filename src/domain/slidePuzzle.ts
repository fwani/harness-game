// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 슬라이드 퍼즐(15-puzzle / N-퍼즐): size×size 격자에서 빈 칸과 인접한 번호 타일을
// 빈 칸으로 밀어 넣어 타일을 1..N-1 오름차순으로 정렬하면 클리어(승)하는 단판 퍼즐.
// 무작위 셔플(application의 RandomSource 주입)·턴 진행·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(새 배열/객체 반환).
// 타일은 색뿐 아니라 숫자로 구분되도록(후속 UI는 숫자 병행) 값 기반으로 모델링한다.

/**
 * 격자 상태. tiles는 행 우선(row-major)으로 평탄화된 size*size 길이 배열.
 * 0은 빈 칸, 1..size*size-1은 번호 타일. 완성 배치는 [1,2,...,N-1,0].
 */
export interface SlidePuzzleState {
  tiles: number[];
  size: number;
}

/** 한 수: 빈 칸으로 밀어 넣을 타일의 번호(값). */
export interface SlidePuzzleMove {
  tile: number;
}

/**
 * 완성(정렬) 상태를 새로 생성한다. size 기본 4(→15-puzzle).
 * - size가 정수가 아니거나 2 미만이면 throw(한국어 사유).
 */
export function createSlidePuzzle(size = 4): SlidePuzzleState {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`슬라이드 퍼즐 잘못된 크기: size는 2 이상의 정수여야 함(받은 값: ${size})`);
  }
  const count = size * size;
  const tiles: number[] = [];
  for (let i = 1; i < count; i += 1) {
    tiles.push(i);
  }
  tiles.push(0);
  return { tiles, size };
}

/** tiles에서 빈 칸(0)의 인덱스를 반환한다. 빈 칸이 없으면 -1. */
function blankIndex(state: SlidePuzzleState): number {
  return state.tiles.indexOf(0);
}

/**
 * 합법 수 전체 열거: 빈 칸과 상하좌우로 인접한 타일들(최대 4개)을 그 타일을 빈 칸으로
 * 밀 수 있는 수로 나열한다. 열거 순서는 결정적(빈 칸 기준 위→아래→왼쪽→오른쪽의 이웃 타일).
 */
export function legalSlidePuzzleMoves(state: SlidePuzzleState): SlidePuzzleMove[] {
  const { tiles, size } = state;
  const blank = blankIndex(state);
  if (blank < 0) {
    return [];
  }
  const row = Math.floor(blank / size);
  const col = blank % size;
  const moves: SlidePuzzleMove[] = [];
  // 위(빈 칸 위의 타일이 아래로 내려옴), 아래, 왼쪽, 오른쪽 순.
  if (row > 0) {
    moves.push({ tile: tiles[blank - size]! });
  }
  if (row < size - 1) {
    moves.push({ tile: tiles[blank + size]! });
  }
  if (col > 0) {
    moves.push({ tile: tiles[blank - 1]! });
  }
  if (col < size - 1) {
    moves.push({ tile: tiles[blank + 1]! });
  }
  return moves;
}

/**
 * 한 수를 적용한 새 상태를 반환한다(입력 불변).
 * 지정한 타일이 빈 칸과 인접하면 빈 칸과 자리를 바꾼다.
 * 빈 칸(0) 지정·존재하지 않는 타일·빈 칸과 인접하지 않은 타일이면 throw(한국어 사유).
 */
export function applySlidePuzzleMove(
  state: SlidePuzzleState,
  move: SlidePuzzleMove,
): SlidePuzzleState {
  const { tiles, size } = state;
  if (move.tile === 0) {
    throw new Error("슬라이드 퍼즐 불법 수: 빈 칸(0)은 밀 수 없음");
  }
  const tileIndex = tiles.indexOf(move.tile);
  if (tileIndex < 0) {
    throw new Error(`슬라이드 퍼즐 불법 수: 존재하지 않는 타일(${move.tile})`);
  }
  const blank = blankIndex(state);
  const tr = Math.floor(tileIndex / size);
  const tc = tileIndex % size;
  const br = Math.floor(blank / size);
  const bc = blank % size;
  const adjacent = Math.abs(tr - br) + Math.abs(tc - bc) === 1;
  if (!adjacent) {
    throw new Error(`슬라이드 퍼즐 불법 수: 타일(${move.tile})이 빈 칸과 인접하지 않음`);
  }
  const next = tiles.slice();
  next[blank] = move.tile;
  next[tileIndex] = 0;
  return { tiles: next, size };
}

/** tiles가 [1,2,...,N-1,0] 순서면 클리어(true). */
export function isSlidePuzzleSolved(state: SlidePuzzleState): boolean {
  const { tiles, size } = state;
  const count = size * size;
  for (let i = 0; i < count - 1; i += 1) {
    if (tiles[i] !== i + 1) {
      return false;
    }
  }
  return tiles[count - 1] === 0;
}

/**
 * 풀이 가능 여부를 역위(inversion) 수와 빈 칸 행 패리티로 판정한다.
 * - 폭(size)이 홀수면 역위 수가 짝수일 때만 풀이 가능.
 * - 폭이 짝수면 (역위 수 + 빈 칸의 아래에서부터 센 행 번호)가 홀수일 때만 풀이 가능.
 * 무작위 셔플(application)이 풀이 불가능 배치를 거를 때 쓸 결정적 헬퍼.
 */
export function isSlidePuzzleSolvable(state: SlidePuzzleState): boolean {
  const { tiles, size } = state;
  // 빈 칸(0)을 제외한 타일 시퀀스의 역위 수.
  const sequence = tiles.filter((t) => t !== 0);
  let inversions = 0;
  for (let i = 0; i < sequence.length; i += 1) {
    for (let j = i + 1; j < sequence.length; j += 1) {
      if (sequence[i]! > sequence[j]!) {
        inversions += 1;
      }
    }
  }
  if (size % 2 === 1) {
    return inversions % 2 === 0;
  }
  const blank = blankIndex(state);
  const blankRowFromTop = Math.floor(blank / size); // 0-indexed
  const rowFromBottom = size - blankRowFromTop; // 1-indexed, 마지막 행 = 1
  return (inversions + rowFromBottom) % 2 === 1;
}
