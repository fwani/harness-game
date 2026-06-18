// Application layer: 히토리(Hitori) 내장 풀이가능 퍼즐 뱅크에서 무작위 시작 +
// 한 칸 칠하기/되돌리기 진행(턴 오케스트레이션). domain(hitori)과 RandomSource 포트(./dealCards)
// 에만 의존한다. infrastructure/ui 의존 금지. 칠하기·위반·클리어 판정 등 규칙은 도메인 함수만
// 호출하고 재구현하지 않는다. 무작위(어떤 퍼즐로 시작할지)는 도메인이 아니라 RandomSource 주입으로
// 처리한다(다른 게임 헬퍼 — playSudoku/playBinairo 등 — 와 동일 패턴).
import {
  createHitori,
  hitoriViolations,
  isHitoriSolved,
  toggleHitoriCell,
  type HitoriPos,
  type HitoriState,
  type HitoriViolation,
} from "../domain/hitori";
import type { RandomSource } from "./dealCards";

/** 히토리 한 판의 진행 상태. */
export type HitoriStatus = "playing" | "solved";

/**
 * 풀이 가능한(세 제약을 모두 만족하는 칠 상태가 존재하는) 내장 히토리 숫자판 뱅크.
 * 스도쿠 SUDOKU_PUZZLES 선례처럼 application 레이어 상수로 둔다. numbers[row][col]는 양의 정수.
 *
 * 각 퍼즐의 해답 칠 상태(black 좌표)는 다음과 같다(테스트가 toggle로 재현해 검증한다):
 *  - 0번(5×5): black = (1,1), (3,3)
 *  - 1번(5×5): black = (0,3), (2,2), (4,1)
 * 두 퍼즐 모두 white 행/열 중복 없음·인접 black 없음·white 연결을 동시에 만족한다.
 */
export const HITORI_PUZZLES: ReadonlyArray<number[][]> = [
  [
    [1, 2, 3, 4, 5],
    [2, 2, 4, 5, 1],
    [3, 4, 5, 1, 2],
    [4, 5, 1, 4, 3],
    [5, 1, 2, 3, 4],
  ],
  [
    [1, 2, 3, 1, 5],
    [2, 3, 4, 5, 1],
    [3, 4, 3, 1, 2],
    [4, 5, 1, 2, 3],
    [5, 5, 2, 3, 4],
  ],
];

/**
 * HITORI_PUZZLES에서 random.nextInt(HITORI_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖/비정수 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomHitoriPuzzle(random: RandomSource): number[][] {
  const index = random.nextInt(HITORI_PUZZLES.length);
  if (!Number.isInteger(index) || index < 0 || index >= HITORI_PUZZLES.length) {
    throw new Error(
      `히토리 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${HITORI_PUZZLES.length - 1} 필요)`,
    );
  }
  return HITORI_PUZZLES[index]!;
}

/**
 * 새 히토리 한 판을 시작한다.
 * pickRandomHitoriPuzzle로 고른 숫자판을 도메인 createHitori(numbers)에 위임해 시작 상태를 만든다
 * (검증 중복 금지 — 숫자판 형식 검증은 도메인이 수행).
 */
export function startHitoriGame(random: RandomSource): HitoriState {
  const numbers = pickRandomHitoriPuzzle(random);
  return createHitori(numbers);
}

/**
 * 한 칸의 칠 상태를 white↔black으로 토글한 다음 상태·위반·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 toggleHitoriCell(state, pos)로 만든다(규칙 재구현 금지).
 * - violations: 도메인 hitoriViolations(next) 결과(white 행/열 중복·인접 black·white 비연결).
 * - status: 도메인 isHitoriSolved(next)가 true면 "solved", 아니면 "playing".
 * - 불법 입력(경계 밖·비정수 좌표)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playHitoriToggle(
  state: HitoriState,
  pos: HitoriPos,
): { state: HitoriState; violations: HitoriViolation[]; status: HitoriStatus } {
  const next = toggleHitoriCell(state, pos);
  const violations = hitoriViolations(next);
  const status: HitoriStatus = isHitoriSolved(next) ? "solved" : "playing";
  return { state: next, violations, status };
}
