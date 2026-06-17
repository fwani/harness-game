// Application layer: settles a single 2-player Go-Stop showdown. Depends on domain only.
import type { HwatuCard } from "../domain/hwatu";
import { scoreGoStopTotal } from "../domain/goStopTotal";
import { applyGoBonus } from "../domain/goStopGo";
import { applyGoStopBak, type GoStopFinalScore } from "../domain/goStopBak";

/** 고스톱 한 판에 임하는 플레이어의 입력: 따낸(획득) 화투 패와 「고」 콜 횟수. */
export interface GoStopPlayerInput {
  /** 이 플레이어가 따낸(먹은) 화투 카드 묶음(최소 1장). */
  captured: HwatuCard[];
  /** 외친 「고(Go)」 횟수(0 이상 정수). */
  goCount: number;
}

/** 2인 고스톱 한 판 승부 결과. */
export interface GoStopShowdownResult {
  /** 플레이어 a의 최종 점수(고 보너스 → 박 배수 반영). */
  a: GoStopFinalScore;
  /** 플레이어 b의 최종 점수(고 보너스 → 박 배수 반영). */
  b: GoStopFinalScore;
  /** 승자. 동점은 "draw". */
  winner: "a" | "b" | "draw";
}

/**
 * 한 플레이어의 최종 점수를 계산한다(상대 패 기준 박 적용).
 * - base 점수 = scoreGoStopTotal(captured) (domain 위임).
 * - applyGoBonus(base, goCount) 로 「고」 보너스·배수를 반영한 점수를 base 로 삼고,
 * - applyGoStopBak(captured, opponentCaptured) 로 상대 패 기준 광박/피박 배수를 적용한다.
 *   (도메인 함수만 호출하며 점수 규칙을 재구현하지 않는다 — 두 도메인 결과를 합성만 한다.)
 */
function settlePlayer(
  player: GoStopPlayerInput,
  opponent: GoStopPlayerInput,
): GoStopFinalScore {
  if (!Array.isArray(player.captured) || player.captured.length === 0) {
    throw new Error(
      "settleGoStopShowdown requires each player to have at least one captured card",
    );
  }

  // 1) 카테고리 합산 점수 → 2) 「고」 보너스·배수 반영(음수/비정수 goCount 는 applyGoBonus 가 throw).
  const go = applyGoBonus(scoreGoStopTotal(player.captured), player.goCount);
  // 3) 상대 패 기준 광박/피박 배수 산정(승자 base 는 무시하고 박 배수·플래그만 사용).
  const bak = applyGoStopBak(player.captured, opponent.captured);

  const base = go.total;
  const multiplier = bak.multiplier;
  return {
    base,
    multiplier,
    flags: bak.flags,
    total: base * multiplier,
  };
}

/**
 * 두 플레이어의 따낸 패와 「고」 콜 횟수로 고스톱 한 판 최종 점수를 산출하고 승자를 가린다(순수·결정적).
 *
 * 각 플레이어 점수: scoreGoStopTotal → applyGoBonus → applyGoStopBak(상대 패 기준) 순으로 합성.
 * - 두 플레이어 final.total 을 비교해 큰 쪽이 승자, 같으면 "draw".
 * - 입력 검증: captured 가 비면 throw, goCount 가 음수·비정수면 applyGoBonus 가 throw,
 *   유효하지 않은 카드는 도메인 분류 함수가 throw(별도 검증 추가 없음).
 * - 입력 객체/배열을 변형하지 않는다(도메인 함수가 모두 불변).
 */
export function settleGoStopShowdown(
  a: GoStopPlayerInput,
  b: GoStopPlayerInput,
): GoStopShowdownResult {
  const finalA = settlePlayer(a, b);
  const finalB = settlePlayer(b, a);

  let winner: "a" | "b" | "draw";
  if (finalA.total > finalB.total) {
    winner = "a";
  } else if (finalB.total > finalA.total) {
    winner = "b";
  } else {
    winner = "draw";
  }

  return { a: finalA, b: finalB, winner };
}
