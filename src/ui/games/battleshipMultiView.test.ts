import { describe, expect, it } from "vitest";
import type { Side, GameStatus } from "../../application/gameEngine";
import {
  createBattleshipEngine,
  redactBattleshipState,
  type BattleshipEngineState,
} from "../../application/battleshipEngine";
import {
  createBattleshipSetup,
  redactSetup,
  submitFleet,
  type BattleshipSetupState,
} from "../../application/battleshipSetup";
import type { Ship } from "../../domain/battleship";
import {
  battleshipMatchSeatView,
  battleshipMultiRecordAction,
  battleshipRoomPhase,
  battleshipSetupSeatView,
  opponentTurnLabel,
  type BattleshipSeatInput,
} from "./battleshipMultiView";

// 작은 격자/함대로 결정적 상태를 만든다(규칙은 application/domain에 위임 — 여기선 redact된 결과를 신뢰).
const SIZE = 5;
const FLEET = [3, 2];
const P1_SHIPS: Ship[] = [
  { id: "p1-0", row: 0, col: 0, size: 3, orientation: "h" }, // (0,0)(0,1)(0,2)
  { id: "p1-1", row: 2, col: 0, size: 2, orientation: "h" }, // (2,0)(2,1)
];
const P2_SHIPS: Ship[] = [
  { id: "p2-0", row: 4, col: 0, size: 3, orientation: "h" }, // (4,0)(4,1)(4,2)
  { id: "p2-1", row: 0, col: 3, size: 2, orientation: "v" }, // (0,3)(1,3)
];

const OVER_P1_WINS: GameStatus = { over: true, winner: "p1", draw: false };
const OVER_P2_WINS: GameStatus = { over: true, winner: "p2", draw: false };
const NOT_OVER: GameStatus = { over: false, winner: null, draw: false };

function completedSetup(): BattleshipSetupState {
  const a = submitFleet(createBattleshipSetup(SIZE, FLEET), "p1", P1_SHIPS);
  const b = submitFleet(a.state, "p2", P2_SHIPS);
  return b.state;
}

/** p1이 (4,0)에서 p2 함선을 명중, p2가 (2,2)에서 빗나간 진행 상태. next는 다시 p1. */
function midGameState(): BattleshipEngineState {
  const engine = createBattleshipEngine();
  let state = engine.init({ size: SIZE, p1Ships: P1_SHIPS, p2Ships: P2_SHIPS });
  state = engine.apply(state, { row: 4, col: 0 }, "p1"); // p1 → p2 보드 명중
  state = engine.apply(state, { row: 2, col: 2 }, "p2"); // p2 → p1 보드 빗나감
  return state;
}

describe("battleshipRoomPhase", () => {
  it("setup 페이로드는 'setup'", () => {
    const input: BattleshipSeatInput = {
      stage: "setup",
      setup: redactSetup(createBattleshipSetup(SIZE, FLEET), "p1"),
    };
    expect(battleshipRoomPhase(input)).toBe("setup");
  });

  it("match·미종료는 'playing', 종료는 'over' (서버 status 신뢰)", () => {
    const state = redactBattleshipState(midGameState(), "p1");
    expect(
      battleshipRoomPhase({ stage: "match", state, status: NOT_OVER }),
    ).toBe("playing");
    expect(
      battleshipRoomPhase({ stage: "match", state, status: OVER_P1_WINS }),
    ).toBe("over");
  });
});

