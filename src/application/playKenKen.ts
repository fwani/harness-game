// Application layer: 켄켄(KenKen·Calcudoku) 내장 퍼즐 뱅크에서 무작위 시작 + 한 칸 입력 진행
// (턴 오케스트레이션). domain(kenken)과 RandomSource 포트(./dealCards)에만 의존한다.
// infrastructure/ui 의존 금지. 채우기/지우기·행/열 중복·케이지 산술·클리어 판정 등 규칙은
// 도메인 함수만 호출하고 재구현하지 않는다. 무작위(어떤 퍼즐로 시작할지)는 도메인이 아니라
// RandomSource 주입으로 처리한다(다른 게임 헬퍼 — playFutoshiki/playSudoku 등 — 와 동일 패턴).
import {
  createKenKen,
  isKenKenSolved,
  kenKenViolations,
  setKenKenValue,
  type KenKenPos,
  type KenKenPuzzle,
  type KenKenState,
  type KenKenValue,
} from "../domain/kenken";
import type { RandomSource } from "./dealCards";

/**
 * 손으로 검증한 풀이 가능한 내장 켄켄 퍼즐 뱅크(2개 이상). 각 항목은 케이지가 격자의 모든 칸을
 * 빠짐없이/중복 없이 덮는 도메인 KenKenPuzzle 형태다. 무작위 시작은 이 뱅크에서 한 개를 고른다.
 *
 * 검증된 해(라틴방진 + 모든 케이지 충족):
 *  - 3×3:               - 4×4:
 *      1 2 3                1 2 3 4
 *      2 3 1                2 1 4 3
 *      3 1 2                3 4 1 2
 *                          4 3 2 1
 */
export const KENKEN_PUZZLES: ReadonlyArray<KenKenPuzzle> = [
  // 3×3 — 해: [[1,2,3],[2,3,1],[3,1,2]]
  {
    size: 3,
    cages: [
      // (0,0)+(0,1) = 1+2 = 3
      { op: "add", target: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      // (0,2)÷(1,2) = 3÷1 = 3
      { op: "div", target: 3, cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }] },
      // (1,0)+(2,0) = 2+3 = 5
      { op: "add", target: 5, cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }] },
      // (1,1)-(2,1) = |3-1| = 2
      { op: "sub", target: 2, cells: [{ row: 1, col: 1 }, { row: 2, col: 1 }] },
      // (2,2) 단일 고정값 = 2
      { op: "add", target: 2, cells: [{ row: 2, col: 2 }] },
    ],
  },
  // 4×4 — 해: [[1,2,3,4],[2,1,4,3],[3,4,1,2],[4,3,2,1]]
  {
    size: 4,
    cages: [
      // (0,0)-(0,1) = |1-2| = 1
      { op: "sub", target: 1, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      // (0,2)+(1,2) = 3+4 = 7
      { op: "add", target: 7, cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }] },
      // (0,3)-(1,3) = |4-3| = 1
      { op: "sub", target: 1, cells: [{ row: 0, col: 3 }, { row: 1, col: 3 }] },
      // (1,0)÷(1,1) = 2÷1 = 2
      { op: "div", target: 2, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
      // (2,0)+(3,0) = 3+4 = 7
      { op: "add", target: 7, cells: [{ row: 2, col: 0 }, { row: 3, col: 0 }] },
      // (2,1)×(2,2) = 4×1 = 4
      { op: "mul", target: 4, cells: [{ row: 2, col: 1 }, { row: 2, col: 2 }] },
      // (2,3)-(3,3) = |2-1| = 1
      { op: "sub", target: 1, cells: [{ row: 2, col: 3 }, { row: 3, col: 3 }] },
      // (3,1)×(3,2) = 3×2 = 6
      { op: "mul", target: 6, cells: [{ row: 3, col: 1 }, { row: 3, col: 2 }] },
    ],
  },
];

/**
 * KENKEN_PUZZLES에서 random.nextInt(KENKEN_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖/비정수 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomKenKenPuzzle(random: RandomSource): KenKenPuzzle {
  const index = random.nextInt(KENKEN_PUZZLES.length);
  if (!Number.isInteger(index) || index < 0 || index >= KENKEN_PUZZLES.length) {
    throw new Error(
      `켄켄 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${KENKEN_PUZZLES.length - 1} 필요)`,
    );
  }
  return KENKEN_PUZZLES[index]!;
}

/**
 * 새 켄켄 한 판을 시작한다.
 * pickRandomKenKenPuzzle로 고른 퍼즐(케이지 정의)을 도메인 createKenKen(puzzle)에 위임해 빈 격자
 * 시작 상태를 만든다(검증 중복 금지 — 케이지가 격자를 덮는지 등 형식 검증은 도메인이 수행).
 */
export function startKenKenGame(random: RandomSource): KenKenState {
  const puzzle = pickRandomKenKenPuzzle(random);
  return createKenKen(puzzle);
}

/**
 * 한 칸을 채우거나(1..N) 지운(null) 다음 상태·위반 좌표·클리어 여부를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 setKenKenValue(state, pos, value)로 만든다(규칙 재구현 금지).
 * - violations: 도메인 kenKenViolations(next) 결과(행/열 중복 + 케이지 산술 위반 칸).
 * - solved: 도메인 isKenKenSolved(next) 결과(전부 채움 + 위반 없음).
 * - 불법 입력(경계 밖·1..N/null 외 값)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playKenKenPlacement(
  state: KenKenState,
  pos: KenKenPos,
  value: KenKenValue,
): { state: KenKenState; violations: KenKenPos[]; solved: boolean } {
  const next = setKenKenValue(state, pos, value);
  const violations = kenKenViolations(next);
  const solved = isKenKenSolved(next);
  return { state: next, violations, solved };
}
