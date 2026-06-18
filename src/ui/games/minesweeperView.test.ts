import { describe, it, expect } from "vitest";
import { createMinefield, revealCell } from "../../domain/minesweeper";
import {
  cellView,
  countHidden,
  countSafeHidden,
  describeMinesweeperStatus,
} from "./minesweeperView";

describe("cellView", () => {
  it("미공개 칸은 내용 없이 hidden으로 표시한다", () => {
    const board = createMinefield(2, 2, []);
    const v = cellView(board[0]![0]!, "none", 0, 0);
    expect(v.kind).toBe("hidden");
    expect(v.content).toBe("");
    expect(v.revealed).toBe(false);
    expect(v.ariaLabel).toContain("미공개");
  });

  it("공개된 인접 0 칸은 빈 칸(empty)으로, 숫자 칸은 숫자로 표시한다", () => {
    // 한 칸에만 지뢰 → (0,0)은 인접 1(number), 멀리 떨어진 (2,2)는 인접 0(empty).
    const board = revealCell(createMinefield(3, 3, [[1, 1]]), 0, 0);
    const numberCell = cellView(board[0]![0]!, "none", 0, 0);
    expect(numberCell.kind).toBe("number");
    expect(numberCell.content).toBe("1");
    expect(numberCell.revealed).toBe(true);

    const emptyBoard = revealCell(createMinefield(3, 3, [[0, 0]]), 2, 2);
    const emptyCell = cellView(emptyBoard[2]![2]!, "none", 2, 2);
    expect(emptyCell.kind).toBe("empty");
    expect(emptyCell.content).toBe("");
  });

  it("패배(exploded) 시 미공개 지뢰를 💣로 노출한다", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    const hidden = cellView(board[0]![0]!, "none", 0, 0);
    expect(hidden.kind).toBe("hidden");
    const exposed = cellView(board[0]![0]!, "exploded", 0, 0);
    expect(exposed.kind).toBe("mine");
    expect(exposed.content).toBe("💣");
  });

  it("승리(flagged) 시 안전하게 피한 미공개 지뢰를 🚩로 표시한다(승/패 마무리 대칭)", () => {
    const board = createMinefield(2, 2, [[0, 0]]);
    const flagged = cellView(board[0]![0]!, "flagged", 0, 0);
    expect(flagged.kind).toBe("mine");
    expect(flagged.content).toBe("🚩");
    expect(flagged.revealed).toBe(false);
    expect(flagged.ariaLabel).toContain("피함");
  });

  it("좌표를 1-기반으로 라벨에 포함한다(행/열)", () => {
    const board = createMinefield(2, 2, []);
    expect(cellView(board[1]![0]!, "none", 1, 0).ariaLabel).toContain("2행 1열");
  });
});

describe("countHidden", () => {
  it("모두 미공개면 전체 칸 수를 센다", () => {
    expect(countHidden(createMinefield(3, 4, []))).toBe(12);
  });

  it("칸을 열면 미공개 수가 줄어든다", () => {
    // 지뢰를 구석에 몰아 연쇄 공개가 보드 대부분을 여는 상황을 만든다.
    const board = createMinefield(3, 3, [[0, 0]]);
    const before = countHidden(board);
    const after = countHidden(revealCell(board, 2, 2));
    expect(after).toBeLessThan(before);
  });
});

describe("countSafeHidden", () => {
  it("미공개 지뢰는 세지 않는다(안전한 미공개 칸만 센다)", () => {
    // 9칸 중 지뢰 1개 → 안전한 미공개 칸 8.
    expect(countSafeHidden(createMinefield(3, 3, [[0, 0]]))).toBe(8);
  });

  it("모든 안전한 칸을 열면 0이 된다(승리 상태와 일치)", () => {
    // (0,0) 지뢰. (2,2)를 열면 연쇄 공개로 모든 안전한 칸이 열린다(3×3, 지뢰 1개는 구석).
    const cleared = revealCell(createMinefield(3, 3, [[0, 0]]), 2, 2);
    expect(countSafeHidden(cleared)).toBe(0);
    // 미공개 지뢰는 그대로 남아 있어도(countHidden=1) 남은 안전 칸은 0이다.
    expect(countHidden(cleared)).toBe(1);
  });
});

describe("describeMinesweeperStatus", () => {
  it("상태별로 구분되는 한국어 메시지를 만든다", () => {
    expect(describeMinesweeperStatus("win").kind).toBe("win");
    expect(describeMinesweeperStatus("win").message).toContain("승리");
    expect(describeMinesweeperStatus("loss").kind).toBe("loss");
    expect(describeMinesweeperStatus("loss").message).toContain("게임 오버");
    expect(describeMinesweeperStatus("playing").kind).toBe("playing");
  });
});