describe("battleshipSetupSeatView", () => {
  it("미제출 좌석: 배치 안내, 제출/대기 없음", () => {
    const view = battleshipSetupSeatView(
      redactSetup(createBattleshipSetup(SIZE, FLEET), "p1"),
      "p1",
    );
    expect(view.mySubmitted).toBe(false);
    expect(view.opponentSubmitted).toBe(false);
    expect(view.waitingForOpponent).toBe(false);
    expect(view.statusLabel).toContain("배치");
  });

  it("내 제출 후 상대 대기: waitingForOpponent=true, 상대 좌표 비노출", () => {
    const submitted = submitFleet(
      createBattleshipSetup(SIZE, FLEET),
      "p1",
      P1_SHIPS,
    ).state;
    const redacted = redactSetup(submitted, "p1");
    const view = battleshipSetupSeatView(redacted, "p1");
    expect(view.mySubmitted).toBe(true);
    expect(view.opponentSubmitted).toBe(false);
    expect(view.waitingForOpponent).toBe(true);
    expect(view.statusLabel).toContain("기다리는 중");
  });

  it("상대만 제출한 좌석 시점: 상대 제출은 보이되 좌표는 빈 배열로 가려짐(누출 없음)", () => {
    const submitted = submitFleet(
      createBattleshipSetup(SIZE, FLEET),
      "p1",
      P1_SHIPS,
    ).state;
    // p2 시점: 본인 미제출, 상대(p1) 제출은 [] 로만 보인다.
    const redacted = redactSetup(submitted, "p2");
    expect(redacted.p1Ships).toEqual([]); // 제출 신호만, 좌표 없음
    const view = battleshipSetupSeatView(redacted, "p2");
    expect(view.mySubmitted).toBe(false);
    expect(view.opponentSubmitted).toBe(true);
    expect(view.waitingForOpponent).toBe(false);
  });

  it("양측 완료: 곧 시작 안내, p1/p2 대칭", () => {
    const setup = completedSetup();
    for (const seat of ["p1", "p2"] as Side[]) {
      const view = battleshipSetupSeatView(redactSetup(setup, seat), seat);
      expect(view.mySubmitted).toBe(true);
      expect(view.opponentSubmitted).toBe(true);
      expect(view.waitingForOpponent).toBe(false);
      expect(view.statusLabel).toContain("양측 배치 완료");
    }
  });
});

describe("battleshipMatchSeatView", () => {
  it("내 보드는 함선이 보이고, 상대 보드는 미사격 칸이 함선으로 누출되지 않는다(p1)", () => {
    const view = battleshipMatchSeatView(
      redactBattleshipState(midGameState(), "p1"),
      "p1",
      NOT_OVER,
    );
    // 내 함선 칸은 ship 으로 드러난다.
    expect(view.myBoardCells[0]![0]!.state).toBe("ship"); // p1 함선 (0,0)
    // p2 함선 (4,0)은 내가 명중 → hit. (4,1)/(4,2)는 미사격 → 안개(water), 절대 ship 아님.
    expect(view.opponentBoardCells[4]![0]!.state).toBe("hit");
    expect(view.opponentBoardCells[4]![1]!.state).toBe("water");
    expect(view.opponentBoardCells[4]![2]!.state).toBe("water");
    // 상대 보드 어디에도 함선/격침이 드러나면 안 된다(fog 신뢰).
    for (const row of view.opponentBoardCells) {
      for (const c of row) {
        expect(c.state).not.toBe("ship");
        expect(c.state).not.toBe("sunk");
      }
    }
  });

  it("p2 좌석 대칭: 내 보드(p2) 함선 노출, 상대(p1) 미사격 함선 비노출", () => {
    const view = battleshipMatchSeatView(
      redactBattleshipState(midGameState(), "p2"),
      "p2",
      NOT_OVER,
    );
    expect(view.myBoardCells[4]![1]!.state).toBe("ship"); // p2 함선 (4,1) 미사격 → 보임
    expect(view.myBoardCells[4]![0]!.state).toBe("hit"); // (4,0) 피격
    // p1 함선 (0,0)은 미사격 → 안개. p2가 빗나간 (2,2)는 miss.
    expect(view.opponentBoardCells[0]![0]!.state).toBe("water");
    expect(view.opponentBoardCells[2]![2]!.state).toBe("miss");
    for (const row of view.opponentBoardCells) {
      for (const c of row) {
        expect(c.state).not.toBe("ship");
      }
    }
  });

  it("isMyTurn은 state.next 소유권으로 판정(미종료)", () => {
    const state = midGameState(); // next === "p1"
    expect(
      battleshipMatchSeatView(redactBattleshipState(state, "p1"), "p1", NOT_OVER)
        .isMyTurn,
    ).toBe(true);
    expect(
      battleshipMatchSeatView(redactBattleshipState(state, "p2"), "p2", NOT_OVER)
        .isMyTurn,
    ).toBe(false);
  });

  it("종료·승패는 서버 status로 내 관점 라벨링(p1 승 → p1=win/p2=loss), isMyTurn=false", () => {
    const state = midGameState();
    const p1 = battleshipMatchSeatView(
      redactBattleshipState(state, "p1"),
      "p1",
      OVER_P1_WINS,
    );
    expect(p1.over).toBe(true);
    expect(p1.outcome).toBe("win");
    expect(p1.isMyTurn).toBe(false);
    expect(p1.statusLabel).toContain("승리");

    const p2 = battleshipMatchSeatView(
      redactBattleshipState(state, "p2"),
      "p2",
      OVER_P1_WINS,
    );
    expect(p2.outcome).toBe("loss");
    expect(p2.statusLabel).toContain("패배");

    // 대칭: p2가 이기면 라벨이 뒤집힌다.
    expect(
      battleshipMatchSeatView(
        redactBattleshipState(state, "p2"),
        "p2",
        OVER_P2_WINS,
      ).outcome,
    ).toBe("win");
    expect(
      battleshipMatchSeatView(
        redactBattleshipState(state, "p1"),
        "p1",
        OVER_P2_WINS,
      ).outcome,
    ).toBe("loss");
  });
});

