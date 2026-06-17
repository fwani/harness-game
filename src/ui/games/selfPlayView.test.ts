import { describe, it, expect } from "vitest";
import type { RandomSource } from "../../application/dealCards";
import type { EngineGameResult } from "../../application/playEngineGame";
import {
  SELF_PLAY_GAMES,
  runSelfPlay,
  describeSelfPlayResult,
  selfPlayBoard,
  type SelfPlayGameKey,
} from "./selfPlayView";

/** 결정적 의사난수(선형 합동). 같은 seed면 항상 같은 시퀀스를 낸다. */
function seededRng(seed: number): RandomSource {
  let s = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s % maxExclusive;
    },
  };
}

/** status만 가진 최소 EngineGameResult를 만든다(문구 매핑 테스트용). */
function resultWith(
  status: EngineGameResult<unknown>["status"],
  moveCount: number,
): EngineGameResult<unknown> {
  return { finalState: {}, status, moveCount };
}

describe("SELF_PLAY_GAMES", () => {
  it("오목·바둑·오델로 3종을 노출한다", () => {
    expect(SELF_PLAY_GAMES.map((g) => g.key)).toEqual([
      "gomoku",
      "go",
      "reversi",
    ]);
  });
});

describe("runSelfPlay", () => {
  const games: SelfPlayGameKey[] = ["gomoku", "go", "reversi"];

  for (const game of games) {
    it(`${game}: 종료 상태(over)와 moveCount>0을 반환한다`, () => {
      const result = runSelfPlay(game, seededRng(12345));
      expect(result.status.over).toBe(true);
      expect(result.moveCount).toBeGreaterThan(0);
    });
  }

  it("동일 rng(결정적)면 동일 결과를 낸다", () => {
    const a = runSelfPlay("reversi", seededRng(7));
    const b = runSelfPlay("reversi", seededRng(7));
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
  });

  it("미지원 키는 throw 한다", () => {
    expect(() =>
      runSelfPlay("chess" as unknown as SelfPlayGameKey, seededRng(1)),
    ).toThrow();
  });
});

describe("describeSelfPlayResult", () => {
  it("흑(선) 승리를 side 라벨로 매핑한다", () => {
    const { outcome, moves } = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 30),
    );
    expect(outcome).toBe("흑(선) 승리 🎉");
    expect(moves).toBe("적용된 수 30수");
  });

  it("백(후) 승리를 side 라벨로 매핑한다", () => {
    const { outcome } = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 12),
    );
    expect(outcome).toBe("백(후) 승리 🎉");
  });

  it("무승부를 구분해 매핑한다", () => {
    const { outcome } = describeSelfPlayResult(
      resultWith({ over: true, winner: null, draw: true }, 64),
    );
    expect(outcome).toBe("무승부 🤝");
  });

  it("미종료 결과는 진행 중으로 표기한다", () => {
    const { outcome } = describeSelfPlayResult(
      resultWith({ over: false, winner: null, draw: false }, 0),
    );
    expect(outcome).toBe("진행 중");
  });
});

describe("selfPlayBoard", () => {
  it("실제 자동 대국 결과에서 2차원 보드를 추출한다", () => {
    const board = selfPlayBoard(runSelfPlay("reversi", seededRng(3)));
    expect(board.length).toBe(8);
    expect(board[0]!.length).toBe(8);
  });

  it("board가 없으면 빈 배열을 반환한다", () => {
    const board = selfPlayBoard(
      resultWith({ over: true, winner: null, draw: true }, 0),
    );
    expect(board).toEqual([]);
  });
});
