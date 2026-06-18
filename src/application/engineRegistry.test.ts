import { describe, it, expect } from "vitest";
import type { GameId } from "../domain/gameRecord";
import type { Side } from "./gameEngine";
import {
  MULTIPLAYER_GAME_IDS,
  isMultiplayerGame,
  createEngineFor,
  UnsupportedGameTypeError,
  UNSUPPORTED_GAME_TYPE,
} from "./engineRegistry";

const EXPECTED_MULTIPLAYER: readonly GameId[] = [
  "checkers",
  "chess",
  "connectfour",
  "gomoku",
  "go",
  "janggi",
  "mancala",
  "nim",
  "reversi",
  "tictactoe",
  "dotsandboxes",
];

describe("MULTIPLAYER_GAME_IDS — 화이트리스트", () => {
  it("멀티 지원 11종을 정확히 담는다", () => {
    expect([...MULTIPLAYER_GAME_IDS].sort()).toEqual(
      [...EXPECTED_MULTIPLAYER].sort(),
    );
    expect(MULTIPLAYER_GAME_IDS).toHaveLength(11);
  });
});

describe("isMultiplayerGame", () => {
  it("화이트리스트 11종은 모두 true", () => {
    for (const id of EXPECTED_MULTIPLAYER) {
      expect(isMultiplayerGame(id)).toBe(true);
    }
  });

  it("비멀티 GameId는 false (rps, sudoku 등)", () => {
    const nonMultiplayer: GameId[] = [
      "rps",
      "sudoku",
      "minesweeper",
      "wordle",
      "card",
    ];
    for (const id of nonMultiplayer) {
      expect(isMultiplayerGame(id)).toBe(false);
    }
  });
});

describe("createEngineFor — 화이트리스트 11종 라운드 스모크", () => {
  for (const id of EXPECTED_MULTIPLAYER) {
    it(`${id}: 엔진을 반환하고 init/turn/status가 정상 동작`, () => {
      const engine = createEngineFor(id);
      const init = engine.init();
      expect(init).toBeDefined();

      const turn: Side = engine.turn(init);
      expect(turn === "p1" || turn === "p2").toBe(true);

      const status = engine.status(init);
      // 초기 상태는 진행 중이어야 한다(한 수도 두기 전).
      expect(status.over).toBe(false);
      expect(status.winner).toBeNull();
      expect(status.draw).toBe(false);
    });
  }

  it("go: config.komi를 팩토리에 전달해도 init/turn/status 정상", () => {
    const engine = createEngineFor("go", { komi: 6.5 });
    const init = engine.init();
    expect(engine.turn(init)).toBe("p1");
    expect(engine.status(init).over).toBe(false);
  });
});

describe("createEngineFor — 미지원 gameType 거부", () => {
  it("비멀티 gameType은 안정 코드와 함께 throw", () => {
    expect(() => createEngineFor("rps")).toThrow(UnsupportedGameTypeError);
    try {
      createEngineFor("sudoku");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedGameTypeError);
      expect((err as UnsupportedGameTypeError).code).toBe(UNSUPPORTED_GAME_TYPE);
      expect((err as UnsupportedGameTypeError).gameType).toBe("sudoku");
    }
  });
});
