import { describe, expect, it } from "vitest";

import {
  countLitCells,
  createLightsOutBoard,
  inLightsOutBounds,
  isLightsOutSolved,
  pressLight,
  type LightsOutBoard,
} from "./lightsOut";

// 좌표 집합 비교용: 켜진 칸의 "row,col" 문자열 집합.
function litSet(board: LightsOutBoard): Set<string> {
  const s = new Set<string>();
  board.forEach((rowCells, r) =>
    rowCells.forEach((lit, c) => {
      if (lit) {
        s.add(`${r},${c}`);
      }
    }),
  );
  return s;
}

describe("createLightsOutBoard", () => {
  it("기본 크기는 5x5이고 모든 칸이 꺼짐", () => {
    const board = createLightsOutBoard();
    expect(board).toHaveLength(5);
    expect(board.every((row) => row.length === 5)).toBe(true);
    expect(countLitCells(board)).toBe(0);
    expect(isLightsOutSolved(board)).toBe(true);
  });

  it("임의 size로 정사각 형태를 만든다", () => {
    const board = createLightsOutBoard(3);
    expect(board).toHaveLength(3);
    expect(board.every((row) => row.length === 3)).toBe(true);
  });

  it("잘못된 크기는 throw", () => {
    expect(() => createLightsOutBoard(0)).toThrow();
    expect(() => createLightsOutBoard(-1)).toThrow();
    expect(() => createLightsOutBoard(2.5)).toThrow();
  });
});

describe("inLightsOutBounds", () => {
  it("경계 안/밖/비정수 좌표를 구분한다", () => {
    const board = createLightsOutBoard(3);
    expect(inLightsOutBounds(board, { row: 0, col: 0 })).toBe(true);
    expect(inLightsOutBounds(board, { row: 2, col: 2 })).toBe(true);
    expect(inLightsOutBounds(board, { row: -1, col: 0 })).toBe(false);
    expect(inLightsOutBounds(board, { row: 0, col: 3 })).toBe(false);
    expect(inLightsOutBounds(board, { row: 0.5, col: 0 })).toBe(false);
  });
});

describe("pressLight", () => {
  it("중앙 칸을 누르면 자신 + 상하좌우 4칸이 토글된다(대각선 제외)", () => {
    const board = createLightsOutBoard(3);
    const next = pressLight(board, { row: 1, col: 1 });
    expect(litSet(next)).toEqual(
      new Set(["1,1", "0,1", "2,1", "1,0", "1,2"]),
    );
  });

  it("모서리 칸은 경계 밖 인접을 무시하고 존재하는 칸만 토글", () => {
    const board = createLightsOutBoard(3);
    const next = pressLight(board, { row: 0, col: 0 });
    // 자신 + 아래(1,0) + 오른쪽(0,1)만. 위/왼쪽은 경계 밖.
    expect(litSet(next)).toEqual(new Set(["0,0", "1,0", "0,1"]));
  });

  it("변(edge) 칸은 3개의 인접만 토글", () => {
    const board = createLightsOutBoard(3);
    const next = pressLight(board, { row: 0, col: 1 });
    // 자신 + 아래(1,1) + 왼쪽(0,0) + 오른쪽(0,2). 위는 경계 밖.
    expect(litSet(next)).toEqual(new Set(["0,1", "1,1", "0,0", "0,2"]));
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board = createLightsOutBoard(3);
    const snapshot = board.map((row) => row.slice());
    pressLight(board, { row: 1, col: 1 });
    expect(board).toEqual(snapshot);
  });

  it("같은 칸을 두 번 누르면 원상복귀(토글 멱등쌍)", () => {
    const board = createLightsOutBoard(4);
    const once = pressLight(board, { row: 2, col: 1 });
    const twice = pressLight(once, { row: 2, col: 1 });
    expect(twice).toEqual(board);
  });

  it("경계 밖 좌표는 throw", () => {
    const board = createLightsOutBoard(3);
    expect(() => pressLight(board, { row: -1, col: 0 })).toThrow();
    expect(() => pressLight(board, { row: 3, col: 0 })).toThrow();
    expect(() => pressLight(board, { row: 0, col: 1.5 })).toThrow();
  });
});

describe("isLightsOutSolved / countLitCells", () => {
  it("전부 off면 클리어, 일부 on이면 미클리어", () => {
    const board = createLightsOutBoard(3);
    expect(isLightsOutSolved(board)).toBe(true);
    expect(countLitCells(board)).toBe(0);

    const pressed = pressLight(board, { row: 1, col: 1 });
    expect(isLightsOutSolved(pressed)).toBe(false);
    expect(countLitCells(pressed)).toBe(5);
  });

  it("누른 뒤 다시 모두 꺼지면 클리어로 판정", () => {
    let board = createLightsOutBoard(3);
    board = pressLight(board, { row: 0, col: 0 });
    board = pressLight(board, { row: 0, col: 0 });
    expect(isLightsOutSolved(board)).toBe(true);
  });
});
