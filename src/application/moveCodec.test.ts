import { describe, it, expect } from "vitest";
import { parseEngineMove } from "./moveCodec";
import type { GameId } from "../domain/gameRecord";
import type { CheckersMove } from "../domain/checkers";
import type { DotsEdge } from "../domain/dotsAndBoxes";
import type { NimMove } from "../domain/nim";
import type { Side } from "./gameEngine";
import { createGomokuEngine, type GomokuMove } from "./gameEngine";
import { createGoEngine, type GoMove } from "./goEngine";
import { createConnectFourEngine, type ConnectFourMove } from "./connectFourEngine";
import { createChessEngine, type ChessMove } from "./chessEngine";
import { createJanggiEngine, type JanggiMove } from "./janggiEngine";
import { createReversiEngine, type ReversiMove } from "./reversiEngine";
import { createTicTacToeEngine, type TicTacToeMove } from "./ticTacToeEngine";
import { createCheckersEngine } from "./checkersEngine";
import { createDotsAndBoxesEngine } from "./dotsAndBoxesEngine";
import { createMancalaEngine } from "./mancalaEngine";
import { createNimEngine } from "./nimEngine";

describe("parseEngineMove — 형태 호환 스모크 (a: 대표 Move 통과 + 엔진 isLegal에 넘길 수 있음)", () => {
  it("gomoku: { x, y } 좌표가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createGomokuEngine();
    const state = engine.init();
    const r = parseEngineMove("gomoku", { x: 0, y: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as GomokuMove, by)).toBe(true);
    }
  });

  it("reversi: { x, y } 좌표가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createReversiEngine();
    const state = engine.init();
    const r = parseEngineMove("reversi", { x: 2, y: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(typeof engine.isLegal(state, r.move as ReversiMove, by)).toBe("boolean");
    }
  });

  it("go: { x, y } 좌표가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createGoEngine();
    const state = engine.init();
    const r = parseEngineMove("go", { x: 0, y: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as GoMove, by)).toBe(true);
    }
  });

  it("tictactoe: { row, col } 좌표가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createTicTacToeEngine();
    const state = engine.init();
    const r = parseEngineMove("tictactoe", { row: 0, col: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as TicTacToeMove, by)).toBe(true);
    }
  });

  it("connectfour: { col } 가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createConnectFourEngine();
    const state = engine.init();
    const r = parseEngineMove("connectfour", { col: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as ConnectFourMove, by)).toBe(true);
    }
  });

  it("chess: { from:{row,col}, to:{row,col} } 가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createChessEngine();
    const state = engine.init();
    const r = parseEngineMove("chess", { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(typeof engine.isLegal(state, r.move as ChessMove, by)).toBe("boolean");
    }
  });

  it("janggi: { from:{x,y}, to:{x,y} } 가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createJanggiEngine();
    const state = engine.init();
    const r = parseEngineMove("janggi", { from: { x: 0, y: 0 }, to: { x: 0, y: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(typeof engine.isLegal(state, r.move as JanggiMove, by)).toBe("boolean");
    }
  });

  it("checkers: { from, to, captured? } 가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createCheckersEngine();
    const state = engine.init();
    const r = parseEngineMove("checkers", { from: { row: 5, col: 0 }, to: { row: 4, col: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(typeof engine.isLegal(state, r.move as CheckersMove, by)).toBe("boolean");
    }
  });

  it("mancala: 구덩이 인덱스(number)가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createMancalaEngine();
    const state = engine.init();
    const r = parseEngineMove("mancala", 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as number, by)).toBe(true);
    }
  });

  it("nim: { pile, count } 가 통과하고 엔진과 형태 호환된다", () => {
    const engine = createNimEngine();
    const state = engine.init();
    const r = parseEngineMove("nim", { pile: 0, count: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as NimMove, by)).toBe(true);
    }
  });

  it("dotsandboxes: { orientation, row, col } 변(edge)이 통과하고 엔진과 형태 호환된다", () => {
    const engine = createDotsAndBoxesEngine();
    const state = engine.init();
    const r = parseEngineMove("dotsandboxes", { orientation: "h", row: 0, col: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const by: Side = engine.turn(state);
      expect(engine.isLegal(state, r.move as DotsEdge, by)).toBe(true);
    }
  });
});

describe("parseEngineMove — 변형(variant) 통과 (c)", () => {
  it("go의 \"pass\"가 통과한다", () => {
    const r = parseEngineMove("go", "pass");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.move).toBe("pass");
    }
  });

  it("checkers의 captured(점프) 좌표가 있어도 통과한다", () => {
    const r = parseEngineMove("checkers", {
      from: { row: 5, col: 0 },
      to: { row: 3, col: 2 },
      captured: { row: 4, col: 1 },
    });
    expect(r.ok).toBe(true);
  });
});

