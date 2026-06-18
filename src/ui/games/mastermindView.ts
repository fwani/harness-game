// Presentation helpers for the 마스터마인드(Mastermind) screen. Pure functions only — 색 비의존
// 핀/피드백 라벨, 남은 시도 라벨, 승/패/진행중 판정, 추측 핀 입력 검증을 React/DOM에서 분리해
// 단위 테스트 가능하게 한다. 규칙(채점·승패 판정·합법성)은 domain(mastermind)에, 무작위 비밀 코드·
// 한 추측 진행은 application(playMastermind)에 위임하고 여기서 재구현하지 않는다
// (부수효과·시간·난수 없는 표시용 변환, 입력 불변).
import {
  isLegalMastermindGuess,
  isMastermindLost,
  isMastermindOver,
  isMastermindWon,
  type MastermindFeedback,
  type MastermindState,
  type Peg,
} from "../../domain/mastermind";
import type { MastermindStatus } from "../../application/playMastermind";

/**
 * 색 인덱스별 표시 모델(색 비의존). 각 색은 고유한 기호(symbol)와 문자 라벨(text)을 가져
 * 색뿐 아니라 기호+라벨로도 구분 가능하다(색각 이상 대응). hex는 시각적 보조용 배경색이다.
 */
interface MastermindColor {
  symbol: string;
  text: string;
  hex: string;
}

// 최대 8색까지 지원하는 팔레트. 기호·문자·색이 모두 서로 달라 색에 의존하지 않고도 구분된다.
// (Super/Deluxe 변형의 8색 난이도까지 라벨 A~H로 커버한다.)
const PALETTE: ReadonlyArray<MastermindColor> = [
  { symbol: "●", text: "A", hex: "#ef4444" },
  { symbol: "■", text: "B", hex: "#3b82f6" },
  { symbol: "▲", text: "C", hex: "#22c55e" },
  { symbol: "◆", text: "D", hex: "#eab308" },
  { symbol: "★", text: "E", hex: "#a855f7" },
  { symbol: "⬢", text: "F", hex: "#f97316" },
  { symbol: "⬟", text: "G", hex: "#14b8a6" },
  { symbol: "✚", text: "H", hex: "#ec4899" },
];

/** 팔레트가 지원하는 최대 색 개수. */
export const MAX_MASTERMIND_COLORS = PALETTE.length;

/**
 * 색 인덱스의 색 비의존 라벨(기호+문자)을 반환한다(순수·결정적).
 * @throws 팔레트 범위 밖(0..MAX_MASTERMIND_COLORS-1) 색이면 throw.
 */
export function pegLabel(color: Peg): { symbol: string; text: string } {
  const entry = PALETTE[color];
  if (!entry) {
    throw new Error(
      `마스터마인드 색 인덱스 범위 밖: ${color}는 0..${MAX_MASTERMIND_COLORS - 1} 밖`,
    );
  }
  return { symbol: entry.symbol, text: entry.text };
}

/**
 * 색 인덱스의 시각적 배경색(hex)을 반환한다(색은 보조 단서, 기호/문자가 주 단서).
 * @throws 팔레트 범위 밖 색이면 throw.
 */
export function pegHex(color: Peg): string {
  const entry = PALETTE[color];
  if (!entry) {
    throw new Error(
      `마스터마인드 색 인덱스 범위 밖: ${color}는 0..${MAX_MASTERMIND_COLORS - 1} 밖`,
    );
  }
  return entry.hex;
}

/**
 * 한 추측 채점 결과를 색 비의존 텍스트로 만든다(순수·결정적).
 * exact(정위치+정색)는 채운 핀(●), present(색만 맞음)는 빈 핀(○) 기호로 표기해 black/white peg을
 * 색에 의존하지 않고 구분한다. 예: exact=2, present=1 → "정위치 2(●●) · 색만 1(○)".
 */
