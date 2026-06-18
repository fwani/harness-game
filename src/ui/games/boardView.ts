// Presentation helper for the grid boards (오목/바둑/장기/오델로). Pure function only — keeps the
// responsive sizing logic in one testable place so every board behaves the same on narrow screens.
//
// 좁은 폭(예: 360px 휴대폰)에서 보드가 화면 밖으로 잘리지 않게 한다(#202). 셀은 CSS에서
// `width:100% + aspect-ratio:1`로 트랙을 채우고, 트랙은 `minmax(0, 1fr)`로 0까지 줄어들 수 있다.
// 데스크톱에서는 기존과 동일한 칸 크기를 유지하도록 보드 최대 폭을 `열 수 × 셀 폭`으로 캡한다.
import type { CSSProperties } from "react";

/** 데스크톱 기준 한 칸의 폭(px). 보드 최대 폭 계산 기준이며 기존 .cell 크기와 동일. */
export const BOARD_CELL_PX = 26;

/**
 * 열 개수에 맞춘 보드 그리드 스타일을 만든다.
 * - `gridTemplateColumns`: `minmax(0, 1fr)` 트랙으로 좁은 폭에서 칸이 줄어들 수 있게 한다.
 * - `maxWidth`: `열 수 × 셀 폭`으로 캡해 넓은 화면에서는 기존 칸 크기를 유지한다.
 *   실제 폭은 CSS `.board { width: 100% }`와 함께 컨테이너 폭으로 클램프된다.
 */
export function boardGridStyle(cols: number, cellPx = BOARD_CELL_PX): CSSProperties {
  if (!Number.isInteger(cols) || cols < 1) {
    throw new Error(`boardGridStyle: cols must be a positive integer, got ${cols}`);
  }
  return {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    maxWidth: `${cols * cellPx}px`,
  };
}

/** 격자 보드의 한 칸 좌표(`board[y][x]`와 일치: x=열, y=행). */
export interface Cell {
  x: number;
  y: number;
}

/** 격자 보드 치수(cols=열 수, rows=행 수). */
export interface BoardDims {
  cols: number;
  rows: number;
}

/** 값을 [0, max] 범위로 클램프(래핑 없이 가장자리 유지). */
function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

/**
 * 로빙 탭인덱스 격자 보드의 키보드 이동을 계산한다(순수 함수).
 * - ArrowUp/Down/Left/Right: 한 칸 이동, 가장자리에서는 클램프(래핑 없음).
 * - Home/End: 같은 행의 처음/끝 열로 이동.
 * - PageUp/PageDown: 같은 열의 처음/끝 행으로 이동.
 * - 그 외 키: null(호출 측에서 기본 동작 유지).
 *
 * 좌표계는 보드 렌더(`board[y][x]`)와 동일하게 x=열, y=행이다.
 */
export function nextBoardFocus(
  current: Cell,
  key: string,
  dims: BoardDims,
): Cell | null {
  const maxX = dims.cols - 1;
  const maxY = dims.rows - 1;
  switch (key) {
    case "ArrowLeft":
      return { x: clamp(current.x - 1, maxX), y: current.y };
    case "ArrowRight":
      return { x: clamp(current.x + 1, maxX), y: current.y };
    case "ArrowUp":
      return { x: current.x, y: clamp(current.y - 1, maxY) };
    case "ArrowDown":
      return { x: current.x, y: clamp(current.y + 1, maxY) };
    case "Home":
      return { x: 0, y: current.y };
    case "End":
      return { x: maxX, y: current.y };
    case "PageUp":
      return { x: current.x, y: 0 };
    case "PageDown":
      return { x: current.x, y: maxY };
    default:
      return null;
  }
}
