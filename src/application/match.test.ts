import { describe, it, expect } from "vitest";
import {
  createMatch,
  createMatchFromState,
  applyMatchMove,
  currentTurn,
  playerOnTurn,
  matchStatus,
  buildMatchRecord,
  MatchMoveError,
  type Player,
  type MatchState,
} from "./match";
import { createGomokuEngine } from "./gameEngine";
import { createTicTacToeEngine } from "./ticTacToeEngine";

const alice: Player = { id: "a", side: "p1", kind: "human", label: "Alice" };
const bob: Player = { id: "b", side: "p2", kind: "ai", label: "Bob" };

/** 결정적 시각 포트(고정값). */
const fixedNow = { now: () => 1700000000000 };

/** 수순을 순서대로 적용한다(by는 각 수마다 명시). */
function applyAll<S, M>(
  match: MatchState<S, M>,
  moves: ReadonlyArray<{ by: "p1" | "p2"; move: M }>,
): MatchState<S, M> {
  return moves.reduce(
    (m, { by, move }) => applyMatchMove(m, by, move),
    match,
  );
}

describe("createMatch — 플레이어 쌍 검증·초기 상태", () => {
  it("정상 {p1, p2} 쌍이면 빈 로그·엔진 초기 상태로 시작", () => {
    const match = createMatch(createTicTacToeEngine(), [alice, bob]);
    expect(match.log).toEqual([]);
    expect(match.players).toEqual([alice, bob]);
    expect(currentTurn(match)).toBe("p1");
    expect(playerOnTurn(match)).toEqual(alice);
    expect(matchStatus(match).over).toBe(false);
  });

  it("side가 중복이면 거부(p1,p1)", () => {
    const dupe: Player = { ...bob, side: "p1" };
    expect(() => createMatch(createTicTacToeEngine(), [alice, dupe])).toThrow(
      /p1, p2/,
    );
  });

  it("한 side가 누락이면 거부(p2,p2 → p1 없음)", () => {
    const onlyP2a: Player = { ...alice, side: "p2" };
    expect(() =>
      createMatch(createTicTacToeEngine(), [onlyP2a, bob]),
    ).toThrow();
  });

  it("config(size)를 엔진 init에 전달한다(게임 무관)", () => {
    const match = createMatch(createGomokuEngine(), [alice, bob], { size: 9 });
    // 9×9 보드로 초기화됐는지 상태로 확인.
    expect((match.state as { board: unknown[] }).board.length).toBe(9);
  });
});

describe("createMatchFromState — 합성된 초기 상태로 진입", () => {
  it("engine.init을 호출하지 않고 주어진 state를 그대로 채택한다", () => {
    const engine = createGomokuEngine();
    // init({size:9})로 만든 9×9 상태를 외부에서 합성해 그대로 진입(예: setup 완료 후).
    const preset = engine.init({ size: 9 });
    const match = createMatchFromState(engine, [alice, bob], preset);
    expect(match.state).toBe(preset); // 같은 참조(재초기화 없음)
    expect(match.log).toEqual([]);
    expect(match.players).toEqual([alice, bob]);
    expect(currentTurn(match)).toBe("p1");
  });

  it("side 쌍 검증은 createMatch와 동일(중복/누락 거부)", () => {
    const engine = createTicTacToeEngine();
    const dupe: Player = { ...bob, side: "p1" };
    expect(() => createMatchFromState(engine, [alice, dupe], engine.init())).toThrow(
      /p1, p2/,
    );
  });
});

