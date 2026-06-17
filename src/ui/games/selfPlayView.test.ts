import { describe, it, expect } from "vitest";
import type { RandomSource } from "../../application/dealCards";
import type { EngineGameResult } from "../../application/playEngineGame";
import {
  SELF_PLAY_GAMES,
  runSelfPlay,
  runAndDescribeSelfPlay,
  describeSelfPlayResult,
  selfPlayBoard,
  selfPlayCheckersBoard,
  selfPlayDotsBoard,
  selfPlayGlyphBoard,
  selfPlayJanggiBoard,
  selfPlayMancalaBoard,
  selfPlayNimBoard,
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
  it("오목·바둑·오델로·장기·커넥트포·틱택토·도트앤박스·체커·만칼라·님을 노출한다", () => {
    expect(SELF_PLAY_GAMES.map((g) => g.key)).toEqual([
      "gomoku",
      "go",
      "reversi",
      "janggi",
      "connectfour",
      "tictactoe",
      "dotsandboxes",
      "checkers",
      "mancala",
      "nim",
    ]);
  });

  it("님 메타가 포함된다(.board.nim)", () => {
    const nim = SELF_PLAY_GAMES.find((g) => g.key === "nim")!;
    expect(nim).toBeDefined();
    expect(nim.label).toBe("님");
    expect(nim.boardClass).toBe("nim");
  });

  it("장기 메타는 9×10 보드 클래스(.board.janggi)를 쓴다", () => {
    const janggi = SELF_PLAY_GAMES.find((g) => g.key === "janggi")!;
    expect(janggi.label).toBe("장기");
    expect(janggi.size).toBe(9);
    expect(janggi.boardClass).toBe("janggi");
  });

  it("커넥트포 메타는 7열·.board.connectfour를 쓴다", () => {
    const cf = SELF_PLAY_GAMES.find((g) => g.key === "connectfour")!;
    expect(cf.label).toBe("커넥트포");
    expect(cf.size).toBe(7);
    expect(cf.boardClass).toBe("connectfour");
  });

  it("틱택토 메타는 3열·.board.tictactoe를 쓴다", () => {
    const ttt = SELF_PLAY_GAMES.find((g) => g.key === "tictactoe")!;
    expect(ttt.label).toBe("틱택토");
    expect(ttt.size).toBe(3);
    expect(ttt.boardClass).toBe("tictactoe");
  });

  it("도트 앤 박스 메타가 포함된다(.board.dotsandboxes)", () => {
    const dots = SELF_PLAY_GAMES.find((g) => g.key === "dotsandboxes")!;
    expect(dots).toBeDefined();
    expect(dots.label).toBe("도트 앤 박스");
    expect(dots.boardClass).toBe("dotsandboxes");
  });

  it("체커 메타는 8열·.board.checkers를 쓴다", () => {
    const checkers = SELF_PLAY_GAMES.find((g) => g.key === "checkers")!;
    expect(checkers.label).toBe("체커");
    expect(checkers.size).toBe(8);
    expect(checkers.boardClass).toBe("checkers");
  });

  it("만칼라 메타가 포함된다(.board.mancala)", () => {
    const mancala = SELF_PLAY_GAMES.find((g) => g.key === "mancala")!;
    expect(mancala).toBeDefined();
    expect(mancala.label).toBe("만칼라");
    expect(mancala.boardClass).toBe("mancala");
  });
});

