// Presentation helpers for the 플러드 잇(Flood-It) screen. Pure functions only — 색 비의존
// 라벨/기호, 진행/종료 상태 문구, 턴 제한 계산, 무작위 시작 보드 래퍼를 React/DOM에서 분리해
// 단위 테스트 가능하게 한다. 규칙(칠하기·클리어 판정)은 domain(floodIt)에, 무작위 시작 보드는
// application(createScrambledFloodIt)에 위임하고 여기서 재구현하지 않는다(부수효과·시간 없는 표시용 변환).
import { isFloodItSolved, type FloodItState } from "../../domain/floodIt";
import { createScrambledFloodIt } from "../../application/createScrambledFloodIt";
import type { RandomSource } from "../../application/dealCards";

/**
 * 색 인덱스별 표시 모델(색 비의존). 각 색은 고유한 기호(symbol)와 문자 라벨(text)을 가져
 * 색뿐 아니라 기호+라벨로도 구분 가능하다(색각 이상 대응). hex는 시각적 보조용 배경색이다.
 */
interface FloodColor {
  symbol: string;
  text: string;
  hex: string;
}

// 최대 6색까지 지원하는 팔레트. 기호·문자·색이 모두 서로 달라 색에 의존하지 않고도 구분된다.
const PALETTE: ReadonlyArray<FloodColor> = [
  { symbol: "●", text: "A", hex: "#ef4444" },
  { symbol: "■", text: "B", hex: "#3b82f6" },
  { symbol: "▲", text: "C", hex: "#22c55e" },
  { symbol: "◆", text: "D", hex: "#eab308" },
  { symbol: "★", text: "E", hex: "#a855f7" },
  { symbol: "⬢", text: "F", hex: "#f97316" },
];

/** 팔레트가 지원하는 최대 색 개수. */
export const MAX_FLOOD_COLORS = PALETTE.length;

/**
 * 색 인덱스의 색 비의존 라벨(기호+문자)을 반환한다(순수·결정적).
 * @throws 팔레트 범위 밖(0..MAX_FLOOD_COLORS-1) 색이면 throw.
 */
export function colorLabel(color: number): { symbol: string; text: string } {
  const entry = PALETTE[color];
  if (!entry) {
    throw new Error(
      `플러드 잇 색 인덱스 범위 밖: ${color}는 0..${MAX_FLOOD_COLORS - 1} 밖`,
    );
  }
  return { symbol: entry.symbol, text: entry.text };
}

/**
 * 색 인덱스의 시각적 배경색(hex)을 반환한다(색은 보조 단서, 기호/문자가 주 단서).
 * @throws 팔레트 범위 밖 색이면 throw.
 */
export function colorHex(color: number): string {
  const entry = PALETTE[color];
  if (!entry) {
    throw new Error(
      `플러드 잇 색 인덱스 범위 밖: ${color}는 0..${MAX_FLOOD_COLORS - 1} 밖`,
    );
  }
  return entry.hex;
}

/**
 * 보드 크기·색 개수에 따른 합리적 턴 제한을 계산한다(순수·결정적).
 * 도메인/application이 제한값을 제공하지 않으므로 뷰 레이어가 정의한다. 일반적인 그리디
 * 전략으로 클리어 가능하도록 `size * 2 + colorCount`로 넉넉히 잡는다(예: 6×6·5색 → 17수).
 * @throws size·colorCount가 1 이상의 정수가 아니면 throw.
 */
export function floodItMoveLimit(size: number, colorCount: number): number {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`플러드 잇 잘못된 보드 크기: ${size}`);
  }
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new Error(`플러드 잇 잘못된 색 개수: ${colorCount}`);
  }
  return size * 2 + colorCount;
}

/** 클리어/실패/진행중 구분과 `.outcome`/`.hint` 문구. */
export interface FloodItStatus {
  /** 보드 전체가 한 색(클리어). */
  solved: boolean;
  /** 미클리어 + 턴 제한 소진(실패). */
  failed: boolean;
  /** 플레이어용 한국어 상태 문구. */
  message: string;
}

/**
 * 현재 상태의 진행/종료 결과를 사람이 읽는 문구로 만든다(순수·결정적).
 * 클리어(단색) 판정은 domain(isFloodItSolved)에 위임한다. 실패는 미클리어 상태에서 턴 제한을
 * 모두 소진했을 때다.
 */
export function floodItStatus(
  state: FloodItState,
  turnsUsed: number,
  moveLimit: number,
): FloodItStatus {
  const solved = isFloodItSolved(state);
  const failed = !solved && turnsUsed >= moveLimit;
  let message: string;
  if (solved) {
    message = `🎉 클리어! ${turnsUsed}수 만에 보드를 한 색으로 만들었습니다.`;
  } else if (failed) {
    message = `아쉽지만 ${moveLimit}수를 모두 썼습니다 — 보드를 한 색으로 만들지 못했습니다.`;
  } else {
    const left = moveLimit - turnsUsed;
    message = `진행 중 — 사용 ${turnsUsed}/${moveLimit}수, ${left}수 남음. 색을 골라 좌상단 영역을 넓히세요.`;
  }
  return { solved, failed, message };
}

/**
 * application createScrambledFloodIt 위임 래퍼(필요 시 기본 옵션을 묶기 위함, 순수 위임).
 * 무작위·시작부터 단색이 아닌 보드 생성은 application이 책임지고 여기서 재구현하지 않는다.
 */
export function startScrambledFloodIt(
  random: RandomSource,
  opts: { size: number; colorCount: number },
): FloodItState {
  return createScrambledFloodIt(opts.size, opts.colorCount, random);
}
