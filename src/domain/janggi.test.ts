import { describe, it, expect } from "vitest";
import {
  createEmptyBoard,
  createInitialBoard,
  inBounds,
  pieceAt,
  isLegalMove,
  legalMovesFrom,
  applyMove,
  WIDTH,
  HEIGHT,
  type Board,
  type PieceType,
  type Side,
} from "./janggi";

// 테스트용: 빈 보드에 기물을 놓는다(직접 갱신).
function put(
  board: Board,
  x: number,
  y: number,
  side: Side,
  type: PieceType,
): void {
  board[y]![x] = { side, type };
}

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

describe("isLegalMove - 차(chariot)", () => {
  it("빈 경로의 직선은 임의 칸 이동 가능", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 8, y: 0 })).toBe(true);
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 9 })).toBe(true);
  });

  it("경로에 기물이 있으면 그 너머로 막힘", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    put(board, 3, 0, "cho", "soldier");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(true); // 막은 기물 포획
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false); // 그 너머 막힘
  });

  it("궁성 대각 라인은 슬라이드 가능(중앙 비면 반대 귀까지)", () => {
    const board = createEmptyBoard();
    put(board, 3, 0, "han", "chariot");
    expect(isLegalMove(board, "han", { x: 3, y: 0 }, { x: 4, y: 1 })).toBe(true); // 귀→중앙
    expect(isLegalMove(board, "han", { x: 3, y: 0 }, { x: 5, y: 2 })).toBe(true); // 귀→반대 귀
  });

  it("궁성 중앙이 막히면 반대 귀로 못 간다", () => {
    const board = createEmptyBoard();
    put(board, 3, 0, "han", "chariot");
    put(board, 4, 1, "cho", "soldier");
    expect(isLegalMove(board, "han", { x: 3, y: 0 }, { x: 5, y: 2 })).toBe(false);
    expect(isLegalMove(board, "han", { x: 3, y: 0 }, { x: 4, y: 1 })).toBe(true); // 중앙 적은 포획
  });

  it("궁성 밖에서는 대각 이동 불가", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
  });
});

describe("isLegalMove - 포(cannon)", () => {
  it("받침 1개를 넘어 이동/포획한다", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "cannon");
    put(board, 0, 2, "cho", "soldier"); // 받침
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 4 })).toBe(true);
    put(board, 0, 4, "cho", "horse"); // 대상 포획
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 4 })).toBe(true);
  });

  it("받침이 없으면 이동 불가", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "cannon");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 1 })).toBe(false);
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 4 })).toBe(false);
  });

  it("받침이 2개 이상이면 이동 불가", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "cannon");
    put(board, 0, 2, "cho", "soldier");
    put(board, 0, 3, "cho", "soldier");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 5 })).toBe(false);
  });

  it("포는 받침으로 넘을 수 없고, 포를 잡을 수도 없다", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "cannon");
    put(board, 0, 2, "cho", "cannon"); // 포 받침 불가
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 4 })).toBe(false);

    const board2 = createEmptyBoard();
    put(board2, 0, 0, "han", "cannon");
    put(board2, 0, 2, "cho", "soldier"); // 정상 받침
    put(board2, 0, 4, "cho", "cannon"); // 포는 포획 불가
    expect(isLegalMove(board2, "han", { x: 0, y: 0 }, { x: 0, y: 4 })).toBe(false);
  });
});

describe("isLegalMove - 마(horse)", () => {
  it("멱이 비면 이동 가능, 막히면 불가", () => {
    const board = createEmptyBoard();
    put(board, 4, 4, "han", "horse");
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 5, y: 6 })).toBe(true);
    put(board, 4, 5, "cho", "soldier"); // 멱(직진 지점) 막힘
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 5, y: 6 })).toBe(false);
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 6, y: 5 })).toBe(true); // 다른 방향은 가능
  });
});

describe("isLegalMove - 상(elephant)", () => {
  it("경로가 비면 이동 가능, 직진/대각 첫 칸이 막히면 불가", () => {
    const board = createEmptyBoard();
    put(board, 2, 4, "han", "elephant");
    expect(isLegalMove(board, "han", { x: 2, y: 4 }, { x: 4, y: 1 })).toBe(true);
    put(board, 2, 3, "cho", "soldier"); // 직진 첫 칸(멱) 막힘
    expect(isLegalMove(board, "han", { x: 2, y: 4 }, { x: 4, y: 1 })).toBe(false);

    const board2 = createEmptyBoard();
    put(board2, 2, 4, "han", "elephant");
    put(board2, 3, 2, "cho", "soldier"); // 대각 첫 칸 막힘
    expect(isLegalMove(board2, "han", { x: 2, y: 4 }, { x: 4, y: 1 })).toBe(false);
  });
});

describe("isLegalMove - 장(general)·사(guard)", () => {
  it("궁성 안 직선/대각 이동, 궁성 이탈 불가", () => {
    const board = createEmptyBoard();
    put(board, 4, 1, "han", "general"); // 궁성 중앙
    expect(isLegalMove(board, "han", { x: 4, y: 1 }, { x: 4, y: 0 })).toBe(true); // 직선
    expect(isLegalMove(board, "han", { x: 4, y: 1 }, { x: 3, y: 0 })).toBe(true); // 대각(중앙→귀)
    expect(isLegalMove(board, "han", { x: 4, y: 1 }, { x: 4, y: 2 })).toBe(true);
    expect(isLegalMove(board, "han", { x: 4, y: 1 }, { x: 4, y: 3 })).toBe(false); // 궁성 밖
  });

  it("귀에서 중앙으로 대각 가능, 비대각 라인은 불가", () => {
    const board = createEmptyBoard();
    put(board, 3, 0, "han", "guard"); // 궁성 귀
    expect(isLegalMove(board, "han", { x: 3, y: 0 }, { x: 4, y: 1 })).toBe(true); // 귀→중앙

    const board2 = createEmptyBoard();
    put(board2, 4, 0, "han", "general"); // 궁성 변 중앙(대각 라인 아님)
    expect(isLegalMove(board2, "han", { x: 4, y: 0 }, { x: 5, y: 1 })).toBe(false);
  });
});

