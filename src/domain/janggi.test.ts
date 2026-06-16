import { describe, it, expect } from "vitest";
import {
  createEmptyBoard,
  createInitialBoard,
  inBounds,
  pieceAt,
  WIDTH,
  HEIGHT,
  type Board,
  type PieceType,
  type Side,
} from "./janggi";

// 보드 전체 기물을 순회하며 (side,type)별 개수를 센다.
function countPieces(board: Board): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) {
        const key = `${cell.side}:${cell.type}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

describe("createEmptyBoard", () => {
  it("9×10 보드를 만든다(board[y][x], y 10행 x 9열)", () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(HEIGHT);
    expect(board.length).toBe(10);
    expect(board.every((row) => row.length === WIDTH)).toBe(true);
    expect(board.every((row) => row.length === 9)).toBe(true);
  });

  it("모든 칸이 null이다", () => {
    const board = createEmptyBoard();
    expect(board.every((row) => row.every((cell) => cell === null))).toBe(true);
  });
});

describe("createInitialBoard - 기물 개수", () => {
  it("총 32개 기물이 배치된다", () => {
    const board = createInitialBoard();
    const total = board.reduce(
      (sum, row) => sum + row.filter((cell) => cell !== null).length,
      0,
    );
    expect(total).toBe(32);
  });

  it("진영당 16개씩 배치된다", () => {
    const board = createInitialBoard();
    const counts = countPieces(board);
    const sideTotal = (side: Side): number => {
      let n = 0;
      for (const [key, value] of counts) {
        if (key.startsWith(`${side}:`)) {
          n += value;
        }
      }
      return n;
    };
    expect(sideTotal("cho")).toBe(16);
    expect(sideTotal("han")).toBe(16);
  });

  it("종류별 개수(진영당 장1·사2·상2·마2·차2·포2·졸5)가 맞다", () => {
    const board = createInitialBoard();
    const counts = countPieces(board);
    const expected: Array<[PieceType, number]> = [
      ["general", 1],
      ["guard", 2],
      ["elephant", 2],
      ["horse", 2],
      ["chariot", 2],
      ["cannon", 2],
      ["soldier", 5],
    ];
    for (const side of ["cho", "han"] as Side[]) {
      for (const [type, n] of expected) {
        expect(counts.get(`${side}:${type}`)).toBe(n);
      }
    }
  });
});

describe("createInitialBoard - 대표 좌표", () => {
  it("han(위) 진영: 1선 차(0,0)/(8,0), 장(4,1), 포(1,2)/(7,2), 병(0,3)", () => {
    const board = createInitialBoard();
    expect(pieceAt(board, 0, 0)).toEqual({ side: "han", type: "chariot" });
    expect(pieceAt(board, 8, 0)).toEqual({ side: "han", type: "chariot" });
    expect(pieceAt(board, 1, 0)).toEqual({ side: "han", type: "horse" });
    expect(pieceAt(board, 2, 0)).toEqual({ side: "han", type: "elephant" });
    expect(pieceAt(board, 3, 0)).toEqual({ side: "han", type: "guard" });
    expect(pieceAt(board, 4, 0)).toBeNull(); // 1선 중앙은 비어 있음(장은 궁성)
    expect(pieceAt(board, 4, 1)).toEqual({ side: "han", type: "general" });
    expect(pieceAt(board, 1, 2)).toEqual({ side: "han", type: "cannon" });
    expect(pieceAt(board, 7, 2)).toEqual({ side: "han", type: "cannon" });
    expect(pieceAt(board, 0, 3)).toEqual({ side: "han", type: "soldier" });
    expect(pieceAt(board, 4, 3)).toEqual({ side: "han", type: "soldier" });
  });

  it("cho(아래) 진영: 1선 차(0,9)/(8,9), 장(4,8), 포(1,7)/(7,7), 졸(0,6)", () => {
    const board = createInitialBoard();
    expect(pieceAt(board, 0, 9)).toEqual({ side: "cho", type: "chariot" });
    expect(pieceAt(board, 8, 9)).toEqual({ side: "cho", type: "chariot" });
    expect(pieceAt(board, 1, 9)).toEqual({ side: "cho", type: "horse" });
    expect(pieceAt(board, 2, 9)).toEqual({ side: "cho", type: "elephant" });
    expect(pieceAt(board, 3, 9)).toEqual({ side: "cho", type: "guard" });
    expect(pieceAt(board, 4, 9)).toBeNull(); // 1선 중앙은 비어 있음(장은 궁성)
    expect(pieceAt(board, 4, 8)).toEqual({ side: "cho", type: "general" });
    expect(pieceAt(board, 1, 7)).toEqual({ side: "cho", type: "cannon" });
    expect(pieceAt(board, 7, 7)).toEqual({ side: "cho", type: "cannon" });
    expect(pieceAt(board, 0, 6)).toEqual({ side: "cho", type: "soldier" });
    expect(pieceAt(board, 4, 6)).toEqual({ side: "cho", type: "soldier" });
  });

  it("두 진영은 상하 대칭(같은 x, y와 9-y)으로 배치된다", () => {
    const board = createInitialBoard();
    for (let y = 0; y < HEIGHT / 2; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const top = pieceAt(board, x, y);
        const bottom = pieceAt(board, x, HEIGHT - 1 - y);
        if (top === null || bottom === null) {
          expect(top).toBe(bottom); // 둘 다 null이어야 대칭
        } else {
          expect(top.type).toBe(bottom.type);
          expect(top.side).toBe("han");
          expect(bottom.side).toBe("cho");
        }
      }
    }
  });
});

describe("inBounds / pieceAt", () => {
  it("inBounds: 경계 안/밖 판정", () => {
    const board = createEmptyBoard();
    expect(inBounds(board, 0, 0)).toBe(true);
    expect(inBounds(board, 8, 9)).toBe(true);
    expect(inBounds(board, -1, 0)).toBe(false);
    expect(inBounds(board, 0, -1)).toBe(false);
    expect(inBounds(board, 9, 0)).toBe(false); // x 최대 8
    expect(inBounds(board, 0, 10)).toBe(false); // y 최대 9
  });

  it("pieceAt: 범위 밖이면 throw하지 않고 null", () => {
    const board = createInitialBoard();
    expect(pieceAt(board, 9, 0)).toBeNull();
    expect(pieceAt(board, 0, 10)).toBeNull();
    expect(pieceAt(board, -1, -1)).toBeNull();
  });

  it("pieceAt: 빈 칸은 null", () => {
    const board = createInitialBoard();
    expect(pieceAt(board, 4, 4)).toBeNull();
  });
});

describe("불변성", () => {
  it("createInitialBoard는 호출마다 독립된 보드를 반환한다", () => {
    const a = createInitialBoard();
    const b = createInitialBoard();
    expect(a).not.toBe(b);
    a[4]![4] = { side: "cho", type: "soldier" };
    expect(pieceAt(b, 4, 4)).toBeNull();
  });

  it("createEmptyBoard도 호출마다 독립된 보드를 반환한다", () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});
