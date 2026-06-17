// Presentation helpers for the 원카드(One Card) screen. Pure functions only — 색 비의존 카드
// 라벨/기호, 손패 합법 판정 뷰, 차례/승자 라벨, CPU 자동 턴 진행과 그 로그 문구를 React/DOM에서
// 분리해 단위 테스트 가능하게 한다. 규칙·합법성·승자 판정·무작위 선택은 domain(oneCard) +
// application(playOneCard)에만 위임하고 여기서 재구현하지 않는다(부수효과·시간·직접 난수 없음, 입력 불변).
import type { Card, Suit } from "../../domain/card";
import {
  findOneCardWinner,
  isLegalOneCardPlay,
  topDiscard,
  type OneCardState,
} from "../../domain/oneCard";
import {
  playOneCardCpuTurn,
  type OneCardTurnAction,
} from "../../application/playOneCard";
import type { RandomSource } from "../../application/dealCards";

/** 사람(나)·CPU 플레이어 인덱스. startOneCardGame은 0번을 선(사람)으로 둔다. */
export const ONE_CARD_HUMAN = 0;
export const ONE_CARD_CPU = 1;

/**
 * 무늬별 표시 모델(색 비의존). 각 무늬는 고유한 기호(symbol, ♠♥♦♣)와 한국어 이름(name)을 가져
 * 색뿐 아니라 기호+이름으로도 구분된다(색각 이상 대응). red는 시각적 보조용 색 단서일 뿐이다.
 */
const SUIT_VIEW: Record<Suit, { symbol: string; name: string; red: boolean }> = {
  spades: { symbol: "♠", name: "스페이드", red: false },
  hearts: { symbol: "♥", name: "하트", red: true },
  diamonds: { symbol: "♦", name: "다이아몬드", red: true },
  clubs: { symbol: "♣", name: "클로버", red: false },
};

/** 한 장 카드의 색 비의존 표시 모델. */
export interface OneCardCardView {
  /** 컴팩트 표시용 문자열(무늬 기호+숫자), 예: "♥7". */
  symbol: string;
  /** 스크린리더/aria용 한국어 라벨(무늬 이름+숫자), 예: "하트 7". */
  label: string;
  /** 시각적 보조 색 단서(하트/다이아=빨강). 기호/이름이 주 단서다. */
  red: boolean;
}

/** 카드를 색 비의존 표시 모델로 변환한다(순수·결정적). */
export function oneCardCardView(card: Card): OneCardCardView {
  const suit = SUIT_VIEW[card.suit];
  return {
    symbol: `${suit.symbol}${card.rank}`,
    label: `${suit.name} ${card.rank}`,
    red: suit.red,
  };
}

/** 손패 카드 한 장의 뷰(표시 + 현재 합법 여부). */
export interface OneCardHandCardView {
  card: Card;
  /** 지금(버림더미 맨 위 기준) 낼 수 있는 합법 카드인지 — domain isLegalOneCardPlay 위임. */
  legal: boolean;
  /** 색 비의존 한국어 라벨(무늬 이름+숫자). */
  label: string;
  /** 컴팩트 표시용 기호 문자열(무늬 기호+숫자). */
  symbol: string;
}

/**
 * player의 손패를 버림더미 맨 위 기준 합법 여부와 함께 뷰 모델로 만든다(순수·결정적).
 * 합법성은 domain isLegalOneCardPlay(topDiscard(state), card)에 위임한다(규칙 재구현 금지).
 * @throws player 인덱스가 손패 범위를 벗어나면 throw(조용히 무시 금지).
 */
export function oneCardHandView(
  state: OneCardState,
  player: number,
): OneCardHandCardView[] {
  const hand = state.hands[player];
  if (hand === undefined) {
    throw new Error(`손패 범위를 벗어난 플레이어 인덱스입니다: ${player}`);
  }
  const top = topDiscard(state);
  return hand.map((card) => {
    const view = oneCardCardView(card);
    return {
      card,
      legal: isLegalOneCardPlay(top, card),
      label: view.label,
      symbol: view.symbol,
    };
  });
}

/** 현재 차례를 사람/CPU 안내 문구로(순수·결정적). 승자가 있으면 차례 안내는 무의미하므로 종료 안내. */
export function oneCardTurnLabel(state: OneCardState): string {
  if (findOneCardWinner(state) !== null) {
    return "게임 종료";
  }
  return state.currentPlayer === ONE_CARD_HUMAN
    ? "지금은 당신(나) 차례입니다."
    : "지금은 CPU 차례입니다.";
}

/**
 * 승자를 사람/CPU 안내 문구로(순수·결정적). 승자는 domain findOneCardWinner에 위임한다.
 * 아직 승자가 없으면 진행 중 문구를 반환한다.
 */
export function oneCardOutcomeLabel(state: OneCardState): string {
  const winner = findOneCardWinner(state);
  if (winner === ONE_CARD_HUMAN) {
    return "🎉 당신이 손패를 모두 비워 이겼습니다!";
  }
  if (winner !== null) {
    return "😢 CPU가 손패를 모두 비워 이겼습니다.";
  }
  return "진행 중 — 합법 카드를 내거나 한 장 뽑으세요.";
}

/** CPU 한 동작(낸 카드/뽑음/패스)을 한국어 로그 문구로(순수·결정적). */
export function oneCardActionSummary(action: OneCardTurnAction): string {
  switch (action.kind) {
    case "play":
      // 낸 카드는 버림더미로 공개되므로 무엇을 냈는지 표시한다.
      return `CPU가 ${oneCardCardView(action.card).label} 카드를 냈습니다.`;
    case "draw":
      // 뽑은 카드는 CPU 손패(비공개)로 들어가므로 무엇인지는 드러내지 않는다.
      return "CPU가 낼 카드가 없어 한 장 뽑았습니다.";
    default:
      return "CPU가 낼 카드도 뽑을 카드도 없어 차례를 넘겼습니다.";
  }
}

/** playOneCardCpuTurns 결과: 진행한 다음 상태 + CPU 동작 한국어 로그. */
export interface OneCardCpuTurnsResult {
  state: OneCardState;
  log: string[];
}

/**
 * 현재 차례가 CPU인 동안 application playOneCardCpuTurn을 반복 호출해, 사람(P0) 차례가 되거나
 * 승자가 날 때까지 진행하고 각 동작을 한국어 로그로 누적한다(입력 state 불변, random 외 비변형).
 * - 규칙·합법성·승자 판정·무작위 선택은 application/domain에 위임한다(재구현 금지).
 * - "pass"(재셔플 후에도 뽑을 카드 없음)는 차례를 넘기지 못하므로, 무한 루프를 막기 위해 즉시 멈춘다.
 * 결정적: 같은 random 시퀀스·같은 입력이면 항상 동일 결과.
 */
export function playOneCardCpuTurns(
  state: OneCardState,
  random: RandomSource,
): OneCardCpuTurnsResult {
  let current = state;
  const log: string[] = [];
  while (
    findOneCardWinner(current) === null &&
    current.currentPlayer !== ONE_CARD_HUMAN
  ) {
    const result = playOneCardCpuTurn(current, random);
    log.push(oneCardActionSummary(result.action));
    current = result.state;
    if (result.action.kind === "pass") {
      // 패스는 차례를 넘기지 못한다 — 더 진행하면 같은 CPU 차례가 무한 반복된다.
      break;
    }
  }
  return { state: current, log };
}
