// Application layer: 스도쿠 풀이 가능한 프리셋 퍼즐 공급 + 한 칸 입력 진행(턴 오케스트레이션).
// domain(sudoku)과 RandomSource 포트에만 의존한다. infrastructure/ui 의존 금지.
// 채우기/지우기·충돌·클리어 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다.
// 무작위(어떤 퍼즐로 시작할지)는 도메인이 아니라 RandomSource 주입으로 처리한다
// (다른 게임 헬퍼 — playMastermind/createScrambledLightsOut 등 — 와 동일 패턴).
import {
  createSudoku,
  isSudokuSolved,
  placeSudokuValue,
  sudokuConflicts,
  type SudokuGrid,
  type SudokuPos,
  type SudokuState,
  type SudokuValue,
} from "../domain/sudoku";
import type { RandomSource } from "./dealCards";

/** 스도쿠 한 판의 진행 상태. */
export type SudokuStatus = "playing" | "solved";

// 빈 칸 단축 표기(가독성용). 프리셋 격자는 모두 도메인 createSudoku 형식(9×9, null/1~9)을 만족한다.
const _ = null;

/**
 * 풀이 가능한 내장 스도쿠 퍼즐(고정 단서 격자) 모음. 최소 3개 이상.
 * 각 퍼즐은 완성 가능한(충돌 없이 모두 채울 수 있는) 보드로, 어떤 완전해의 부분 집합이다.
 * 유니크 해(unique solution) 보장은 범위 밖이다(프리셋 우선).
 */
export const SUDOKU_PUZZLES: readonly SudokuGrid[] = [
  // 1) 고전 퍼즐(완전해의 부분 집합).
  [
    [5, 3, _, _, 7, _, _, _, _],
    [6, _, _, 1, 9, 5, _, _, _],
    [_, 9, 8, _, _, _, _, 6, _],
    [8, _, _, _, 6, _, _, _, 3],
    [4, _, _, 8, _, 3, _, _, 1],
    [7, _, _, _, 2, _, _, _, 6],
    [_, 6, _, _, _, _, 2, 8, _],
    [_, _, _, 4, 1, 9, _, _, 5],
    [_, _, _, _, 8, _, _, 7, 9],
  ],
  // 2) 밴드 패턴 완전해의 체커보드 부분 집합((row+col)이 짝수인 칸을 단서로).
  [
    [1, _, 3, _, 5, _, 7, _, 9],
    [_, 5, _, 7, _, 9, _, 2, _],
    [7, _, 9, _, 2, _, 4, _, 6],
    [_, 3, _, 5, _, 7, _, 9, _],
    [5, _, 7, _, 9, _, 2, _, 4],
    [_, 9, _, 2, _, 4, _, 6, _],
    [3, _, 5, _, 7, _, 9, _, 2],
    [_, 7, _, 9, _, 2, _, 4, _],
    [9, _, 2, _, 4, _, 6, _, 8],
  ],
  // 3) 자리수 반전(10-v) 완전해의 반대 체커보드 부분 집합((row+col)이 홀수인 칸을 단서로).
  [
    [_, 8, _, 6, _, 4, _, 2, _],
    [6, _, 4, _, 2, _, 9, _, 7],
    [_, 2, _, 9, _, 7, _, 5, _],
    [8, _, 6, _, 4, _, 2, _, 9],
    [_, 4, _, 2, _, 9, _, 7, _],
    [2, _, 9, _, 7, _, 5, _, 3],
    [_, 6, _, 4, _, 2, _, 9, _],
    [4, _, 2, _, 9, _, 7, _, 5],
    [_, 9, _, 7, _, 5, _, 3, _],
  ],
];

/**
 * SUDOKU_PUZZLES에서 random.nextInt(SUDOKU_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomSudokuPuzzle(random: RandomSource): SudokuGrid {
  const index = random.nextInt(SUDOKU_PUZZLES.length);
  if (!Number.isInteger(index) || index < 0 || index >= SUDOKU_PUZZLES.length) {
    throw new Error(
      `스도쿠 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${SUDOKU_PUZZLES.length - 1} 필요)`,
    );
  }
  return SUDOKU_PUZZLES[index]!;
}

/**
 * 새 스도쿠 한 판을 시작한다.
 * pickRandomSudokuPuzzle로 고른 퍼즐을 도메인 createSudoku(puzzle)에 위임해 시작 상태를 만든다
 * (검증 중복 금지 — 격자 형식 검증은 도메인이 수행).
 */
export function startSudokuGame(random: RandomSource): SudokuState {
  const puzzle = pickRandomSudokuPuzzle(random);
  return createSudoku(puzzle);
}

/**
 * 한 칸을 채우거나(1~9) 지운(null) 다음 상태·충돌 좌표·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 placeSudokuValue(state, pos, value)로 만든다(규칙 재구현 금지).
 * - conflicts: 도메인 sudokuConflicts(next) 결과(행/열/박스 중복 칸).
 * - status: 도메인 isSudokuSolved(next)가 true면 "solved", 아니면 "playing".
 * - 불법 입력(경계 밖·비정수 좌표·1~9/null 외 값·고정 단서 칸 편집)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playSudokuPlacement(
  state: SudokuState,
  pos: SudokuPos,
  value: SudokuValue,
): { state: SudokuState; conflicts: SudokuPos[]; status: SudokuStatus } {
  const next = placeSudokuValue(state, pos, value);
  const conflicts = sudokuConflicts(next);
  const status: SudokuStatus = isSudokuSolved(next) ? "solved" : "playing";
  return { state: next, conflicts, status };
}
