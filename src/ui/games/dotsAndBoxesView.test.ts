import { describe, it, expect } from "vitest";
import { createDotsAndBoxesBoard, drawEdge } from "../../domain/dotsAndBoxes";
import type { DotsPlayer } from "../../domain/dotsAndBoxes";
import {
  DOTS_DOT_PX,
  DOTS_EDGE_PX,
  dotsGridCells,
  dotsGridTemplate,
  dotsOutcomeLabel,
  dotsScoreLabel,
  dotsTurnLabel,
} from "./dotsAndBoxesView";

const label = (p: DotsPlayer): string => `P${p}`;

describe("dotsGridCells", () => {
  it("표시 격자를 (2*rows+1)×(2*cols+1) 행 우선으로 펼친다", () => {
    const board = createDotsAndBoxesBoard(2, 3);
    const cells = dotsGridCells(board);
    expect(cells).toHaveLength((2 * 2 + 1) * (2 * 3 + 1)); // 5 × 7 = 35

    // 자동 배치(행 우선) 순서가 보존된다.
    expect(cells[0]).toMatchObject({ gridRow: 0, gridCol: 0, kind: "dot" });
    expect(cells[1]).toMatchObject({ gridRow: 0, gridCol: 1, kind: "hedge" });
  });

  it("좌표 패리티로 점/수평변/수직변/박스를 구분하고 도메인 변 좌표를 매핑한다", () => {
    const board = createDotsAndBoxesBoard(2, 2);
    const at = (r: number, c: number) =>
      dotsGridCells(board).find((cell) => cell.gridRow === r && cell.gridCol === c)!;

    expect(at(0, 0).kind).toBe("dot");
    // 짝수행·홀수열 = 수평 변
    expect(at(0, 1)).toMatchObject({ kind: "hedge", edge: { orientation: "h", row: 0, col: 0 } });
    // 홀수행·짝수열 = 수직 변
    expect(at(1, 0)).toMatchObject({ kind: "vedge", edge: { orientation: "v", row: 0, col: 0 } });
    // 홀수행·홀수열 = 박스
    expect(at(1, 1).kind).toBe("box");
    // 마지막 행의 수평 변은 row=rows
    expect(at(4, 1)).toMatchObject({ kind: "hedge", edge: { orientation: "h", row: 2, col: 0 } });
    // 마지막 열의 수직 변은 col=cols
    expect(at(1, 4)).toMatchObject({ kind: "vedge", edge: { orientation: "v", row: 0, col: 2 } });
  });

  it("그어진 변은 drawn=true, 완성된 박스는 owner로 반영한다(입력 불변)", () => {
    const base = createDotsAndBoxesBoard(1, 1);
    // 1×1 박스의 네 변을 모두 그어 P1이 박스를 완성한다.
    let board = drawEdge(base, { orientation: "h", row: 0, col: 0 }, 1).board;
    board = drawEdge(board, { orientation: "h", row: 1, col: 0 }, 1).board;
    board = drawEdge(board, { orientation: "v", row: 0, col: 0 }, 1).board;
    const last = drawEdge(board, { orientation: "v", row: 0, col: 1 }, 1);
    board = last.board;
    expect(last.completed).toHaveLength(1);

    const cells = dotsGridCells(board);
    const edges = cells.filter((c) => c.kind === "hedge" || c.kind === "vedge");
    expect(edges.every((c) => c.drawn)).toBe(true);
    const box = cells.find((c) => c.kind === "box")!;
    expect(box.owner).toBe(1);

    // 원본 보드는 변형되지 않는다.
    expect(base.boxes[0]![0]).toBeNull();
  });
});

describe("dotsGridTemplate", () => {
  it("점 폭과 변 길이를 교차한 CSS grid-template을 만든다", () => {
    expect(dotsGridTemplate(1)).toBe(`${DOTS_DOT_PX}px ${DOTS_EDGE_PX}px ${DOTS_DOT_PX}px`);
    expect(dotsGridTemplate(3)).toBe(
      `${DOTS_DOT_PX}px ${DOTS_EDGE_PX}px ${DOTS_DOT_PX}px ${DOTS_EDGE_PX}px ${DOTS_DOT_PX}px ${DOTS_EDGE_PX}px ${DOTS_DOT_PX}px`,
    );
  });

  it("0·음수·비정수면 throw 한다", () => {
    expect(() => dotsGridTemplate(0)).toThrow();
    expect(() => dotsGridTemplate(-1)).toThrow();
    expect(() => dotsGridTemplate(1.5)).toThrow();
  });
});

describe("dotsScoreLabel", () => {
  it("양측 완성 박스 수를 라벨과 함께 표시한다", () => {
    let board = createDotsAndBoxesBoard(1, 1);
    expect(dotsScoreLabel(board, label)).toBe("P1 0 · P2 0");
    // 1×1 박스를 P1이 완성한다.
    board = drawEdge(board, { orientation: "h", row: 0, col: 0 }, 1).board;
    board = drawEdge(board, { orientation: "h", row: 1, col: 0 }, 1).board;
    board = drawEdge(board, { orientation: "v", row: 0, col: 0 }, 1).board;
    board = drawEdge(board, { orientation: "v", row: 0, col: 1 }, 1).board;
    expect(dotsScoreLabel(board, label)).toBe("P1 1 · P2 0");
  });
});

describe("dotsTurnLabel", () => {
  it("보너스 턴(again)이면 '한 번 더'를 안내한다", () => {
    expect(dotsTurnLabel(1, false, label)).toContain("P1 차례");
    expect(dotsTurnLabel(1, false, label)).not.toContain("한 번 더");
    expect(dotsTurnLabel(2, true, label)).toContain("P2 차례");
    expect(dotsTurnLabel(2, true, label)).toContain("한 번 더");
  });
});

describe("dotsOutcomeLabel", () => {
  it("승자/무승부를 구분한다", () => {
    expect(dotsOutcomeLabel(null, label)).toContain("무승부");
    expect(dotsOutcomeLabel(1, label)).toBe("P1 승리! 🎉");
    expect(dotsOutcomeLabel(2, label)).toBe("P2 승리! 🎉");
  });
});