describe("applyMatchMove — 턴 소유권·거부 사유", () => {
  it("차례가 아닌 side가 두면 not_on_turn 거부(불변)", () => {
    const match = createMatch(createGomokuEngine(), [alice, bob]);
    expect(() => applyMatchMove(match, "p2", { x: 0, y: 0 })).toThrowError(
      MatchMoveError,
    );
    try {
      applyMatchMove(match, "p2", { x: 0, y: 0 });
    } catch (e) {
      expect((e as MatchMoveError).code).toBe("not_on_turn");
    }
    // 입력 match는 변형되지 않는다.
    expect(match.log).toEqual([]);
  });

  it("불법 수(점유된 칸)는 illegal_move 거부", () => {
    let match = createMatch(createGomokuEngine(), [alice, bob]);
    match = applyMatchMove(match, "p1", { x: 0, y: 0 });
    // p2가 이미 둔 칸에 두려 함.
    try {
      applyMatchMove(match, "p2", { x: 0, y: 0 });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(MatchMoveError);
      expect((e as MatchMoveError).code).toBe("illegal_move");
    }
  });

  it("종료 후 착수는 match_over 거부", () => {
    // 틱택토에서 p1 상단 가로 완성.
    let match = createMatch(createTicTacToeEngine(), [alice, bob]);
    match = applyAll(match, [
      { by: "p1", move: { row: 0, col: 0 } },
      { by: "p2", move: { row: 1, col: 0 } },
      { by: "p1", move: { row: 0, col: 1 } },
      { by: "p2", move: { row: 1, col: 1 } },
      { by: "p1", move: { row: 0, col: 2 } },
    ]);
    expect(matchStatus(match)).toEqual({
      over: true,
      winner: "p1",
      draw: false,
    });
    try {
      applyMatchMove(match, "p2", { row: 2, col: 2 });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(MatchMoveError);
      expect((e as MatchMoveError).code).toBe("match_over");
    }
  });

  it("정상 진행 시 log가 쌓이고 turn이 p1↔p2로 전이", () => {
    let match = createMatch(createGomokuEngine(), [alice, bob]);
    expect(currentTurn(match)).toBe("p1");
    match = applyMatchMove(match, "p1", { x: 0, y: 0 });
    expect(currentTurn(match)).toBe("p2");
    expect(playerOnTurn(match)).toEqual(bob);
    match = applyMatchMove(match, "p2", { x: 1, y: 0 });
    expect(currentTurn(match)).toBe("p1");
    expect(match.log).toEqual([
      { by: "p1", move: { x: 0, y: 0 } },
      { by: "p2", move: { x: 1, y: 0 } },
    ]);
  });

  it("동일 입력은 항상 동일 결과(결정적)·입력 불변", () => {
    const match = createMatch(createGomokuEngine(), [alice, bob]);
    const a = applyMatchMove(match, "p1", { x: 2, y: 3 });
    const b = applyMatchMove(match, "p1", { x: 2, y: 3 });
    expect(a.log).toEqual(b.log);
    expect(a.state).toEqual(b.state);
    // 원본은 그대로.
    expect(match.log).toEqual([]);
  });
});

describe("buildMatchRecord — 종료 전 null·승자/무승부 매핑", () => {
  it("미종료면 null", () => {
    const match = createMatch(createGomokuEngine(), [alice, bob]);
    expect(buildMatchRecord(match, "gomoku", fixedNow)).toBeNull();
  });

  it("p1 승리 시 라벨로 win/loss 매핑(gomoku)", () => {
    let match = createMatch(createGomokuEngine(), [alice, bob]);
    match = applyAll(match, [
      { by: "p1", move: { x: 0, y: 0 } },
      { by: "p2", move: { x: 0, y: 1 } },
      { by: "p1", move: { x: 1, y: 0 } },
      { by: "p2", move: { x: 1, y: 1 } },
      { by: "p1", move: { x: 2, y: 0 } },
      { by: "p2", move: { x: 2, y: 1 } },
      { by: "p1", move: { x: 3, y: 0 } },
      { by: "p2", move: { x: 3, y: 1 } },
      { by: "p1", move: { x: 4, y: 0 } },
    ]);
    expect(matchStatus(match).winner).toBe("p1");
    const record = buildMatchRecord(match, "gomoku", fixedNow);
    expect(record).toEqual({
      game: "gomoku",
      outcomes: [
        { player: "Alice", result: "win" },
        { player: "Bob", result: "loss" },
      ],
    });
  });

  it("무승부 시 둘 다 draw로 매핑(tictactoe)", () => {
    let match = createMatch(createTicTacToeEngine(), [alice, bob]);
    // 9수 무승부 보드: XOX / XXO / OXO
    match = applyAll(match, [
      { by: "p1", move: { row: 0, col: 0 } }, // X
      { by: "p2", move: { row: 0, col: 1 } }, // O
      { by: "p1", move: { row: 0, col: 2 } }, // X
      { by: "p2", move: { row: 1, col: 2 } }, // O
      { by: "p1", move: { row: 1, col: 0 } }, // X
      { by: "p2", move: { row: 2, col: 0 } }, // O
      { by: "p1", move: { row: 1, col: 1 } }, // X
      { by: "p2", move: { row: 2, col: 2 } }, // O
      { by: "p1", move: { row: 2, col: 1 } }, // X
    ]);
    expect(matchStatus(match)).toEqual({
      over: true,
      winner: null,
      draw: true,
    });
    const record = buildMatchRecord(match, "tictactoe", fixedNow);
    expect(record).toEqual({
      game: "tictactoe",
      outcomes: [
        { player: "Alice", result: "draw" },
        { player: "Bob", result: "draw" },
      ],
    });
  });

  it("시각 포트(now)를 주입받아 호출한다(직접 Date.now 미사용)", () => {
    let called = 0;
    const nowPort = {
      now: () => {
        called += 1;
        return 42;
      },
    };
    let match = createMatch(createTicTacToeEngine(), [alice, bob]);
    match = applyAll(match, [
      { by: "p1", move: { row: 0, col: 0 } },
      { by: "p2", move: { row: 1, col: 0 } },
      { by: "p1", move: { row: 0, col: 1 } },
      { by: "p2", move: { row: 1, col: 1 } },
      { by: "p1", move: { row: 0, col: 2 } },
    ]);
    buildMatchRecord(match, "tictactoe", nowPort);
    expect(called).toBe(1);
  });
});
