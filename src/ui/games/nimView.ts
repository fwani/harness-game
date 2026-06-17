// Presentation helpers for the 님(Nim, 표준 플레이) vs CPU 화면. Pure functions only —
// 더미 표시(돌 개수·기호)·합법 수 버튼 데이터·차례/승자 문구·접근성 라벨을 React/DOM에서 분리해
// 단위 테스트할 수 있게 한다. 합법 수 열거·착수·승자 판정은 domain(nim)/application(playNim)을
// 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변, 결정적).
import type { NimPiles, NimPlayer } from "../../domain/nim";
import { legalNimMoves } from "../../domain/nim";

/** 플레이어 라벨을 만드는 함수(모드별로 "사람"/"CPU" 또는 "나"/"CPU" 등). */
export type NimLabeler = (player: NimPlayer) => string;

/** 라벨러를 안 주면 쓰는 기본값(사람=1, CPU=2). */
export const defaultNimLabel: NimLabeler = (player) => (player === 1 ? "사람" : "CPU");

/** 한 판 결과를 공통 전적 저장소의 WinSide("a"=1 승/"b"=2 승/"draw")로 표현한 값. */
export type NimWinSide = "a" | "b" | "draw";

/** 더미 한 칸의 표시·조작 데이터(돌 수 + 가져갈 수 있는 개수 목록). */
export interface NimPileView {
  /** 0-기반 더미 인덱스. */
  pile: number;
  /** 남은 돌 수. */
  stones: number;
  /** 가져갈 수 있는 개수 목록(1..stones), 합법 수(legalNimMoves) 기준. 빈 더미면 빈 배열. */
  counts: number[];
}

/**
 * 더미별 표시·조작 데이터를 만든다. counts는 도메인 legalNimMoves를 그 더미로 필터링해 얻는다
 * (합법 수를 UI에서 재계산하지 않음, 입력 piles 불변).
 */
export function nimPileViews(piles: NimPiles): NimPileView[] {
  const legal = legalNimMoves(piles);
  return piles.map((stones, pile) => ({
    pile,
    stones,
    counts: legal.filter((move) => move.pile === pile).map((move) => move.count),
  }));
}

/** 더미 라벨("더미 1" 등, 1-기반). 색에 의존하지 않는 식별자. */
export function nimPileLabel(pile: number): string {
  return `더미 ${pile + 1}`;
}

/** 더미의 돌을 색이 아닌 기호로 표시한다(예: 3 → "●●●", 0 → "—"). */
export function nimStonesSymbol(stones: number): string {
  if (!Number.isFinite(stones) || stones <= 0) {
    return "—";
  }
  return "●".repeat(stones);
}

/** 진행 중 차례 안내 문구(다음에 둘 플레이어). */
export function nimTurnLabel(next: NimPlayer, label: NimLabeler = defaultNimLabel): string {
  return `${label(next)} 차례 · 더미를 골라 가져갈 돌 개수를 누르세요`;
}

/**
 * 종료 시 승자 문구. 표준 플레이 님엔 무승부가 없지만(마지막 돌을 가져간 쪽이 승),
 * winner=null이면 방어적으로 무승부 문구를 돌려준다.
 */
export function nimOutcomeLabel(
  winner: NimPlayer | null,
  label: NimLabeler = defaultNimLabel,
): string {
  return winner === null ? "무승부 🤝" : `${label(winner)} 승리! 🎉`;
}

/** 승자를 공통 전적 저장소의 WinSide로 매핑한다(1=a/2=b/null=draw). */
export function nimWinSide(winner: NimPlayer | null): NimWinSide {
  return winner === null ? "draw" : winner === 1 ? "a" : "b";
}

/** "가져가기" 버튼 한 칸의 접근성 라벨(더미·개수). */
export function nimMoveAriaLabel(pile: number, count: number): string {
  return `${nimPileLabel(pile)}에서 ${count}개 가져가기`;
}

/** 더미 한 칸의 접근성 라벨(더미·남은 돌 수). */
export function nimPileAriaLabel(pile: number, stones: number): string {
  return `${nimPileLabel(pile)} · 남은 돌 ${stones}개`;
}

/** 직전 한 수를 사람이 읽는 문구로 만든다(예: "사람: 더미 2에서 3개"). */
export function nimMoveSummary(
  player: NimPlayer,
  pile: number,
  count: number,
  label: NimLabeler = defaultNimLabel,
): string {
  return `${label(player)}: ${nimPileLabel(pile)}에서 ${count}개`;
}
