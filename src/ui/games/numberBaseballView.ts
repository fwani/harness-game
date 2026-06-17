// Presentation helpers for the 숫자야구(Number Baseball) screen. Pure functions only —
// 화면용 입력 파싱/표시를 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 판정 규칙 자체는 domain/application을 호출해 수행하며 여기서 재구현하지 않는다.
// 이 파일은 "플레이어용 한국어 표시·사유 메시지" 생성과 입력 파싱만 담당한다.
import type { BaseballResult } from "../../domain/numberBaseball";

const DEFAULT_LENGTH = 3;

/**
 * S/B 판정 결과를 플레이어용 한국어 문자열로 표시한다(순수·결정적).
 * - 전부 스트라이크(strikes === length)면 "정답!".
 * - 스트라이크·볼이 모두 0이면 "아웃".
 * - 그 외에는 "{n}S {m}B" 형식(예: "1S 2B").
 */
export function describeBaseballResult(
  result: BaseballResult,
  length: number = DEFAULT_LENGTH,
): string {
  if (result.strikes >= length) {
    return "정답!";
  }
  if (result.strikes === 0 && result.balls === 0) {
    return "아웃";
  }
  return `${result.strikes}S ${result.balls}B`;
}

/** 추측 입력 파싱 결과: 성공이면 digits, 실패면 한국어 사유. */
export type ParsedGuess = { digits: number[] } | { error: string };

/**
 * 문자열 입력을 숫자 배열로 파싱·검증한다(순수·결정적, throw 없이 사유 반환).
 * - 공백은 무시한다("1 2 3" → [1,2,3]).
 * - 0–9 이외 문자가 있으면: "0–9 사이 숫자만 입력하세요."
 * - 자리 수가 length와 다르면: "{length}자리 숫자를 입력하세요." (입력 자리 수 안내 포함)
 * - 같은 숫자가 중복되면: "서로 다른 숫자를 입력하세요(중복 불가)."
 * 성공 시 결과는 항상 isValidBaseballNumber(digits, length) === true 를 만족한다.
 */
export function parseGuessInput(
  raw: string,
  length: number = DEFAULT_LENGTH,
): ParsedGuess {
  const compact = raw.replace(/\s+/g, "");
  if (compact === "") {
    return { error: `${length}자리 숫자를 입력하세요.` };
  }
  const chars = [...compact];
  if (chars.some((c) => c < "0" || c > "9")) {
    return { error: "0–9 사이 숫자만 입력하세요." };
  }
  const digits = chars.map((c) => Number(c));
  if (digits.length !== length) {
    return {
      error: `${length}자리 숫자를 입력하세요. (입력: ${digits.length}자리)`,
    };
  }
  if (new Set(digits).size !== digits.length) {
    return { error: "서로 다른 숫자를 입력하세요(중복 불가)." };
  }
  return { digits };
}