describe("parseEngineMove — 형태 깨진 페이로드 거부 (b: malformed_move)", () => {
  // 각 게임에 대해 (필드 누락·타입 불일치·null·문자열 등) 형태가 깨진 입력 표.
  const malformedByGame: Array<{ game: GameId; cases: unknown[] }> = [
    { game: "gomoku", cases: [null, "x0y0", { x: 0 }, { x: "0", y: 0 }, { row: 0, col: 0 }, 5] },
    { game: "reversi", cases: [null, { y: 0 }, { x: 0, y: "1" }, "pass", []] },
    { game: "go", cases: [null, "PASS", { x: 0 }, { x: 0, y: null }, 0, {}] },
    { game: "tictactoe", cases: [null, { row: 0 }, { row: 0, col: "1" }, { x: 0, y: 0 }, "a1"] },
    { game: "connectfour", cases: [null, {}, { col: "0" }, { column: 0 }, 3, "0"] },
    {
      game: "chess",
      cases: [null, {}, { from: { row: 0, col: 0 } }, { from: { row: 0 }, to: { row: 1, col: 1 } }, "e2e4"],
    },
    {
      game: "janggi",
      cases: [null, {}, { from: { x: 0, y: 0 } }, { from: { x: 0 }, to: { x: 1, y: 1 } }, { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }],
    },
    {
      game: "checkers",
      cases: [null, {}, { from: { row: 0, col: 0 } }, { from: { row: 0, col: 0 }, to: { row: 1 } }, { from: { row: 0, col: 0 }, to: { row: 1, col: 1 }, captured: { row: 0 } }],
    },
    { game: "mancala", cases: [null, "0", {}, { pit: 0 }, [], true] },
    { game: "nim", cases: [null, {}, { pile: 0 }, { pile: 0, count: "1" }, 1, "0"] },
    {
      game: "dotsandboxes",
      cases: [null, {}, { orientation: "x", row: 0, col: 0 }, { orientation: "h", row: 0 }, { orientation: "h", row: "0", col: 0 }, "h00"],
    },
  ];

  for (const { game, cases } of malformedByGame) {
    for (const [i, raw] of cases.entries()) {
      it(`${game} 형태 불일치 #${i} → malformed_move`, () => {
        const r = parseEngineMove(game, raw);
        expect(r).toEqual({ ok: false, code: "malformed_move" });
      });
    }
  }
});

describe("parseEngineMove — 멀티 비지원 게임 거부 (unsupported_game)", () => {
  const unsupported: GameId[] = ["rps", "sudoku", "mukjjippa", "blackjack", "wordle"];
  for (const game of unsupported) {
    it(`${game} → unsupported_game (형태가 멀쩡해 보여도 게임 자체가 비지원)`, () => {
      const r = parseEngineMove(game, { x: 0, y: 0 });
      expect(r).toEqual({ ok: false, code: "unsupported_game" });
    });
  }

  it("비지원 게임은 raw를 살펴보기 전에 unsupported_game으로 거부한다", () => {
    expect(parseEngineMove("rps", null)).toEqual({ ok: false, code: "unsupported_game" });
    expect(parseEngineMove("rps", "anything")).toEqual({ ok: false, code: "unsupported_game" });
  });
});

describe("parseEngineMove — 입력 미변형·결정성", () => {
  it("통과 시 입력 raw를 변형하지 않고 동일 참조를 돌려준다", () => {
    const raw = { x: 1, y: 2, extra: "ignored" };
    const before = JSON.stringify(raw);
    const r = parseEngineMove("gomoku", raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 동일 참조(복제·변형 없음).
      expect(r.move).toBe(raw);
    }
    // 입력 객체 자체도 변형되지 않았다.
    expect(JSON.stringify(raw)).toBe(before);
  });

  it("같은 입력에 대해 결정적이다(여러 번 호출해도 동일 결과)", () => {
    const raw = { col: 3 };
    const a = parseEngineMove("connectfour", raw);
    const b = parseEngineMove("connectfour", raw);
    expect(a).toEqual(b);

    const c = parseEngineMove("go", "pass");
    const d = parseEngineMove("go", "pass");
    expect(c).toEqual(d);

    const e = parseEngineMove("sudoku", {});
    const f = parseEngineMove("sudoku", {});
    expect(e).toEqual(f);
  });
});