describe("isLegalMove - 졸·병(soldier)", () => {
  it("han은 아래로 전진, 후퇴 불가", () => {
    const board = createEmptyBoard();
    put(board, 4, 4, "han", "soldier");
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 4, y: 5 })).toBe(true); // 전진
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 3, y: 4 })).toBe(true); // 좌
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 5, y: 4 })).toBe(true); // 우
    expect(isLegalMove(board, "han", { x: 4, y: 4 }, { x: 4, y: 3 })).toBe(false); // 후퇴
  });

  it("cho는 위로 전진, 후퇴 불가", () => {
    const board = createEmptyBoard();
    put(board, 4, 5, "cho", "soldier");
    expect(isLegalMove(board, "cho", { x: 4, y: 5 }, { x: 4, y: 4 })).toBe(true); // 전진
    expect(isLegalMove(board, "cho", { x: 4, y: 5 }, { x: 4, y: 6 })).toBe(false); // 후퇴
  });

  it("궁성 안에서는 전진 대각 1칸 허용, 후퇴 대각/평지 대각은 불가", () => {
    const board = createEmptyBoard();
    put(board, 3, 7, "han", "soldier"); // cho 궁성 귀, han은 +y가 전진
    expect(isLegalMove(board, "han", { x: 3, y: 7 }, { x: 4, y: 8 })).toBe(true); // 전진 대각(귀→중앙)
    put(board, 4, 8, "han", "soldier"); // 궁성 중앙
    expect(isLegalMove(board, "han", { x: 4, y: 8 }, { x: 5, y: 9 })).toBe(true); // 전진 대각(중앙→귀)
    expect(isLegalMove(board, "han", { x: 4, y: 8 }, { x: 3, y: 7 })).toBe(false); // 후퇴 대각
    const plain = createEmptyBoard();
    put(plain, 4, 4, "han", "soldier");
    expect(isLegalMove(plain, "han", { x: 4, y: 4 }, { x: 5, y: 5 })).toBe(false); // 궁성 밖 대각
  });
});

describe("isLegalMove - 공통 규칙", () => {
  it("아군 위로는 이동 불가, 상대 기물은 포획 가능", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    put(board, 2, 0, "han", "soldier"); // 아군
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
    board[0]![2] = { side: "cho", type: "soldier" }; // 상대로 교체
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
  });

  it("from에 기물이 없거나 상대 기물이면 false", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "cho", "chariot");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false); // 상대 기물
    expect(isLegalMove(board, "han", { x: 5, y: 5 }, { x: 5, y: 6 })).toBe(false); // 빈 칸
  });

  it("보드 밖으로의 이동은 false", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: -1, y: 0 })).toBe(false);
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 10 })).toBe(false);
  });

  it("제자리 이동은 false", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    expect(isLegalMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });
});

describe("legalMovesFrom", () => {
  it("빈 보드의 차는 한 행/열 전체로 이동 가능", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    const moves = legalMovesFrom(board, "han", { x: 0, y: 0 });
    // 같은 행 8칸 + 같은 열 9칸 = 17칸.
    expect(moves.length).toBe(17);
    expect(moves).toContainEqual({ x: 8, y: 0 });
    expect(moves).toContainEqual({ x: 0, y: 9 });
  });

  it("궁성 중앙의 장은 직선 4 + 대각 4 = 8칸", () => {
    const board = createEmptyBoard();
    put(board, 4, 1, "han", "general");
    const moves = legalMovesFrom(board, "han", { x: 4, y: 1 });
    expect(moves.length).toBe(8);
  });

  it("from에 자기 기물이 없으면 빈 배열", () => {
    const board = createEmptyBoard();
    expect(legalMovesFrom(board, "han", { x: 4, y: 4 })).toEqual([]);
  });
});

describe("applyMove", () => {
  it("합법 수는 새 보드를 반환하고 원본은 불변", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    const next = applyMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 5 });
    expect(next).not.toBe(board);
    expect(pieceAt(next, 0, 0)).toBeNull();
    expect(pieceAt(next, 0, 5)).toEqual({ side: "han", type: "chariot" });
    // 원본 불변
    expect(pieceAt(board, 0, 0)).toEqual({ side: "han", type: "chariot" });
    expect(pieceAt(board, 0, 5)).toBeNull();
  });

  it("포획 시 대상 칸이 이동 기물로 대체된다", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    put(board, 0, 5, "cho", "soldier");
    const next = applyMove(board, "han", { x: 0, y: 0 }, { x: 0, y: 5 });
    expect(pieceAt(next, 0, 5)).toEqual({ side: "han", type: "chariot" });
    expect(pieceAt(board, 0, 5)).toEqual({ side: "cho", type: "soldier" }); // 원본 불변
  });

  it("불법 수는 throw", () => {
    const board = createEmptyBoard();
    put(board, 0, 0, "han", "chariot");
    put(board, 2, 0, "han", "soldier"); // 아군
    expect(() => applyMove(board, "han", { x: 0, y: 0 }, { x: 2, y: 0 })).toThrow();
    expect(() => applyMove(board, "han", { x: 5, y: 5 }, { x: 5, y: 6 })).toThrow();
  });
});
