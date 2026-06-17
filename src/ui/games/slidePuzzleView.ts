// Presentation helpers for the slide puzzle (15-퍼즐) screen. Pure functions only — 셀 라벨/상태
// 매핑·이동 횟수·클리어 표시·크기 라벨을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 합법 수 열거·적용·완성 판정 규칙 자체는 domain(slidePuzzle)/application(createShuffledSlidePuzzle)을
// 호출해 수행하며 여기서 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import type { SlidePuzzleState } from "../../domain/slidePuzzle";
import { legalSlidePuzzleMoves } from "../../domain/slidePuzzle";

/** 화면에 제공할 크기 선택지(N×N). 기본은 4(→15-퍼즐). */
export const SLIDE_PUZZLE_SIZES = [3, 4] as const;
export type SlidePuzzleSize = (typeof SLIDE_PUZZLE_SIZES)[number];
export const DEFAULT_SLIDE_PUZZLE_SIZE: SlidePuzzleSize = 4;

/** 크기를 "N×N" 텍스트로 표시(순수·결정적). */
export function sizeLabel(size: number): string {
  return `${size}×${size}`;
}

/** 한 칸의 표시 모델(색 비의존: 숫자 텍스트·라벨로 구분). */
export interface SlidePuzzleCellView {
  /** 타일 값. 0은 빈 칸. */
  tile: number;
  /** 평탄화(row-major) 인덱스. */
  index: number;
  row: number;
  col: number;
  /** 빈 칸 여부. */
  isBlank: boolean;
  /** 빈 칸과 인접해 밀 수 있는(합법 수) 타일 여부. 빈 칸은 false. */
  movable: boolean;
  /** 화면 표시 텍스트(빈 칸은 ""). */
  label: string;
  /** 스크린리더용 라벨. */
  ariaLabel: string;
}

/**
 * 보드를 셀 표시 모델 배열로 변환한다(순수·결정적, 입력 불변).
 * - movable은 도메인 `legalSlidePuzzleMoves`가 돌려준 타일만 true로 표시한다(규칙 재구현 금지).
 * - 좌표는 기존 보드 렌더와 동일하게 row-major(index = row*size + col)로 계산한다.
 */
export function slidePuzzleCells(state: SlidePuzzleState): SlidePuzzleCellView[] {
  const { tiles, size } = state;
  const movableTiles = new Set(legalSlidePuzzleMoves(state).map((m) => m.tile));
  return tiles.map((tile, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const isBlank = tile === 0;
    const movable = !isBlank && movableTiles.has(tile);
    return {
      tile,
      index,
      row,
      col,
      isBlank,
      movable,
      label: isBlank ? "" : String(tile),
      ariaLabel: isBlank
        ? `빈 칸 (행 ${row + 1}, 열 ${col + 1})`
        : `타일 ${tile}${movable ? " (밀 수 있음)" : ""} (행 ${row + 1}, 열 ${col + 1})`,
    };
  });
}

/** 진행 상태 구분(진행 중·클리어). */
export type SlidePuzzleStatusKind = "playing" | "solved";

export interface SlidePuzzleStatus {
  kind: SlidePuzzleStatusKind;
  message: string;
}

/**
 * 클리어 여부로 플레이어용 한국어 상태 메시지를 만든다(순수·결정적).
 * 완성 판정은 호출부에서 도메인 `isSlidePuzzleSolved`로 산출해 넘긴다.
 */
export function describeSlidePuzzleStatus(solved: boolean): SlidePuzzleStatus {
  if (solved) {
    return { kind: "solved", message: "🎉 퍼즐을 완성했습니다! 클리어!" };
  }
  return {
    kind: "playing",
    message: "빈 칸과 맞닿은 타일을 눌러 밀어 1부터 순서대로 맞추세요.",
  };
}

/** 이동 횟수 라벨(순수·결정적). */
export function moveCountLabel(moves: number): string {
  return `이동 횟수 ${moves}`;
}
