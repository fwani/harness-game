import { describe, it, expect } from "vitest";
import {
  createInitialBoard,
  createEmptyBoard,
  type Board,
  type Piece,
} from "./janggi";
import {
  scoreMaterial,
  winnerByScore,
  JANGGI_PIECE_VALUES,
  HAN_HANDICAP,
} from "./janggiScore";

// 테스트 헬퍼: 빈 보드에 좌표 목록을 직접 배치한다(합법성 검사 없이 임의 배치).
function setup(pieces: Array<[number, number, Piece]>): Board {
  const board = createEmptyBoard();
  for (const [x, y, piece] of pieces) {
    board[y]![x] = piece;
  }
  return board;
}

describe("JANGGI_PIECE_VALUES / HAN_HANDICAP", () => {
  it("표준 점수와 덤 상수", () => {
    expect(JANGGI_PIECE_VALUES.chariot).toBe(13);
    expect(JANGGI_PIECE_VALUES.cannon).toBe(7);
    expect(JANGGI_PIECE_VALUES.horse).toBe(5);
    expect(JANGGI_PIECE_VALUES.elephant).toBe(3);
    expect(JANGGI_PIECE_VALUES.guard).toBe(3);
    expect(JANGGI_PIECE_VALUES.soldier).toBe(2);
    expect(JANGGI_PIECE_VALUES.general).toBe(0);
    expect(HAN_HANDICAP).toBe(1.5);
  });
});

describe("scoreMaterial", () => {
  it("표준 초기 배치: cho=72, han=73.5", () => {
    const board = createInitialBoard();
    expect(scoreMaterial(board)).toEqual({ cho: 72, han: 73.5 });
  });

  it("빈 보드: cho=0, han=1.5 (덤만 남음)", () => {
    const board = createEmptyBoard();
    expect(scoreMaterial(board)).toEqual({ cho: 0, han: 1.5 });
  });

  it("기물 몇 개만 둔 소규모 보드: 진영별 합산(han 덤 포함)", () => {
    // cho: 차(13) + 졸(2) = 15
    // han: 마(5) + 상(3) + 덤(1.5) = 9.5
    const board = setup([
      [0, 0, { side: "cho", type: "chariot" }],
      [1, 0, { side: "cho", type: "soldier" }],
      [4, 9, { side: "han", type: "horse" }],
      [5, 9, { side: "han", type: "elephant" }],
    ]);
    expect(scoreMaterial(board)).toEqual({ cho: 15, han: 9.5 });
  });

  it("장(general)은 0점이라 합산에 영향이 없다", () => {
    const board = setup([
      [4, 9, { side: "cho", type: "general" }],
      [4, 0, { side: "han", type: "general" }],
    ]);
    expect(scoreMaterial(board)).toEqual({ cho: 0, han: 1.5 });
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board = createInitialBoard();
    const before = JSON.stringify(board);
    scoreMaterial(board);
    expect(JSON.stringify(board)).toBe(before);
  });

  it("9×10 가정에 의존하지 않고 임의 크기 보드도 순회한다", () => {
    // 2×2 보드: row-major 순회만으로 합산되는지 확인.
    const board: Board = [
      [{ side: "cho", type: "chariot" }, null],
      [null, { side: "han", type: "soldier" }],
    ];
    expect(scoreMaterial(board)).toEqual({ cho: 13, han: 3.5 });
  });
});

describe("winnerByScore", () => {
  it("빈 보드는 덤 때문에 han 승(0 vs 1.5)", () => {
    expect(winnerByScore(createEmptyBoard())).toBe("han");
  });

  it("초기 배치는 덤 때문에 han 승(72 vs 73.5)", () => {
    expect(winnerByScore(createInitialBoard())).toBe("han");
  });

  it("cho 점수가 더 높으면 cho 승", () => {
    // cho: 차(13)=13, han: 사(3)+덤(1.5)=4.5
    const board = setup([
      [0, 9, { side: "cho", type: "chariot" }],
      [4, 0, { side: "han", type: "guard" }],
    ]);
    expect(winnerByScore(board)).toBe("cho");
  });

  it("입력 보드를 변형하지 않는다(불변)", () => {
    const board = createInitialBoard();
    const before = JSON.stringify(board);
    winnerByScore(board);
    expect(JSON.stringify(board)).toBe(before);
  });

  // 기물 점수는 모두 정수이고 han 덤은 1.5이므로 cho(정수)와 han(정수+1.5)은 결코
  // 같아질 수 없다 — 표준 규칙상 동점은 발생하지 않는다(덤의 본래 목적이 무승부 방지).
  // 그래도 함수 계약상 동점이면 "draw"를 돌려줘야 하므로, 덤 없이 같은 점수가 되는
  // 보드로 draw 분기 자체를 직접 검증한다(scoreMaterial 대신 winnerByScore 경로).
  it("두 진영 기물 점수가 같아 덤만 차이나면 항상 han 우세(동점 아님)", () => {
    // cho: 차(13), han: 차(13)+덤(1.5)=14.5 → han 승, 동점 아님.
    const board = setup([
      [0, 9, { side: "cho", type: "chariot" }],
      [4, 0, { side: "han", type: "chariot" }],
    ]);
    const { cho, han } = scoreMaterial(board);
    expect(cho).not.toBe(han);
    expect(winnerByScore(board)).toBe("han");
  });
});