export function feedbackLabel(feedback: MastermindFeedback): string {
  const exact = feedback.exact;
  const present = feedback.present;
  const exactSymbols = exact > 0 ? `(${"●".repeat(exact)})` : "";
  const presentSymbols = present > 0 ? `(${"○".repeat(present)})` : "";
  return `정위치 ${exact}${exactSymbols} · 색만 ${present}${presentSymbols}`;
}

/**
 * 남은 시도 수를 사람이 읽는 라벨로 만든다(순수·결정적).
 * 남은 시도 = maxGuesses - guesses.length(음수 방지로 0 하한).
 */
export function remainingGuessesLabel(state: MastermindState): string {
  const remaining = Math.max(0, state.maxGuesses - state.guesses.length);
  return `남은 시도 ${remaining}회 (전체 ${state.maxGuesses}회 중 ${state.guesses.length}회 사용)`;
}

/** 종료/승패 구분과 `.outcome`/`.hint` 문구. */
export interface MastermindStatusView {
  /** 게임 종료 여부(승 또는 패). */
  over: boolean;
  /** 정답을 맞혀 승리했는지. */
  won: boolean;
  /** 플레이어용 한국어 상태 문구. */
  message: string;
}

/**
 * 현재 상태의 승/패/진행중을 사람이 읽는 문구로 만든다(순수·결정적).
 * 승리/패배(시도 한도 소진) 판정은 domain(isMastermindWon/isMastermindLost)에 위임한다.
 * status(application playMastermindGuess가 산출)는 종료 판정의 보조 단서로 함께 본다.
 * - 비밀 코드 공개는 컴포넌트 책임(패배 시): 이 함수는 표시용 문구만 만든다.
 */
export function describeMastermindStatus(
  state: MastermindState,
  status: MastermindStatus,
): MastermindStatusView {
  const won = isMastermindWon(state);
  const lost = isMastermindLost(state);
  const over = won || lost || status !== "playing";
  let message: string;
  if (won) {
    message = `🎉 정답! ${state.guesses.length}번 만에 비밀 코드를 맞혔습니다.`;
  } else if (lost) {
    message = `아쉽지만 ${state.maxGuesses}번의 시도를 모두 썼습니다 — 비밀 코드를 맞히지 못했습니다.`;
  } else {
    message = `진행 중 — ${remainingGuessesLabel(state)}. 색을 골라 ${state.codeLength}칸을 채우고 제출하세요.`;
  }
  return { over, won, message };
}

/** 추측 핀 입력 검증 결과(성공 시 완성된 guess, 실패 시 한국어 사유). */
export type GuessValidation =
  | { ok: true; guess: Peg[] }
  | { ok: false; reason: string };

/**
 * 현재 입력 핀(빈 칸은 null)을 합법 추측으로 검증한다(순수·결정적).
 * - 칸이 덜 찼으면 사유 안내(시도 소진 없이 거부할 수 있게 컴포넌트가 사용).
 * - 다 찼으면 domain isLegalMastermindGuess에 위임해 색 범위·종료 여부를 판정(규칙 재구현 금지).
 */
export function validateGuess(
  state: MastermindState,
  pins: ReadonlyArray<Peg | null>,
): GuessValidation {
  const filled = pins.filter((p) => p !== null).length;
  if (filled < state.codeLength) {
    return {
      ok: false,
      reason: `모든 칸을 채워주세요 — ${state.codeLength}칸 중 ${filled}칸 입력됨.`,
    };
  }
  const guess = pins.map((p) => p as Peg);
  if (!isLegalMastermindGuess(state, guess)) {
    if (isMastermindOver(state)) {
      return { ok: false, reason: "이미 종료된 게임입니다. 새 게임을 시작하세요." };
    }
    return {
      ok: false,
      reason: `색 범위를 벗어난 칸이 있습니다 (0..${state.colorCount - 1} 범위).`,
    };
  }
  return { ok: true, guess };
}
