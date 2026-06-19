import { describe, it, expect } from "vitest";
import {
  isClientMessage,
  isServerMessage,
  type ClientMessage,
  type ServerMessage,
} from "./protocol";
import type { GameStatus, Side } from "./gameEngine";
import type { GameRecord } from "../domain/gameRecord";

const PLAYING: GameStatus = { over: false, winner: null, draw: false };
const P1_WIN: GameStatus = { over: true, winner: "p1", draw: false };
const RECORD: GameRecord = {
  game: "gomoku",
  outcomes: [
    { player: "a", result: "win" },
    { player: "b", result: "loss" },
  ],
};

describe("isClientMessage", () => {
  it("accepts each valid client message", () => {
    const valid: ClientMessage[] = [
      { type: "joinRoom", roomCode: "ABCD" },
      { type: "makeMove", gameType: "gomoku", move: { x: 1, y: 2 } },
      { type: "submitSetup", gameType: "battleship", payload: { ships: [] } },
      { type: "leaveRoom" },
      { type: "requestRematch" },
      { type: "listRooms" },
    ];
    for (const msg of valid) {
      expect(isClientMessage(msg)).toBe(true);
    }
  });

  it("accepts makeMove with any move payload (serialization out of scope)", () => {
    expect(isClientMessage({ type: "makeMove", gameType: "go", move: null })).toBe(true);
    expect(isClientMessage({ type: "makeMove", gameType: "go", move: "encoded" })).toBe(true);
    expect(isClientMessage({ type: "makeMove", gameType: "go", move: 42 })).toBe(true);
  });

  it("accepts submitSetup with any payload (serialization out of scope)", () => {
    expect(isClientMessage({ type: "submitSetup", gameType: "battleship", payload: null })).toBe(true);
    expect(isClientMessage({ type: "submitSetup", gameType: "battleship", payload: 0 })).toBe(true);
  });

  it("rejects submitSetup with a missing/invalid gameType or missing payload", () => {
    expect(isClientMessage({ type: "submitSetup", payload: {} })).toBe(false);
    expect(isClientMessage({ type: "submitSetup", gameType: "", payload: {} })).toBe(false);
    expect(isClientMessage({ type: "submitSetup", gameType: "battleship" })).toBe(false);
  });

  it("rejects unknown or missing type", () => {
    expect(isClientMessage({ type: "nope" })).toBe(false);
    expect(isClientMessage({})).toBe(false);
    expect(isClientMessage({ roomCode: "ABCD" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isClientMessage(null)).toBe(false);
    expect(isClientMessage(undefined)).toBe(false);
    expect(isClientMessage("joinRoom")).toBe(false);
    expect(isClientMessage(42)).toBe(false);
    expect(isClientMessage([])).toBe(false);
  });

  it("rejects joinRoom without a non-empty roomCode", () => {
    expect(isClientMessage({ type: "joinRoom" })).toBe(false);
    expect(isClientMessage({ type: "joinRoom", roomCode: "" })).toBe(false);
    expect(isClientMessage({ type: "joinRoom", roomCode: 123 })).toBe(false);
  });

  it("rejects makeMove with a missing/invalid gameType or missing move", () => {
    expect(isClientMessage({ type: "makeMove", move: {} })).toBe(false);
    expect(isClientMessage({ type: "makeMove", gameType: "", move: {} })).toBe(false);
    expect(isClientMessage({ type: "makeMove", gameType: 5, move: {} })).toBe(false);
    expect(isClientMessage({ type: "makeMove", gameType: "gomoku" })).toBe(false);
  });
});

describe("isServerMessage", () => {
  it("accepts each valid server message", () => {
    const valid: ServerMessage[] = [
      {
        type: "roomState",
        roomCode: "ABCD",
        players: [
          { side: "p1", kind: "human", label: "나" },
          { side: "p2", kind: "ai", label: "CPU" },
        ],
      },
      { type: "gameState", gameType: "gomoku", state: { board: [] }, status: PLAYING, turn: "p1" },
      { type: "setupState", gameType: "battleship", setup: { p1Ships: [], p2Ships: null } },
      { type: "error", reason: "방이 가득 찼습니다" },
      { type: "gameOver", record: RECORD },
    ];
    for (const msg of valid) {
      expect(isServerMessage(msg)).toBe(true);
    }
  });

  it("accepts setupState with any setup payload, rejects missing gameType/setup", () => {
    expect(isServerMessage({ type: "setupState", gameType: "battleship", setup: null })).toBe(true);
    expect(isServerMessage({ type: "setupState", gameType: "battleship" })).toBe(false);
    expect(isServerMessage({ type: "setupState", gameType: "", setup: {} })).toBe(false);
  });

  it("accepts roomState with an empty players list", () => {
    expect(isServerMessage({ type: "roomState", roomCode: "ABCD", players: [] })).toBe(true);
  });

  it("accepts seated with a valid side + roomCode, rejects bad side/roomCode", () => {
    expect(isServerMessage({ type: "seated", side: "p1", roomCode: "ABCD" })).toBe(true);
    expect(isServerMessage({ type: "seated", side: "p2", roomCode: "ABCD" })).toBe(true);
    expect(isServerMessage({ type: "seated", side: "p3", roomCode: "ABCD" })).toBe(false);
    expect(isServerMessage({ type: "seated", side: "p1", roomCode: "" })).toBe(false);
    expect(isServerMessage({ type: "seated", side: "p1" })).toBe(false);
  });

  it("accepts roomList with valid room summaries, rejects malformed entries", () => {
    expect(isServerMessage({ type: "roomList", rooms: [] })).toBe(true);
    expect(
      isServerMessage({
        type: "roomList",
        rooms: [{ code: "ABCD", gameType: "battleship", players: 1, phase: "waiting" }],
      }),
    ).toBe(true);
    expect(
      isServerMessage({
        type: "roomList",
        rooms: [{ code: "ABCD", gameType: "battleship", players: 1, phase: "nope" }],
      }),
    ).toBe(false);
    expect(isServerMessage({ type: "roomList" })).toBe(false);
  });

  it("accepts gameState with any state payload (serialization out of scope)", () => {
    expect(
      isServerMessage({ type: "gameState", gameType: "go", state: null, status: P1_WIN, turn: "p2" }),
    ).toBe(true);
  });

  it("rejects unknown or missing type", () => {
    expect(isServerMessage({ type: "nope" })).toBe(false);
    expect(isServerMessage({})).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isServerMessage(null)).toBe(false);
    expect(isServerMessage(undefined)).toBe(false);
    expect(isServerMessage("roomState")).toBe(false);
    expect(isServerMessage([])).toBe(false);
  });

  it("rejects roomState with an invalid roomCode or players entry", () => {
    expect(isServerMessage({ type: "roomState", roomCode: "", players: [] })).toBe(false);
    expect(isServerMessage({ type: "roomState", roomCode: "ABCD" })).toBe(false);
    expect(
      isServerMessage({ type: "roomState", roomCode: "ABCD", players: [{ side: "p3", kind: "human", label: "x" }] }),
    ).toBe(false);
    expect(
      isServerMessage({ type: "roomState", roomCode: "ABCD", players: [{ side: "p1", kind: "human", label: "" }] }),
    ).toBe(false);
    expect(
      isServerMessage({ type: "roomState", roomCode: "ABCD", players: [{ side: "p1", kind: "robot", label: "x" }] }),
    ).toBe(false);
  });

  it("rejects gameState with a missing/invalid status or turn", () => {
    expect(
      isServerMessage({ type: "gameState", gameType: "go", state: {}, status: PLAYING }),
    ).toBe(false);
    expect(
      isServerMessage({ type: "gameState", gameType: "go", state: {}, status: PLAYING, turn: "x" }),
    ).toBe(false);
    expect(
      isServerMessage({ type: "gameState", gameType: "go", status: PLAYING, turn: "p1" }),
    ).toBe(false);
    expect(
      isServerMessage({
        type: "gameState",
        gameType: "go",
        state: {},
        status: { over: false, draw: false },
        turn: "p1",
      }),
    ).toBe(false);
    expect(
      isServerMessage({
        type: "gameState",
        gameType: "go",
        state: {},
        status: { over: false, winner: "p3", draw: false },
        turn: "p1",
      }),
    ).toBe(false);
  });

  it("rejects error without a non-empty reason", () => {
    expect(isServerMessage({ type: "error" })).toBe(false);
    expect(isServerMessage({ type: "error", reason: "" })).toBe(false);
    expect(isServerMessage({ type: "error", reason: 500 })).toBe(false);
  });

  it("rejects gameOver with an invalid record", () => {
    expect(isServerMessage({ type: "gameOver" })).toBe(false);
    expect(isServerMessage({ type: "gameOver", record: { game: "gomoku", outcomes: [] } })).toBe(false);
    expect(
      isServerMessage({
        type: "gameOver",
        record: { game: "gomoku", outcomes: [{ player: "a", result: "win" }] },
      }),
    ).toBe(false);
    expect(
      isServerMessage({
        type: "gameOver",
        record: { game: "", outcomes: RECORD.outcomes },
      }),
    ).toBe(false);
    expect(
      isServerMessage({
        type: "gameOver",
        record: {
          game: "gomoku",
          outcomes: [
            { player: "a", result: "win" },
            { player: "b", result: "bogus" },
          ],
        },
      }),
    ).toBe(false);
  });
});

describe("discriminated union narrowing (type-level regression)", () => {
  it("narrows ClientMessage by type", () => {
    const msg = { type: "makeMove", gameType: "gomoku", move: { x: 0, y: 0 } } as unknown;
    expect(isClientMessage(msg)).toBe(true);
    if (isClientMessage(msg) && msg.type === "makeMove") {
      // Compile-time: gameType is GameId, move is unknown — narrowing must succeed.
      const gameType: string = msg.gameType;
      expect(gameType).toBe("gomoku");
    }
  });

  it("narrows ServerMessage by type", () => {
    const msg = { type: "gameOver", record: RECORD } as unknown;
    expect(isServerMessage(msg)).toBe(true);
    if (isServerMessage(msg) && msg.type === "gameOver") {
      // Compile-time: record is GameRecord — accessing record.game must type-check.
      const side: Side = "p1";
      expect(side).toBe("p1");
      expect(msg.record.game).toBe("gomoku");
    }
  });
});
