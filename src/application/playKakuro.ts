// Application layer: 가쿠로(Kakuro·크로스섬) 내장 퍼즐 뱅크에서 무작위 시작 +
// 한 칸 입력 진행(턴 오케스트레이션). domain(kakuro)과 RandomSource 포트(./dealCards)에만
// 의존한다. infrastructure/ui 의존 금지. 채우기/지우기·런(가로/세로) 합계 위반·런 내 숫자
// 중복 위반·클리어 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다. 무작위(어떤 퍼즐로
// 시작할지)는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 1인 논리 퍼즐 헬퍼 —
// playSkyscrapers/playFutoshiki/playKenKen/playBinairo/playSudoku 등 — 와 동일 패턴).
// UI/전적 저장은 이 모듈 범위 밖이다.
import {
  KAKURO_PUZZLES,
  createKakuro,
  isKakuroSolved,
  kakuroViolations,
  setKakuroValue,
  type KakuroPos,
  type KakuroPuzzle,
  type KakuroState,
  type KakuroValue,
} from "../domain/kakuro";
import type { RandomSource } from "./dealCards";

/** 가쿠로 한 판의 진행 상태. */
export type KakuroStatus = "playing" | "solved";

/**
 * KAKURO_PUZZLES에서 random.nextInt(KAKURO_PUZZLES.length)로 하나를 고른다.
 * - 범위 밖/비정수 인덱스를 반환하면 한국어 사유로 throw.
 * - 같은 시퀀스면 결정적으로 같은 퍼즐.
 */
export function pickRandomKakuroPuzzle(random: RandomSource): KakuroPuzzle {
  const index = random.nextInt(KAKURO_PUZZLES.length);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= KAKURO_PUZZLES.length
  ) {
    throw new Error(
      `가쿠로 퍼즐 선택 범위 밖 인덱스: ${String(index)}(0..${KAKURO_PUZZLES.length - 1} 필요)`,
    );
  }
  return KAKURO_PUZZLES[index]!;
}

/**
 * 새 가쿠로 한 판을 시작한다.
 * pickRandomKakuroPuzzle로 고른 퍼즐(막힌/단서 칸 + 입력 칸 배치)을 도메인
 * createKakuro(puzzle)에 위임해 시작 상태를 만든다(검증 중복 금지 — 격자/단서 형식
 * 검증은 도메인이 수행).
 */
export function startKakuroGame(random: RandomSource): KakuroState {
  const puzzle = pickRandomKakuroPuzzle(random);
  return createKakuro(puzzle);
}

/**
 * 한 칸을 채우거나(1..9) 지운(null) 다음 상태·위반 좌표·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 setKakuroValue(state, pos, value)로 만든다(규칙 재구현 금지).
 * - violations: 도메인 kakuroViolations(next) 결과(런 내 숫자 중복 + 채워진 런 합계 불일치 칸).
 * - status: 도메인 isKakuroSolved(next)가 true면 "solved", 아니면 "playing".
 * - 불법 입력(경계 밖·1..9/null 외 값·막힌/단서 칸 편집)은 도메인 throw를 그대로 전파한다(조용한 무시 금지).
 */
export function playKakuroPlacement(
  state: KakuroState,
  pos: KakuroPos,
  value: KakuroValue,
): {
  state: KakuroState;
  violations: KakuroPos[];
  status: KakuroStatus;
} {
  const next = setKakuroValue(state, pos, value);
  const violations = kakuroViolations(next);
  const status: KakuroStatus = isKakuroSolved(next) ? "solved" : "playing";
  return { state: next, violations, status };
}
