// Presentation helpers for the 빙고(Bingo) 화면. Pure functions only — 셀 표시 모델·그리드 템플릿·
// 추첨 안내·완성 줄/상태 라벨을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 카드 생성·번호 추첨·마킹·빙고 판정 규칙 자체는 application(playBingo)/domain(bingo)을 호출해 수행하며
// 여기서 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import type { BingoGame } from "../../application/playBingo";
import { countBingoLines, isBingo } from "../../domain/bingo";

/** 한 칸의 표시 모델(색 비의존: 숫자 텍스트 + 마킹 기호/라벨로 구분). */
export interface BingoCellView {
  /** 칸의 번호. */
  value: number;
  /** 마킹 여부. */
  marked: boolean;
  /** 평탄화(row-major) 인덱스. */
  index: number;
  row: number;
  col: number;
  /** 마킹을 색이 아니라 기호로도 표시(마킹=✓, 미표시=""). */
  symbol: string;
  /** 스크린리더용 라벨(번호 + 표시 여부). */
  ariaLabel: string;
}

/**
 * 카드를 셀 표시 모델 배열로 변환한다(순수·결정적, 입력 불변).
 * - 좌표는 기존 보드 렌더와 동일하게 row-major(index = row*size + col)로 계산한다.
 * - 마킹은 색에 의존하지 않도록 기호(✓)와 aria-label("표시됨"/"미표시")로 병행한다.
 */
export function bingoCellViews(game: BingoGame): BingoCellView[] {
  const { card, marked } = game.state;
  const { size, numbers } = card;
  return numbers.map((value, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const isMarked = marked[index] === true;
    return {
      value,
      marked: isMarked,
      index,
      row,
      col,
      symbol: isMarked ? "✓" : "",
      ariaLabel: `번호 ${value} (행 ${row + 1}, 열 ${col + 1}) ${
        isMarked ? "표시됨" : "미표시"
      }`,
    };
  });
}

/** 데스크톱 기준 한 칸의 폭(px). 보드 최대 폭 계산 기준. */
export const BINGO_CELL_PX = 48;

/**
 * 카드 크기에 맞춘 CSS grid-template-columns 값을 만든다(좁은 화면 대응).
 * - `minmax(0, 1fr)` 트랙으로 좁은 폭에서 칸이 줄어들 수 있게 한다.
 */
export function bingoGridTemplate(size: number): string {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`bingoGridTemplate: size must be a positive integer, got ${size}`);
  }
  return `repeat(${size}, minmax(0, 1fr))`;
}

/**
 * 직전에 뽑힌 번호 안내(없으면 시작 안내)를 만든다(순수·결정적).
 */
export function drawSummaryLabel(game: BingoGame): string {
  if (game.lastDrawn === null) {
    return "번호를 추첨해 시작하세요.";
  }
  return `직전 추첨: ${game.lastDrawn}`;
}

/** 남은(미추첨) 번호 수 라벨(순수·결정적). */
export function remainingLabel(game: BingoGame): string {
  return `남은 번호 ${game.remaining.length}`;
}

/** 완성 줄 수 라벨(도메인 countBingoLines 재사용, 규칙 재구현 금지). */
export function bingoLinesLabel(game: BingoGame): string {
  return `완성 줄 ${countBingoLines(game.state)}`;
}

/**
 * 진행/빙고 달성을 한국어 문구로 만든다(순수·결정적).
 * - 빙고 판정은 도메인 isBingo로 산출(규칙 재구현 금지).
 */
export function describeBingoStatus(game: BingoGame): string {
  if (isBingo(game.state)) {
    return "🎉 빙고! 완성했습니다.";
  }
  if (game.remaining.length === 0) {
    return "번호를 모두 뽑았지만 빙고를 만들지 못했습니다.";
  }
  return "번호를 추첨해 카드를 채우고 한 줄을 완성하세요.";
}