describe("opponentTurnLabel", () => {
  it("내 차례면 사격 안내, 상대 차례면 대기 문구", () => {
    expect(opponentTurnLabel(true)).toContain("내 차례");
    expect(opponentTurnLabel(false)).toContain("상대 차례");
  });
});

describe("battleshipMultiRecordAction", () => {
  it("승자 좌석을 절대 win으로 매핑한다(p1→a / p2→b)", () => {
    expect(battleshipMultiRecordAction(OVER_P1_WINS, false)).toEqual({
      kind: "record",
      win: "a",
    });
    expect(battleshipMultiRecordAction(OVER_P2_WINS, false)).toEqual({
      kind: "record",
      win: "b",
    });
  });

  it("이미 기록했으면 중복 기록하지 않는다(none)", () => {
    expect(battleshipMultiRecordAction(OVER_P1_WINS, true)).toEqual({ kind: "none" });
    expect(battleshipMultiRecordAction(OVER_P2_WINS, true)).toEqual({ kind: "none" });
  });

  it("진행 중/배치 단계면 가드를 리셋한다(재대국 후 다음 매치도 기록되도록)", () => {
    expect(battleshipMultiRecordAction(NOT_OVER, false)).toEqual({ kind: "reset" });
    expect(battleshipMultiRecordAction(NOT_OVER, true)).toEqual({ kind: "reset" });
    expect(battleshipMultiRecordAction(null, true)).toEqual({ kind: "reset" });
  });

  it("over인데 승자가 없으면 기록하지 않는다(배틀십은 무승부 없음 — 방어적)", () => {
    const overNoWinner: GameStatus = { over: true, winner: null, draw: false };
    expect(battleshipMultiRecordAction(overNoWinner, false)).toEqual({ kind: "none" });
  });

  // 컴포넌트 가드(recordedRef) 배선을 그대로 흉내내 "두 좌석이 같은 over를 구독해도 1회"·재대국 1회를 검증한다.
  it("두 좌석이 같은 over 상태를 구독해도 매치당 정확히 1회만 기록한다", () => {
    let recorded = false;
    const records: Array<"a" | "b"> = [];
    // 한 좌석 변화마다 useEffect가 도는 것을 모사한다(action 적용 = 컴포넌트 핸들러).
    const apply = (status: GameStatus | null) => {
      const action = battleshipMultiRecordAction(status, recorded);
      if (action.kind === "reset") recorded = false;
      else if (action.kind === "record") {
        recorded = true;
        records.push(action.win);
      }
    };

    // 매치 1: 진행 → p1 종료가 두 좌석으로 두 번 반영됨.
    apply(NOT_OVER);
    apply(OVER_P1_WINS);
    apply(OVER_P1_WINS);
    expect(records).toEqual(["a"]); // 1회만

    // 재대국 → 배치(null)로 리셋 → 매치 2 진행 → p2 종료가 두 번 반영됨.
    apply(null);
    apply(NOT_OVER);
    apply(OVER_P2_WINS);
    apply(OVER_P2_WINS);
    expect(records).toEqual(["a", "b"]); // 다음 매치도 1회만
  });
});
