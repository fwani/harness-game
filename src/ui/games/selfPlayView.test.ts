import { describe, it, expect } from "vitest";
import type { RandomSource } from "../../application/dealCards";
import type { EngineGameResult } from "../../application/playEngineGame";
import {
  SELF_PLAY_GAMES,
  runSelfPlay,
  runAndDescribeSelfPlay,
  describeSelfPlayResult,
  selfPlayBoard,
  selfPlayJanggiBoard,
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
  it("오목·바둑·오델로·장기를 노출한다", () => {
    expect(SELF_PLAY_GAMES.map((g) => g.key)).toEqual([
      "gomoku",
      "go",
      "reversi",
      "janggi",
    ]);
  });

  it("장기 메타는 9×10 보드 클래스(.board.janggi)를 쓴다", () => {
    const janggi = SELF_PLAY_GAMES.find((g) => g.key === "janggi")!;
    expect(janggi.label).toBe("장기");
    expect(janggi.size).toBe(9);
    expect(janggi.boardClass).toBe("janggi");
  });
});

describe("runSelfPlay", () => {
  const games: SelfPlayGameKey[] = ["gomoku", "go", "reversi", "janggi"];

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

  it("장기: 동일 rng면 동일 종국 결과를 낸다", () => {
    const a = runSelfPlay("janggi", seededRng(99));
    const b = runSelfPlay("janggi", seededRng(99));
    expect(a.status.over).toBe(true);
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

  it("장기 승자는 초(선)/한(후)로 매핑한다(흑/백이 아님)", () => {
    const cho = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 40),
      "janggi",
    );
    const han = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 41),
      "janggi",
    );
    expect(cho.outcome).toBe("초(선) 승리 🎉");
    expect(han.outcome).toBe("한(후) 승리 🎉");
  });

  it("기존 3종 라벨 회귀 없음(흑/백 유지)", () => {
    for (const game of ["gomoku", "go", "reversi"] as SelfPlayGameKey[]) {
      expect(
        describeSelfPlayResult(
          resultWith({ over: true, winner: "p1", draw: false }, 10),
          game,
        ).outcome,
      ).toBe("흑(선) 승리 🎉");
      expect(
        describeSelfPlayResult(
          resultWith({ over: true, winner: "p2", draw: false }, 10),
          game,
        ).outcome,
      ).toBe("백(후) 승리 🎉");
    }
  });
});

describe("runAndDescribeSelfPlay", () => {
  it("장기: 정상 종국이면 초/한 승자 또는 무승부 문구를 반환한다", () => {
    const run = runAndDescribeSelfPlay("janggi", seededRng(99));
    expect(run.unfinished).toBe(false);
    expect(run.result).not.toBeNull();
    expect(run.outcome).toMatch(/(초\(선\)|한\(후\)) 승리|무승부/);
  });

  it("수 제한(maxMoves) 도달 시 throw를 잡아 무종국 문구로 변환한다(크래시 없음)", () => {
    // maxMoves=1로는 장기가 끝나지 않으므로 playEngineGame이 throw → 무종국으로 우아하게 처리.
    const run = runAndDescribeSelfPlay("janggi", seededRng(99), 1);
    expect(run.unfinished).toBe(true);
    expect(run.result).toBeNull();
    expect(run.outcome).toContain("무종국");
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

describe("selfPlayJanggiBoard", () => {
  it("실제 장기 자동 대국 결과에서 9×10 기물 보드를 추출한다", () => {
    const board = selfPlayJanggiBoard(runSelfPlay("janggi", seededRng(99)));
    expect(board.length).toBe(10); // 행(세로) 10
    expect(board[0]!.length).toBe(9); // 열(가로) 9
  });

  it("board가 없으면 빈 배열을 반환한다", () => {
    const board = selfPlayJanggiBoard(
      resultWith({ over: true, winner: null, draw: false }, 0),
    );
    expect(board).toEqual([]);
  });
});
