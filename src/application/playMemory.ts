// Application layer: 메모리(짝 맞추기, Concentration) 한 판 진행.
// domain(memoryMatch)과 RandomSource 포트(dealCards)에만 의존한다.
// 무작위 셔플은 도메인이 아니라 여기서 RandomSource 주입으로 처리한다(infrastructure/ui 의존 금지).
import {
  createMemoryBoard,
  flipUp,
  resolveFlips,
  countMatchedPairs,
  isMemoryGameOver,
  type MemoryBoard,
} from "../domain/memoryMatch";
import { shuffle, type RandomSource } from "./dealCards";

export interface MemoryGameState {
  /** 진행 중 보드(섞인 상태). */
  board: MemoryBoard;
  /** 두 장 뒤집어 판정한 횟수(시도 수). */
  attempts: number;
  /** 완성된 짝 수. */
  matchedPairs: number;
  /** 모든 짝 완성(클리어) 여부. */
  over: boolean;
}

/**
 * createMemoryBoard(pairCount)로 만든 카드의 value 배열을 Fisher–Yates(shuffle)로 섞어
 * 모든 카드가 "down"인 새 보드를 반환한다.
 * - 짝 개수·status="down" 불변, 각 value 정확히 2장 유지(셔플은 순열이므로 보존됨).
 * - 결정적: 같은 random이면 같은 결과. 원본/입력 불변(createMemoryBoard·shuffle 모두 새 인스턴스 반환).
 * - pairCount 검증은 도메인 createMemoryBoard에 위임한다(양의 정수 아니면 throw).
 */
export function shuffleMemoryBoard(pairCount: number, random: RandomSource): MemoryBoard {
  const base = createMemoryBoard(pairCount);
  const shuffledValues = shuffle(
    base.map((card) => card.value),
    random,
  );
  return shuffledValues.map((value) => ({ value, status: "down" as const }));
}

/** 새 한 판 시작: 섞은 보드 + attempts=0 + matchedPairs=0 + over=false. */
export function startMemoryGame(pairCount: number, random: RandomSource): MemoryGameState {
  return {
    board: shuffleMemoryBoard(pairCount, random),
    attempts: 0,
    matchedPairs: 0,
    over: false,
  };
}

/**
 * 한 시도(두 장 뒤집기)를 진행한다: firstIndex→flipUp, secondIndex→flipUp 후 resolveFlips.
 * - attempts 1 증가, 매치면 matchedPairs 반영(countMatchedPairs), isMemoryGameOver로 over 갱신.
 * - 이번 시도가 매치였는지(matched)를 함께 반환한다.
 * - 상태 전이는 도메인 flipUp/resolveFlips만으로 처리한다(자체 매치 판정 중복 금지).
 *   미스매치면 두 카드가 다시 "down"으로 돌아간 보드를 반환한다(resolveFlips 책임).
 * - 같은 인덱스 두 번·범위 밖·이미 matched/up 카드면 도메인 규칙대로 throw(flipUp이 검증).
 * - 이미 over=true인 상태에서 호출하면 throw(동작 고정).
 * - 입력 state 불변(도메인 함수가 새 보드를 반환하므로 원본을 변형하지 않는다).
 */
export function playMemoryAttempt(
  state: MemoryGameState,
  firstIndex: number,
  secondIndex: number,
): { state: MemoryGameState; matched: boolean } {
  if (state.over) {
    throw new Error("playMemoryAttempt: game is already over");
  }
  const afterFirst = flipUp(state.board, firstIndex);
  const afterSecond = flipUp(afterFirst, secondIndex);
  const { board, matched } = resolveFlips(afterSecond);
  return {
    state: {
      board,
      attempts: state.attempts + 1,
      matchedPairs: countMatchedPairs(board),
      over: isMemoryGameOver(board),
    },
    matched,
  };
}
