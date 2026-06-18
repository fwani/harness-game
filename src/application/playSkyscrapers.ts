// Application layer: 마천루(Skyscrapers·빌딩 퍼즐) 내장 퍼즐 뱅크에서 무작위 시작 +
// 한 칸 입력 진행(턴 오케스트레이션). domain(skyscrapers)과 RandomSource 포트(./dealCards)에만
// 의존한다. infrastructure/ui 의존 금지. 채우기/지우기·행/열 중복·네 변 가시성 단서 위반·클리어
// 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다. 무작위(어떤 퍼즐로 시작할지)는 도메인이
// 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼 — playFutoshiki/playKenKen/playSudoku/
// playBinairo 등 — 와 동일 패턴). 전적 저장·화면(UI)은 이 모듈 범위 밖이다(후속 짝 이슈).
import {
  SKYSCRAPER_PUZZLES,
  createSkyscrapers,
  isSkyscraperSolved,
  setSkyscraperValue,
  skyscraperViolations,
  type SkyscraperPos,
  type SkyscraperPuzzle,
  type SkyscraperState,
  type SkyscraperValue,
} from "../domain/skyscrapers";
import type { RandomSource } from "./dealCards";

/** 마천루 한 판의 진행 상태. */
export type SkyscraperStatus = "playing" | "solved";

/**
 * SKYSCRAPER_PUZZLES에서 random.nextInt(SKYSCRAPER_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖/비정수 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomSkyscraperPuzzle(
  random: RandomSource,
): SkyscraperPuzzle {
  const index = random.nextInt(SKYSCRAPER_PUZZLES.length);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= SKYSCRAPER_PUZZLES.length
  ) {
    throw new Error(
      `마천루 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${SKYSCRAPER_PUZZLES.length - 1} 필요)`,
    );
  }
  return SKYSCRAPER_PUZZLES[index]!;
}

/**
 * 새 마천루 한 판을 시작한다.
 * pickRandomSkyscraperPuzzle로 고른 퍼즐(네 변 가시성 단서 + 선택적 고정 단서)을 도메인
 * createSkyscrapers(puzzle)에 위임해 시작 상태를 만든다(검증 중복 금지 — 격자/단서 형식 검증은
 * 도메인이 수행).
 */
export function startSkyscrapersGame(random: RandomSource): SkyscraperState {
  const puzzle = pickRandomSkyscraperPuzzle(random);
  return createSkyscrapers(puzzle);
}

/**
 * 한 칸을 채우거나(1..N) 지운(null) 다음 상태·위반 좌표·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 setSkyscraperValue(state, pos, value)로 만든다(규칙 재구현 금지).
 * - violations: 도메인 skyscraperViolations(next) 결과(행/열 중복 + 네 변 가시성 단서 위반 칸).
 * - status: 도메인 isSkyscraperSolved(next)가 true면 "solved", 아니면 "playing".
 * - 불법 입력(경계 밖·1..N/null 외 값·고정 단서 칸 편집)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playSkyscraperPlacement(
  state: SkyscraperState,
  pos: SkyscraperPos,
  value: SkyscraperValue,
): {
  state: SkyscraperState;
  violations: SkyscraperPos[];
  status: SkyscraperStatus;
} {
  const next = setSkyscraperValue(state, pos, value);
  const violations = skyscraperViolations(next);
  const status: SkyscraperStatus = isSkyscraperSolved(next)
    ? "solved"
    : "playing";
  return { state: next, violations, status };
}
