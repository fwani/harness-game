// Presentation helpers for the 마스터마인드(Mastermind) 시작 옵션(난이도) 폼. Pure functions only —
// 난이도 프리셋 목록·기본값·임의 id 정규화(폴백)를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 게임 규칙(채점·승패·무작위)은 다루지 않으며 기존 application startMastermindGame(rng, options) 경로를
// 그대로 재사용한다. 부수효과·난수·시간 없는 표시/검증용 변환만 둔다(입력 불변).
// 색 가짓수(colorCount)는 mastermindView 팔레트(A~H, MAX_MASTERMIND_COLORS=8)와 정합한다.
import { MAX_MASTERMIND_COLORS } from "./mastermindView";

/** 사람이 고를 수 있는 난이도 프리셋. id는 안정 식별자, label은 색 비의존 텍스트. */
export interface MastermindDifficulty {
  id: string;
  label: string;
  /** 비밀 코드 칸 수. */
  codeLength: number;
  /** 색 가짓수(1..MAX_MASTERMIND_COLORS). */
  colorCount: number;
  /** 시도 한도. */
  maxGuesses: number;
}

// 표준/통용 프리셋:
// - 쉬움: 4칸·6색·12시도(클래식의 너그러운 변형)
// - 보통: 4칸·6색·10시도(현행 기본/클래식)
// - 어려움: 5칸·8색·10시도(Super/Deluxe Mastermind 변형)
// 출처: 위키백과 "Mastermind (board game)" 규칙/변형 절(웹 검증 미수행, 통용 표준 수치 사용).
const EASY: MastermindDifficulty = {
  id: "easy",
  label: "쉬움",
  codeLength: 4,
  colorCount: 6,
  maxGuesses: 12,
};
const NORMAL: MastermindDifficulty = {
  id: "normal",
  label: "보통",
  codeLength: 4,
  colorCount: 6,
  maxGuesses: 10,
};
const HARD: MastermindDifficulty = {
  id: "hard",
  label: "어려움",
  codeLength: 5,
  colorCount: 8,
  maxGuesses: 10,
};

const DIFFICULTIES: readonly MastermindDifficulty[] = [EASY, NORMAL, HARD];

/** 알 수 없는/누락 id를 폴백할 기본 난이도(보통, 현행 기본 동작 보존). */
export const DEFAULT_MASTERMIND_DIFFICULTY_ID = NORMAL.id;

/** 선택 가능한 난이도 프리셋 목록(표시 순서 = 쉬움→보통→어려움). */
export function mastermindDifficultyOptions(): readonly MastermindDifficulty[] {
  return DIFFICULTIES;
}

/**
 * 임의 id를 안전한 난이도 프리셋으로 정규화한다(순수·결정적, 입력 불변).
 * - 목록에 있는 id면 그 프리셋, 아니면 기본(보통)으로 폴백.
 */
export function normalizeMastermindDifficulty(id: string): MastermindDifficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? NORMAL;
}

/** 난이도의 파라미터를 색 비의존 텍스트로 요약한다(예: "코드 4칸 · 색 6가지 · 10시도"). */
export function describeMastermindDifficulty(
  difficulty: MastermindDifficulty,
): string {
  return `코드 ${difficulty.codeLength}칸 · 색 ${difficulty.colorCount}가지 · ${difficulty.maxGuesses}시도`;
}

// 프리셋의 색 가짓수가 팔레트 라벨 범위(A~H)를 넘지 않는지 모듈 로드 시 1회 검증한다
// (정합 깨짐을 조용히 두지 않고 즉시 드러낸다).
for (const d of DIFFICULTIES) {
  if (d.colorCount > MAX_MASTERMIND_COLORS) {
    throw new Error(
      `마스터마인드 난이도 "${d.id}"의 색 가짓수(${d.colorCount})가 팔레트 한도(${MAX_MASTERMIND_COLORS})를 초과합니다.`,
    );
  }
}
