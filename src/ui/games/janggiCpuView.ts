// Presentation helper for the Janggi(장기) vs CPU 모드. 순수·결정적 함수만 둔다 — React
// 컴포넌트를 얇게 유지하고 DOM 없이 단위 테스트할 수 있게 한다. 규칙(합법 수/외통/포획/빅장)은
// application(playJanggi·chooseRandomJanggiMove)·domain을 재사용하며 여기서 재구현하지 않는다.
// gomokuCpuView.ts 패턴을 따른다.
import type { Side } from "../../domain/janggi";
import {
  legalMoves,
  type JanggiState,
} from "../../application/playJanggi";
import { chooseRandomJanggiMove } from "../../application/janggiAi";
import type { JanggiMove } from "../../application/janggiEngine";
import type { RandomSource } from "../../application/dealCards";

/** vs CPU 모드 진영 고정: 사람=초(선), CPU=한. */
export const HUMAN_SIDE: Side = "cho";
export const CPU_SIDE: Side = "han";

/** 화면에 쓰는 진영 라벨(색 비의존, 한자 병기). */
const SIDE_LABEL: Record<Side, string> = { cho: "초(楚)", han: "한(漢)" };

/** 전적 저장용 승자 코드(records.WinSide와 동일 형태). a=초, b=한, draw=무승부. */
export type JanggiWinSide = "a" | "b" | "draw";

/**
 * vs CPU 모드에서 지금이 CPU(한) 차례인지. 종료 상태면 false.
 * - 입력 state를 변형하지 않는다(순수).
 */
export function isCpuTurn(state: JanggiState): boolean {
  return !state.finished && state.next === CPU_SIDE;
}

/**
 * CPU가 둘 한 수를 고른다.
 * - 이미 종료됐거나(finished) 합법 수가 하나도 없으면 null을 반환한다(throw 하지 않는다).
 * - 그 외에는 chooseRandomJanggiMove로 현재 차례(state.next) 진영의 합법 수 하나를 균등 선택한다.
 * - 입력 state를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseCpuJanggiMove(
  state: JanggiState,
  rng: RandomSource,
): JanggiMove | null {
  if (state.finished) {
    return null;
  }
  if (legalMoves(state).length === 0) {
    return null;
  }
  return chooseRandomJanggiMove(state.board, state.next, rng);
}

/**
 * 현재 차례(state.next)가 둘 수 있는 합법 수가 전혀 없을 때(스테일메이트 포함) 상대 승리로
 * 종료된 상태를 만든다. 도메인 외통(isCheckmate)은 직전 수에서 이미 처리되므로 이 경로는
 * "장군은 아니지만 둘 수가 없다" 같은 잔여 케이스를 사람 승리로 매듭짓기 위한 안전장치다.
 * - 입력 state를 변형하지 않는다(새 객체 반환).
 */
export function noMovesOutcome(state: JanggiState): JanggiState {
  const winner: Side = state.next === "cho" ? "han" : "cho";
  return { ...state, finished: true, winner, endReason: "checkmate" };
}

export interface JanggiOutcome {
  /** 종료 여부. */
  finished: boolean;
  /** 무승부(빅장) 여부. */
  draw: boolean;
  /** 화면 표시용 한국어 결과 문구. 미종료면 null. */
  text: string | null;
}

/**
 * 종료 상태를 화면 결과 문구로 매핑한다(순수).
 * - 미종료면 finished=false, text=null.
 * - 빅장이면 무승부.
 * - mode="cpu"면 사람(초)/CPU(한) 관점의 승/패로 표시하고, "local"이면 진영명으로 표시한다.
 * - 색이 아니라 텍스트로 승자를 구분한다.
 */
export function janggiOutcome(
  state: JanggiState,
  mode: "local" | "cpu",
): JanggiOutcome {
  if (!state.finished) {
    return { finished: false, draw: false, text: null };
  }
  if (state.endReason === "bikjang") {
    return { finished: true, draw: true, text: "무승부 (빅장 — 장군 마주보기)" };
  }
  const winner = state.winner!;
  const reason =
    state.endReason === "checkmate" ? "외통수(체크메이트)로 승리" : "상대 장 포획";
  if (mode === "cpu") {
    const text =
      winner === HUMAN_SIDE
        ? `나(초) 승리! 🎉 (${reason})`
        : `CPU(한) 승리 (${reason})`;
    return { finished: true, draw: false, text };
  }
  return {
    finished: true,
    draw: false,
    text: `${SIDE_LABEL[winner]} 승리! 🎉 (${reason})`,
  };
}

/**
 * 종료 상태를 전적 저장용 승자 코드로 매핑한다(순수).
 * - 무승부(빅장)면 "draw", 초 승이면 "a", 한 승이면 "b".
 */
export function janggiWinSide(state: JanggiState): JanggiWinSide {
  if (state.winner === null) {
    return "draw";
  }
  return state.winner === "cho" ? "a" : "b";
}
