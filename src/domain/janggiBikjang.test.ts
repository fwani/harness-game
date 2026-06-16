import { describe, it, expect } from "vitest";
import { createEmptyBoard, type Board, type Piece } from "./janggi";
import { isBikjang } from "./janggiBikjang";

const choGeneral: Piece = { side: "cho", type: "general" };
const hanGeneral: Piece = { side: "han", type: "general" };
const choSoldier: Piece = { side: "cho", type: "soldier" };

function snapshot(board: Board): string {
  return JSON.stringify(board);
}

describe("isBikjang", () => {
  it("같은 세로줄에서 사이가 비어 있으면 빅장 성립(true)", () => {
    const board = createEmptyBoard();
    board[1]![4] = hanGeneral;
    board[8]![4] = choGeneral;
    expect(isBikjang(board)).toBe(true);
  });

  it("두 장이 인접(사이 칸 없음)하면 true", () => {
    const board = createEmptyBoard();
    board[4]![4] = hanGeneral;
    board[5]![4] = choGeneral;
    expect(isBikjang(board)).toBe(true);
  });

  it("같은 세로줄이지만 사이에 기물이 있으면 false", () => {
    const board = createEmptyBoard();
    board[1]![4] = hanGeneral;
    board[8]![4] = choGeneral;
    board[5]![4] = choSoldier;
    expect(isBikjang(board)).toBe(false);
  });

  it("두 장이 다른 세로줄이면 false", () => {
    const board = createEmptyBoard();
    board[1]![3] = hanGeneral;
    board[8]![4] = choGeneral;
    expect(isBikjang(board)).toBe(false);
  });

  it("한쪽 장이 없으면 false(throw 안 함)", () => {
    const board = createEmptyBoard();
    board[8]![4] = choGeneral;
    expect(isBikjang(board)).toBe(false);
  });

  it("두 장 모두 없으면 false", () => {
    const board = createEmptyBoard();
    expect(isBikjang(board)).toBe(false);
  });

  it("호출 전후 입력 보드가 변형되지 않는다(불변)", () => {
    const board = createEmptyBoard();
    board[1]![4] = hanGeneral;
    board[8]![4] = choGeneral;
    board[5]![4] = choSoldier;
    const before = snapshot(board);
    isBikjang(board);
    expect(snapshot(board)).toBe(before);
  });
});
