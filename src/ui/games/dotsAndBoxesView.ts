// Presentation helpers for the 도트 앤 박스(Dots and Boxes) screen. Pure functions only —
// 격자(점·변·박스)의 화면 배치, 상태 문구(차례·보너스 턴·점수·승자/무승부)를 React/DOM에서
// 분리해 단위 테스트할 수 있게 한다. 변 긋기·완성 박스·점수·승부 규칙은 domain(dotsAndBoxes)/
// application(playDotsAndBoxes)을 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import type { DotsBoard, DotsBoxOwner, DotsEdge, DotsPlayer } from "../../domain/dotsAndBoxes";
import { countDotsBoxes } from "../../domain/dotsAndBoxes";

/** 화면용 격자 한 칸의 종류. dot=점, hedge/vedge=수평/수직 변, box=박스. */
export type DotsCellKind = "dot" | "hedge" | "vedge" | "box";

/** 점·변·박스가 교차 배치되는 표시 격자(2*rows+1 × 2*cols+1)의 한 칸. */
export interface DotsGridCell {
  kind: DotsCellKind;
  /** 표시 격자 좌표(0-기반, 행 우선). */
  gridRow: number;
  gridCol: number;
  /** 변 칸이면 도메인 변 좌표(없으면 undefined). */
  edge?: DotsEdge;
  /** 변 칸이면 이미 그어졌는지 여부. */
  drawn?: boolean;
  /** 박스 칸이면 소유자(없으면 null). */
  owner?: DotsBoxOwner;
}

/**
 * 보드를 점·변·박스가 교차하는 표시 격자(행 우선)로 펼친다(순수·결정적, 입력 불변).
 * - 표시 격자는 (2*rows+1) 행 × (2*cols+1) 열이다.
 *   - 짝수행·짝수열 → 점(dot)
 *   - 짝수행·홀수열 → 수평 변(hedge): { orientation:"h", row=gr/2, col=(gc-1)/2 }
 *   - 홀수행·짝수열 → 수직 변(vedge): { orientation:"v", row=(gr-1)/2, col=gc/2 }
 *   - 홀수행·홀수열 → 박스(box): boxes[(gr-1)/2][(gc-1)/2]
 * 반환 순서가 표시 격자의 자동 배치 순서(행 우선)와 일치하므로 그대로 렌더할 수 있다.
 */
export function dotsGridCells(board: DotsBoard): DotsGridCell[] {
  const cells: DotsGridCell[] = [];
  const displayRows = board.rows * 2 + 1;
  const displayCols = board.cols * 2 + 1;
  for (let gr = 0; gr < displayRows; gr += 1) {
    for (let gc = 0; gc < displayCols; gc += 1) {
      const rowEven = gr % 2 === 0;
      const colEven = gc % 2 === 0;
      if (rowEven && colEven) {
        cells.push({ kind: "dot", gridRow: gr, gridCol: gc });
      } else if (rowEven && !colEven) {
        const edge: DotsEdge = { orientation: "h", row: gr / 2, col: (gc - 1) / 2 };
        cells.push({ kind: "hedge", gridRow: gr, gridCol: gc, edge, drawn: board.edges.h[edge.row]![edge.col]! });
      } else if (!rowEven && colEven) {
        const edge: DotsEdge = { orientation: "v", row: (gr - 1) / 2, col: gc / 2 };
        cells.push({ kind: "vedge", gridRow: gr, gridCol: gc, edge, drawn: board.edges.v[edge.row]![edge.col]! });
      } else {
        const row = (gr - 1) / 2;
        const col = (gc - 1) / 2;
        cells.push({ kind: "box", gridRow: gr, gridCol: gc, owner: board.boxes[row]![col]! });
      }
    }
  }
  return cells;
}

/** 표시 격자의 한 축(박스 count개)에 대한 CSS grid-template 문자열을 만든다(점 폭·변 길이 교차). */
export const DOTS_DOT_PX = 16;
export const DOTS_EDGE_PX = 40;

export function dotsGridTemplate(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`dotsGridTemplate: count must be a positive integer, got ${count}`);
  }
  const parts: string[] = [`${DOTS_DOT_PX}px`];
  for (let i = 0; i < count; i += 1) {
    parts.push(`${DOTS_EDGE_PX}px`, `${DOTS_DOT_PX}px`);
  }
  return parts.join(" ");
}

/** 플레이어 라벨을 만드는 함수(모드별로 "P1"/"P2" 또는 "나"/"CPU" 등). */
export type DotsLabeler = (player: DotsPlayer) => string;

/** 양측 완성 박스 수를 사람이 읽는 점수 문구로 만든다(색 비의존, 도메인 countDotsBoxes 재사용). */
export function dotsScoreLabel(board: DotsBoard, label: DotsLabeler): string {
  return `${label(1)} ${countDotsBoxes(board, 1)} · ${label(2)} ${countDotsBoxes(board, 2)}`;
}

/**
 * 진행 중 차례 안내 문구. 직전 수로 박스를 완성해 같은 플레이어가 한 번 더 둬야 하면(again)
 * 보너스 턴임을 명시한다.
 */
export function dotsTurnLabel(player: DotsPlayer, again: boolean, label: DotsLabeler): string {
  return again
    ? `${label(player)} 차례 · 박스를 완성했습니다 — 한 번 더 두세요!`
    : `${label(player)} 차례 · 변을 그어 박스를 완성하세요`;
}

/** 종료 시 승자/무승부 문구. winner=null이면 무승부. */
export function dotsOutcomeLabel(winner: DotsPlayer | null, label: DotsLabeler): string {
  return winner === null ? "무승부! 🤝" : `${label(winner)} 승리! 🎉`;
}
