// Application layer: 비나이로(Binairo·Takuzu) 내장 퍼즐 뱅크에서 무작위 시작 + 한 칸 입력 진행
// (턴 오케스트레이션). domain(binairo)과 RandomSource 포트(./dealCards)에만 의존한다.
// infrastructure/ui 의존 금지. 채우기/지우기·위반·클리어 판정 등 규칙은 도메인 함수만 호출하고
// 재구현하지 않는다. 무작위(어떤 퍼즐로 시작할지)는 도메인이 아니라 RandomSource 주입으로 처리한다
// (다른 게임 헬퍼 — playSudoku/playMastermind 등 — 와 동일 패턴).
import {
  BINAIRO_PUZZLES,
  binairoViolations,
  createBinairo,
  isBinairoSolved,
  setBinairoValue,
  type BinairoGrid,
  type BinairoPos,
  type BinairoState,
  type BinairoValue,
} from "../domain/binairo";
import type { RandomSource } from "./dealCards";

/** 비나이로 한 판의 진행 상태. */
export type BinairoStatus = "playing" | "solved";

/**
 * BINAIRO_PUZZLES에서 random.nextInt(BINAIRO_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖/비정수 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomBinairoPuzzle(random: RandomSource): BinairoGrid {
  const index = random.nextInt(BINAIRO_PUZZLES.length);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= BINAIRO_PUZZLES.length
  ) {
    throw new Error(
      `비나이로 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${BINAIRO_PUZZLES.length - 1} 필요)`,
    );
  }
  return BINAIRO_PUZZLES[index]!;
}

/**
 * 새 비나이로 한 판을 시작한다.
 * pickRandomBinairoPuzzle로 고른 퍼즐을 도메인 createBinairo(puzzle)에 위임해 시작 상태를 만든다
 * (검증 중복 금지 — 격자 형식 검증은 도메인이 수행).
 */
export function startBinairoGame(random: RandomSource): BinairoState {
  const puzzle = pickRandomBinairoPuzzle(random);
  return createBinairo(puzzle);
}

/**
 * 한 칸을 채우거나(0/1) 지운(null) 다음 상태·위반 좌표·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 setBinairoValue(state, pos, value)로 만든다(규칙 재구현 금지).
 * - violations: 도메인 binairoViolations(next) 결과(3연속/행·열 동수 초과/중복 행·열).
 * - status: 도메인 isBinairoSolved(next)가 true면 "solved", 아니면 "playing".
 * - 불법 입력(경계 밖·0/1/null 외 값·고정 단서 칸 편집)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playBinairoPlacement(
  state: BinairoState,
  pos: BinairoPos,
  value: BinairoValue,
): { state: BinairoState; violations: BinairoPos[]; status: BinairoStatus } {
  const next = setBinairoValue(state, pos, value);
  const violations = binairoViolations(next);
  const status: BinairoStatus = isBinairoSolved(next) ? "solved" : "playing";
  return { state: next, violations, status };
}