describe("runSelfPlay", () => {
  const games: SelfPlayGameKey[] = [
    "gomoku",
    "go",
    "reversi",
    "janggi",
    "connectfour",
    "tictactoe",
    "dotsandboxes",
    "checkers",
    "mancala",
    "nim",
  ];

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

  it("도트 앤 박스: 동일 rng면 동일 종국 결과를 낸다(throw 없음)", () => {
    const a = runSelfPlay("dotsandboxes", seededRng(2026));
    const b = runSelfPlay("dotsandboxes", seededRng(2026));
    expect(a.status.over).toBe(true);
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
    // 3×3 박스 = 변 24개. 보너스 턴이 있어도 모든 변을 그어야 종국한다.
    expect(a.moveCount).toBe(24);
  });

  it("체커: 동일 rng면 동일 종국 결과를 낸다", () => {
    const a = runSelfPlay("checkers", seededRng(12345));
    const b = runSelfPlay("checkers", seededRng(12345));
    expect(a.status.over).toBe(true);
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
  });

  it("만칼라: 동일 rng면 동일 종국 결과를 낸다(유한 게임, 수 제한 불필요)", () => {
    const a = runSelfPlay("mancala", seededRng(12345));
    const b = runSelfPlay("mancala", seededRng(12345));
    expect(a.status.over).toBe(true);
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
  });

  it("님: 종료까지 진행되고 승자가 존재한다(무승부 없음·유한 게임)", () => {
    const result = runSelfPlay("nim", seededRng(12345));
    expect(result.status.over).toBe(true);
    expect(result.status.draw).toBe(false);
    // 표준 플레이 님은 마지막 돌을 가져간 쪽이 항상 승자(무승부 없음).
    expect(result.status.winner).not.toBeNull();
    expect(result.moveCount).toBeGreaterThan(0);
  });

  it("님: 동일 rng면 동일 종국 결과를 낸다(수 제한 불필요)", () => {
    const a = runSelfPlay("nim", seededRng(777));
    const b = runSelfPlay("nim", seededRng(777));
    expect(a.status.over).toBe(true);
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.status).toEqual(b.status);
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

  it("커넥트포 승자는 1P(●)/2P(○)로 매핑한다", () => {
    const p1 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 7),
      "connectfour",
    );
    const p2 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 8),
      "connectfour",
    );
    expect(p1.outcome).toBe("1P(●) 승리 🎉");
    expect(p2.outcome).toBe("2P(○) 승리 🎉");
  });

  it("틱택토 승자는 X(선)/O(후)로 매핑하고 무승부도 구분한다", () => {
    const x = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 5),
      "tictactoe",
    );
    const o = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 6),
      "tictactoe",
    );
    const draw = describeSelfPlayResult(
      resultWith({ over: true, winner: null, draw: true }, 9),
      "tictactoe",
    );
    expect(x.outcome).toBe("X(선) 승리 🎉");
    expect(o.outcome).toBe("O(후) 승리 🎉");
    expect(draw.outcome).toBe("무승부 🤝");
  });

  it("도트 앤 박스 승자는 1P/2P로 매핑하고 무승부도 구분한다", () => {
    const p1 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 24),
      "dotsandboxes",
    );
    const p2 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 24),
      "dotsandboxes",
    );
    const draw = describeSelfPlayResult(
      resultWith({ over: true, winner: null, draw: true }, 24),
      "dotsandboxes",
    );
    expect(p1.outcome).toBe("1P 승리 🎉");
    expect(p2.outcome).toBe("2P 승리 🎉");
    expect(draw.outcome).toBe("무승부 🤝");
  });

  it("체커 승자는 흑(선)/백(후)로 매핑한다(색 비의존)", () => {
    const dark = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 44),
      "checkers",
    );
    const light = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 54),
      "checkers",
    );
    expect(dark.outcome).toBe("흑(선) 승리 🎉");
    expect(light.outcome).toBe("백(후) 승리 🎉");
  });

  it("만칼라 승자는 1P/2P로 매핑하고 무승부도 구분한다", () => {
    const p1 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 29),
      "mancala",
    );
    const p2 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 30),
      "mancala",
    );
    const draw = describeSelfPlayResult(
      resultWith({ over: true, winner: null, draw: true }, 31),
      "mancala",
    );
    expect(p1.outcome).toBe("1P 승리 🎉");
    expect(p2.outcome).toBe("2P 승리 🎉");
    expect(draw.outcome).toBe("무승부 🤝");
  });

  it("님 승자는 1P(선)/2P(후)로 매핑한다(흑/백이 아님·무승부 없음)", () => {
    const p1 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p1", draw: false }, 7),
      "nim",
    );
    const p2 = describeSelfPlayResult(
      resultWith({ over: true, winner: "p2", draw: false }, 8),
      "nim",
    );
    expect(p1.outcome).toBe("1P(선) 승리 🎉");
    expect(p2.outcome).toBe("2P(후) 승리 🎉");
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

  it("체커: 정상 종국이면 흑/백 승자 문구를 반환한다", () => {
    const run = runAndDescribeSelfPlay("checkers", seededRng(12345));
    expect(run.unfinished).toBe(false);
    expect(run.result).not.toBeNull();
    expect(run.outcome).toMatch(/(흑\(선\)|백\(후\)) 승리/);
  });

  it("체커: 수 제한(maxMoves=1) 도달 시 무종국 문구로 우아하게 처리한다", () => {
    // maxMoves=1로는 체커가 끝나지 않으므로 playEngineGame throw → 무종국 처리(크래시 없음).
    const run = runAndDescribeSelfPlay("checkers", seededRng(12345), 1);
    expect(run.unfinished).toBe(true);
    expect(run.result).toBeNull();
    expect(run.outcome).toContain("무종국");
  });

  it("만칼라: 정상 종국이면 1P/2P 승자 또는 무승부 문구를 반환한다", () => {
    const run = runAndDescribeSelfPlay("mancala", seededRng(12345));
    expect(run.unfinished).toBe(false);
    expect(run.result).not.toBeNull();
    expect(run.outcome).toMatch(/(1P|2P) 승리|무승부/);
  });

  it("님: 정상 종국이면 1P(선)/2P(후) 승자 문구를 반환한다(무승부 없음)", () => {
    const run = runAndDescribeSelfPlay("nim", seededRng(12345));
    expect(run.unfinished).toBe(false);
    expect(run.result).not.toBeNull();
    expect(run.outcome).toMatch(/(1P\(선\)|2P\(후\)) 승리/);
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

describe("selfPlayGlyphBoard", () => {
  it("오델로(흑/백 돌)를 ●/○ 글리프로 매핑한다(색 비의존 클래스)", () => {
    const board = selfPlayGlyphBoard(runSelfPlay("reversi", seededRng(3)), "reversi");
    expect(board.length).toBe(8);
    const cells = board.flat().filter((c) => c !== null);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(["●", "○"]).toContain(c!.glyph);
      expect(c!.className).toMatch(/^stone (black|white)$/);
    }
  });

  it("커넥트포 보드(1/2)를 ●/○·.disc.p1/p2로 매핑한다", () => {
    const board = selfPlayGlyphBoard(
      runSelfPlay("connectfour", seededRng(42)),
      "connectfour",
    );
    expect(board.length).toBe(6);
    expect(board[0]!.length).toBe(7);
    for (const c of board.flat().filter((c) => c !== null)) {
      expect(["●", "○"]).toContain(c!.glyph);
      expect(c!.className).toMatch(/^disc p[12]$/);
    }
  });

  it("틱택토 보드(X/O)를 X/O·.ttt-mark로 매핑한다", () => {
    const board = selfPlayGlyphBoard(
      runSelfPlay("tictactoe", seededRng(123)),
      "tictactoe",
    );
    expect(board.length).toBe(3);
    expect(board[0]!.length).toBe(3);
    for (const c of board.flat().filter((c) => c !== null)) {
      expect(["X", "O"]).toContain(c!.glyph);
      expect(c!.className).toMatch(/^ttt-mark mark-[XO]$/);
    }
  });

  it("board가 없으면 빈 배열을 반환한다", () => {
    const board = selfPlayGlyphBoard(
      resultWith({ over: true, winner: null, draw: true }, 0),
      "connectfour",
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

describe("selfPlayDotsBoard", () => {
  it("실제 도트 앤 박스 자동 대국 결과에서 DotsBoard를 추출한다(종국=모든 변)", () => {
    const board = selfPlayDotsBoard(runSelfPlay("dotsandboxes", seededRng(2026)));
    expect(board.rows).toBe(3);
    expect(board.cols).toBe(3);
    // 모든 박스가 누군가에게 소유됐다(빈 박스 없음 = 종국).
    expect(board.boxes.flat().every((owner) => owner === 1 || owner === 2)).toBe(true);
  });

  it("board가 없으면 빈 격자(0×0)를 반환한다", () => {
    const board = selfPlayDotsBoard(
      resultWith({ over: true, winner: null, draw: true }, 0),
    );
    expect(board.rows).toBe(0);
    expect(board.cols).toBe(0);
    expect(board.boxes).toEqual([]);
    expect(board.edges).toEqual({ h: [], v: [] });
  });
});

describe("selfPlayCheckersBoard", () => {
  it("실제 체커 자동 대국 결과에서 8×8 기물 보드를 추출한다", () => {
    const board = selfPlayCheckersBoard(runSelfPlay("checkers", seededRng(12345)));
    expect(board.length).toBe(8);
    expect(board[0]!.length).toBe(8);
  });

  it("board가 없으면 빈 배열을 반환한다", () => {
    const board = selfPlayCheckersBoard(
      resultWith({ over: true, winner: "p1", draw: false }, 0),
    );
    expect(board).toEqual([]);
  });
});

describe("selfPlayMancalaBoard", () => {
  it("실제 만칼라 자동 대국 결과에서 구덩이·곳간 보드를 추출한다(종국)", () => {
    const board = selfPlayMancalaBoard(runSelfPlay("mancala", seededRng(12345)));
    expect(board.pitsPerSide).toBe(6);
    expect(board.pits[1].length).toBe(6);
    expect(board.pits[2].length).toBe(6);
    // 종국: 한쪽 구덩이가 전부 비었다(0).
    const side1Empty = board.pits[1].every((s) => s === 0);
    const side2Empty = board.pits[2].every((s) => s === 0);
    expect(side1Empty || side2Empty).toBe(true);
  });

  it("board가 없거나 형태가 다르면 빈 기본 보드를 반환한다", () => {
    const board = selfPlayMancalaBoard(
      resultWith({ over: true, winner: null, draw: true }, 0),
    );
    expect(board.pitsPerSide).toBe(0);
    expect(board.pits).toEqual({ 1: [], 2: [] });
    expect(board.stores).toEqual({ 1: 0, 2: 0 });
  });
});

describe("selfPlayNimBoard", () => {
  it("실제 님 자동 대국 결과에서 최종 더미(돌 수 배열)를 추출한다(종국=모두 0)", () => {
    const piles = selfPlayNimBoard(runSelfPlay("nim", seededRng(12345)));
    // 기본 배치 [3,5,7] = 더미 3개.
    expect(piles.length).toBe(3);
    // 표준 플레이 종국 상태는 모든 더미가 비었다(0).
    expect(piles.every((s) => s === 0)).toBe(true);
  });

  it("piles가 없거나 형태가 다르면 빈 배열을 반환한다", () => {
    expect(
      selfPlayNimBoard(resultWith({ over: true, winner: "p1", draw: false }, 0)),
    ).toEqual([]);
  });
});
