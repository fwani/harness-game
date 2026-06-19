// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 고스톱(Go-Stop)의 「고(Go)」 콜 횟수에 따른 보너스 점수·배수 적용.
// 카드/상태가 아닌 점수(number)·고 횟수(number)만 입력으로 받는 결정적 산술 함수다.
// 난수·시간·식별자 생성 없이 입력만으로 결정적이며, 입력값을 변형하지 않는다.

/**
 * 「고(Go)」를 외칠 수 있는 최소 점수(승점). 표준 고스톱에서 「고/스톱」 선택은 "날 수 있는 점수"
 * (기본 3점)에 도달한 플레이어만 할 수 있다. 이 점수 미만이면 「고」를 외칠 수 없다.
 */
export const GO_MIN_SCORE = 3;

/**
 * 현재 카드 기본 점수(base)로 「고」를 외칠 수 있는지 판정한다(순수). base가 승점(GO_MIN_SCORE)
 * 이상일 때만 true. base는 0 이상 정수여야 하며 음수·비정수면 throw.
 * (카드 점수와 무관하게 「고」로 일방 승리하던 결함 방지 — 「고」는 날 수 있는 점수 도달 후에만.)
 */
export function canCallGo(base: number): boolean {
  if (!Number.isInteger(base) || base < 0) {
    throw new Error("canCallGo requires base to be a non-negative integer");
  }
  return base >= GO_MIN_SCORE;
}

/** 「고(Go)」 콜 보너스·배수를 적용한 결과. */
export interface GoBonusResult {
  /** 고 선언 시점의 기본 점수 (입력 그대로) */
  base: number;
  /** 외친 고 횟수 (입력 그대로) */
  goCount: number;
  /** 고 횟수에 따른 가산 점수 */
  bonus: number;
  /** 고 횟수에 따른 배수 (1, 2, 4, ...) */
  multiplier: number;
  /** (base + bonus) * multiplier */
  total: number;
}

/**
 * 고스톱 「고(Go)」 콜 횟수에 따른 보너스 점수·배수를 적용한 최종 점수를 계산한다(순수, 결정적).
 *
 * 고(Go) 규칙(표준 규칙으로 고정):
 *   - bonus = goCount — 고를 외칠 때마다 +1점 가산(1고 +1, 2고 +2, …, 누적 가산점 = 고 횟수).
 *   - multiplier = 2 ** max(0, goCount - 2) — 3고부터 매 고마다 ×2 누적
 *     (0~2고는 ×1, 3고 ×2, 4고 ×4, 5고 ×8 …).
 *   - total = (base + bonus) * multiplier.
 *
 * 경계/불변식:
 *   - goCount === 0 → bonus 0, multiplier 1, total === base.
 *   - base === 0 이어도 규칙대로 계산(별도 특례 없음).
 *   - base는 0 이상 정수, goCount는 0 이상 정수여야 하며 음수·비정수면 throw.
 *   - 인자는 원시값이라 입력 변형은 자명히 없다.
 */
export function applyGoBonus(base: number, goCount: number): GoBonusResult {
  if (!Number.isInteger(base) || base < 0) {
    throw new Error("applyGoBonus requires base to be a non-negative integer");
  }
  if (!Number.isInteger(goCount) || goCount < 0) {
    throw new Error("applyGoBonus requires goCount to be a non-negative integer");
  }

  const bonus = goCount;
  const multiplier = 2 ** Math.max(0, goCount - 2);
  const total = (base + bonus) * multiplier;

  return { base, goCount, bonus, multiplier, total };
}
