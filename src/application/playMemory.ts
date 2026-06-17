// Application layer: 메모리(짝 맞추기, Concentration) 무작위 셔플 + 단일 플레이어 한 판 진행.
// domain(memoryMatch)과 RandomSource 포트에만 의존한다. infrastructure(Math.random) 직접 사용 금지 —
// 무작위는 반드시 RandomSource로 주입한다(playMinesweeper와 동일 정책).
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
 * - 짝 개수·status="down" 불변, 각 value 정확히 2장 유지(value 배치만 셔플).
 * - 원본 불변, 결정적: 같은 random이면 같은 결과(shuffle은 RandomSource에만 의존).
 */
export function shuffleMemoryBoard(pairCount: number, random: RandomSource): MemoryBoard {
  // createMemoryBoard가 pairCount 유효성(양의 정수)을 검증하고 [0,0,1,1,...] 보드를 만든다.
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
 * - 반환에 이번 시도가 매치였는지(matched) 포함.
 * - 같은 인덱스 두 번·범위 밖·이미 matched/up 카드면 도메인 규칙(flipUp)대로 throw.
 * - 이미 over=true인 상태에서 호출하면 throw.
 * - 입력 state 불변(도메인 flipUp/resolveFlips가 새 보드를 반환).
 */
export function playMemoryAttempt(
  state: MemoryGameState,
  firstIndex: number,
  secondIndex: number,
): { state: MemoryGameState; matched: boolean } {
  if (state.over) {
    throw new Error("playMemoryAttempt: game is already over");
  }
  if (firstIndex === secondIndex) {
    throw new Error(`playMemoryAttempt: indices must differ, got ${firstIndex} twice`);
  }
  // 도메인 flipUp이 범위 밖·이미 up/matched 카드를 throw로 거른다(자체 검증 중복 금지).
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
